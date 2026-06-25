import { createServerFn } from "@tanstack/react-start";
import { generateText, type ModelMessage } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const AssistantInput = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
});

// Elevated roles get company-wide visibility. Staff are strictly scoped.
const ELEVATED = new Set(["admin", "manager"]);
const LEAVE_LIMIT_DAYS = 20;

function startOfWeekISO(): string {
  const now = new Date();
  const diff = (now.getDay() + 6) % 7; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}
function endOfWeekISO(): string {
  const start = new Date(startOfWeekISO());
  start.setDate(start.getDate() + 7);
  return start.toISOString();
}
function startOfMonthDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

/**
 * Read-only, RBAC-enforced AI Assistant endpoint.
 *
 * SECURITY:
 * - Uses the request-scoped Supabase client (RLS as the authenticated user).
 * - SELECT queries ONLY — the model only analyses the JSON we assemble and can
 *   never trigger writes.
 * - Role is derived server-side from user_roles; never trusted from the client.
 * - Staff are strictly filtered to their own user_id / role. Restricted data
 *   (profit, revenue, financials) is NEVER queried or sent to the model.
 */
export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AssistantInput.parse(data))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { supabase, userId } = context;

    // ----- Derive role + identity server-side -----
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
    const weekEnd = endOfWeekISO();
    const monthStart = startOfMonthDate();

    // ----- Shared context everyone can read -----
    const [company, events, rules, directoryRoles, directoryProfiles] =
      await Promise.all([
        supabase.from("companies").select("name, type").limit(1).maybeSingle(),
        supabase
          .from("events")
          .select("title, event_type, event_date, event_time, status, description")
          .order("event_date", { ascending: true }),
        // "company_rules" in the brief maps to the announcements feed in this app.
        supabase
          .from("announcements")
          .select("title, content, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("profiles").select("id, full_name, email"),
      ]);

    const nameById = new Map(
      (directoryProfiles.data ?? []).map((p) => [
        p.id as string,
        (p.full_name as string) || (p.email as string) || "Unknown",
      ]),
    );
    const directory: Record<string, string[]> = {};
    for (const r of directoryRoles.data ?? []) {
      const name = nameById.get(r.user_id as string);
      if (!name) continue;
      (directory[r.role as string] ??= []).push(name);
    }

    const sharedContext = {
      company: { name: company.data?.name, type: company.data?.type },
      companyDirectory: directory,
      upcomingEvents: (events.data ?? [])
        .filter((e) => (e.status ?? "upcoming") !== "ended")
        .map((e) => ({
          title: e.title,
          type: e.event_type,
          date: e.event_date,
          time: e.event_time,
        })),
      companyRules: (rules.data ?? []).map((a) => ({
        title: a.title,
        content: a.content,
      })),
    };

    let dataContext: Record<string, unknown>;

    if (isElevated) {
      // ----- ADMIN / MANAGER: company-wide operational data -----
      const [tasks, attendance, leaves] = await Promise.all([
        supabase.from("tasks").select("title, roles, status, created_by_name, created_at"),
        supabase
          .from("attendance")
          .select("user_name, date, check_in, check_out")
          .gte("date", monthStart),
        supabase.from("leaves").select("name, reason, status, created_at"),
      ]);

      // Employee task completion ranking.
      const completed: Record<string, number> = {};
      for (const t of tasks.data ?? []) {
        if (t.status === "ended" && t.created_by_name) {
          completed[t.created_by_name] = (completed[t.created_by_name] ?? 0) + 1;
        }
      }
      const taskRanking = Object.entries(completed)
        .map(([name, count]) => ({ name, completedTasks: count }))
        .sort((a, b) => b.completedTasks - a.completedTasks);

      // Attendance summary + late arrivals (after 09:00 counts as late).
      const attSummary: Record<string, { days: number; late: number }> = {};
      for (const a of attendance.data ?? []) {
        const n = a.user_name as string;
        attSummary[n] ??= { days: 0, late: 0 };
        attSummary[n].days += 1;
        if (a.check_in && a.check_in > "09:00") attSummary[n].late += 1;
      }
      const attendanceSummary = Object.entries(attSummary).map(([name, s]) => ({
        name,
        daysPresent: s.days,
        lateArrivals: s.late,
      }));

      dataContext = {
        scope: "company-wide",
        viewerRole: primaryRole,
        viewerName: userName,
        ...sharedContext,
        tasksDueThisWeek: (tasks.data ?? [])
          .filter(
            (t) =>
              t.status !== "ended" &&
              t.created_at >= weekStart &&
              t.created_at < weekEnd,
          )
          .map((t) => ({ title: t.title, roles: t.roles })),
        employeeTaskRanking: taskRanking,
        employeeAttendanceSummaryThisMonth: attendanceSummary,
        allLeaveRequests: (leaves.data ?? []).map((l) => ({
          name: l.name,
          reason: l.reason,
          status: l.status,
        })),
      };
    } else {
      // ----- STAFF: strictly personal data + shared company info only -----
      const myRole = primaryRole;
      const [myTasks, myAttendance, myLeaves] = await Promise.all([
        supabase
          .from("tasks")
          .select("title, status, created_at")
          .contains("roles", [myRole]),
        supabase
          .from("attendance")
          .select("date, check_in, check_out")
          .eq("user_id", userId)
          .gte("date", monthStart)
          .order("date", { ascending: false }),
        supabase
          .from("leaves")
          .select("reason, status, created_at")
          .eq("user_id", userId),
      ]);

      const approvedLeaveDays = (myLeaves.data ?? []).filter(
        (l) => l.status === "approved",
      ).length;

      dataContext = {
        scope: "personal-only",
        viewerRole: myRole,
        viewerName: userName,
        ...sharedContext,
        myTasksDueThisWeek: (myTasks.data ?? [])
          .filter(
            (t) =>
              t.status !== "ended" &&
              t.created_at >= weekStart &&
              t.created_at < weekEnd,
          )
          .map((t) => t.title),
        myActiveTasks: (myTasks.data ?? [])
          .filter((t) => t.status !== "ended")
          .map((t) => t.title),
        myAttendanceThisMonth: myAttendance.data ?? [],
        myLeaveRequests: myLeaves.data ?? [],
        myApprovedLeaveDays: approvedLeaveDays,
        myRemainingLeaveDays: Math.max(0, LEAVE_LIMIT_DAYS - approvedLeaveDays),
        leaveLimitDays: LEAVE_LIMIT_DAYS,
      };
    }

    const system =
      `You are the OFM AI Assistant — a helpful, professional office assistant. ` +
      `Analyze ONLY the provided JSON data context and answer the user's question clearly. ` +
      `Reply in the same language the user writes in (English or Burmese/မြန်မာ). ` +
      `Use Markdown: short bullet points, bold key numbers, and small tables when useful.\n\n` +
      `PRIVACY & ACCESS RULES (strict):\n` +
      `- Company profit, revenue, and financial analytics are NEVER available to anyone. ` +
      `They are not in your data. If asked, reply that financial data is not available through this assistant.\n` +
      `- If scope is "personal-only" (Staff): only answer about the viewer's own attendance, tasks, and leave, ` +
      `plus shared company rules, events and the public team directory. ` +
      `If they ask about other employees' private records, rankings, or company-wide metrics, politely decline, ` +
      `stating they do not have permission to view that data.\n` +
      `- If scope is "company-wide" (Admin/Manager): you may answer about employee attendance summaries, ` +
      `task summaries, performance, rankings, late arrivals, and all operational data present in the JSON.\n` +
      `- The "companyDirectory" maps roles to people's names and is public to everyone. ` +
      `Use it to answer "who is the admin/manager/developer/sales".\n` +
      `- "Generate a leave request form" / "ခွင့်တိုင်ချင်" => present a short fillable form template ` +
      `(Name, Reason, Date) and tell the user they can submit a leave request from the chatbot or Leave page.\n\n` +
      `Only use facts present in the JSON. Never invent data.\n\n` +
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
          text: "Too many requests right now — please wait a moment and try again.",
          scope: dataContext.scope as string,
          error: "rate_limit" as const,
        };
      }
      if (status === 402) {
        return {
          text: "AI credits have run out. Please top up in Settings → Plans & credits.",
          scope: dataContext.scope as string,
          error: "credits" as const,
        };
      }
      throw err;
    }
  });
