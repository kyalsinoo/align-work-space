import { createServerFn } from "@tanstack/react-start";
import { generateText, type ModelMessage } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const SummaryInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
});

// Roles that are treated as elevated (company-wide visibility).
const ELEVATED = new Set(["admin", "manager"]);

function startOfWeekISO(): string {
  const now = new Date();
  const day = now.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/**
 * Read-only, RBAC-enforced data summary endpoint for the OFM AI Assistant.
 *
 * SECURITY:
 * - Uses the request-scoped Supabase client (RLS as the authenticated user).
 * - Performs SELECT queries ONLY. The AI never receives DB credentials and
 *   cannot trigger INSERT/UPDATE/DELETE — it only analyses the JSON we build.
 * - Role is derived server-side from user_roles, never trusted from the client.
 * - Staff are strictly filtered to their own user_id / role.
 */
export const summarizeData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SummaryInput.parse(data))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { supabase, userId } = context;

    // ----- Derive role + identity server-side (never trust the client) -----
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (roleRows ?? []).map((r) => r.role as string);
    const isElevated = roles.some((r) => ELEVATED.has(r));
    const primaryRole = isElevated
      ? roles.find((r) => ELEVATED.has(r))!
      : roles[0] ?? "staff";

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const userName = profile?.full_name ?? "";

    const weekStart = startOfWeekISO();
    const monthStart = startOfMonthISO();

    // ----- Company directory (name per role) — visible to everyone in the
    // same company via RLS; used to answer "who is the admin/manager/etc." -----
    const { data: roleRowsAll } = await supabase
      .from("user_roles")
      .select("user_id, role");
    const { data: profileRows } = await supabase
      .from("profiles")
      .select("id, full_name, email");
    const nameById = new Map(
      (profileRows ?? []).map((p) => [
        p.id as string,
        (p.full_name as string) || (p.email as string) || "Unknown",
      ]),
    );
    const directory: Record<string, string[]> = {};
    for (const r of roleRowsAll ?? []) {
      const roleKey = r.role as string;
      const name = nameById.get(r.user_id as string);
      if (!name) continue;
      (directory[roleKey] ??= []).push(name);
    }

    // ----- Build the JSON context per role -----
    let dataContext: Record<string, unknown>;

    if (isElevated) {
      const [endedTasks, leavesThisMonth, onLeave] = await Promise.all([
        supabase
          .from("tasks")
          .select("title, roles, created_by_name, created_at")
          .eq("status", "ended")
          .gte("created_at", weekStart),
        supabase
          .from("leaves")
          .select("name, reason, status, created_at")
          .gte("created_at", monthStart),
        supabase
          .from("leaves")
          .select("name, reason, status")
          .eq("status", "approved"),
      ]);

      // Who applied for the most leave this month.
      const counts: Record<string, number> = {};
      for (const l of leavesThisMonth.data ?? []) {
        counts[l.name] = (counts[l.name] ?? 0) + 1;
      }
      const topApplicants = Object.entries(counts)
        .map(([name, count]) => ({ name, requests: count }))
        .sort((a, b) => b.requests - a.requests);

      dataContext = {
        scope: "company-wide",
        viewerRole: primaryRole,
        viewerName: userName,
        endedTasksThisWeek: (endedTasks.data ?? []).map((t) => ({
          title: t.title,
          roles: t.roles,
          by: t.created_by_name,
        })),
        endedTasksThisWeekCount: (endedTasks.data ?? []).length,
        currentlyOnLeave: (onLeave.data ?? []).map((l) => l.name),
        leaveRequestsThisMonth: leavesThisMonth.data ?? [],
        topLeaveApplicantsThisMonth: topApplicants,
      };
    } else {
      // STAFF: strictly personal data only.
      const myRole = primaryRole;
      const [myEndedTasks, myLeaves] = await Promise.all([
        supabase
          .from("tasks")
          .select("title, roles, created_at")
          .eq("status", "ended")
          .contains("roles", [myRole])
          .gte("created_at", weekStart),
        supabase
          .from("leaves")
          .select("reason, status, created_at")
          .eq("user_id", userId)
          .gte("created_at", monthStart),
      ]);

      const approvedDays = (myLeaves.data ?? []).filter(
        (l) => l.status === "approved",
      ).length;

      dataContext = {
        scope: "personal-only",
        viewerRole: myRole,
        viewerName: userName,
        myEndedTasksThisWeek: (myEndedTasks.data ?? []).map((t) => t.title),
        myEndedTasksThisWeekCount: (myEndedTasks.data ?? []).length,
        myLeavesThisMonth: myLeaves.data ?? [],
        myApprovedLeaveDaysThisMonth: approvedDays,
        myPendingLeaveRequestsThisMonth: (myLeaves.data ?? []).filter(
          (l) => l.status === "pending",
        ).length,
      };
    }

    const system =
      `You are the OFM AI Assistant. Analyze the provided JSON data context and generate a clear, professional summary exclusively in polite, natural Burmese (မြန်မာဘာသာ).\n\n` +
      `Strictly enforce privacy: If the current user role is 'Staff' (scope is "personal-only"), you must only answer using their personal data records. If they ask about other employees or company-wide metrics, politely decline in Burmese, stating they do not have administrative permission (ဤအချက်အလက်ကို ကြည့်ရှုခွင့် မရှိပါ).\n\n` +
      `Format the output using clear bullet points and bold text for key metrics to ensure it is easy to read at a glance. Only use facts present in the JSON context — never invent data.\n\n` +
      `DATA CONTEXT (read-only):\n${JSON.stringify(dataContext)}`;

    const gateway = createLovableAiGatewayProvider(key);
    const messages: ModelMessage[] = data.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        messages,
      });
      return { text, scope: dataContext.scope as string };
    } catch (err) {
      const status =
        (err as { statusCode?: number })?.statusCode ??
        (err as { status?: number })?.status;
      if (status === 429) {
        return {
          text: "တောင်းဆိုမှု များနေပါသည် — ခဏနေ ပြန်ကြိုးစားပေးပါ။",
          scope: dataContext.scope as string,
          error: "rate_limit" as const,
        };
      }
      if (status === 402) {
        return {
          text: "AI credits ကုန်ဆုံးသွားပါပြီ။ Settings → Plans & credits တွင် ဖြည့်ပေးပါ။",
          scope: dataContext.scope as string,
          error: "credits" as const,
        };
      }
      throw err;
    }
  });
