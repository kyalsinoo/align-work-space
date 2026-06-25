// Admin-only staff management. Verifies the caller is an admin, then
// creates / updates / deletes staff users scoped to the caller's company.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Caller-scoped client (respects RLS, identifies the user)
    const caller = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userErr } = await caller.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const callerId = userData.user.id;

    const { data: isAdmin } = await caller.rpc("has_role", { _user_id: callerId, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden: admin only" }, 403);

    const admin = createClient(SUPABASE_URL, SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: callerProfile, error: cpErr } = await admin
      .from("profiles").select("company_id").eq("id", callerId).single();
    if (cpErr) throw cpErr;
    const companyId = callerProfile.company_id as string;

    const body = await req.json();
    const action = body.action as "create" | "update" | "delete";

    if (action === "create") {
      const { name, email, password, role } = body;
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true, user_metadata: { full_name: name },
      });
      if (cErr) throw cErr;
      const newId = created.user!.id;

      const { error: pErr } = await admin.from("profiles")
        .insert({ id: newId, company_id: companyId, full_name: name, email });
      if (pErr) throw pErr;

      const { error: rErr } = await admin.from("user_roles")
        .insert({ user_id: newId, company_id: companyId, role });
      if (rErr) throw rErr;

      return json({ ok: true, id: newId });
    }

    if (action === "update") {
      const { id, name, email, password, role } = body;
      const { data: target, error: tErr } = await admin
        .from("profiles").select("company_id").eq("id", id).single();
      if (tErr) throw tErr;
      if (target.company_id !== companyId) return json({ error: "Forbidden" }, 403);

      const profileUpdate: Record<string, string> = {};
      if (name !== undefined) profileUpdate.full_name = name;
      if (email !== undefined) profileUpdate.email = email;
      if (Object.keys(profileUpdate).length) {
        const { error } = await admin.from("profiles").update(profileUpdate).eq("id", id);
        if (error) throw error;
      }
      if (role !== undefined) {
        const { error } = await admin.from("user_roles").update({ role }).eq("user_id", id);
        if (error) throw error;
      }
      if (email !== undefined || password !== undefined) {
        const authUpdate: Record<string, string> = {};
        if (email !== undefined) authUpdate.email = email;
        if (password !== undefined) authUpdate.password = password;
        const { error } = await admin.auth.admin.updateUserById(id, authUpdate);
        if (error) throw error;
      }
      return json({ ok: true });
    }

    if (action === "delete") {
      const { id } = body;
      const { data: target, error: tErr } = await admin
        .from("profiles").select("company_id").eq("id", id).single();
      if (tErr) throw tErr;
      if (target.company_id !== companyId) return json({ error: "Forbidden" }, 403);

      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[manage-staff] Error:", e);
    const code = (e as { code?: string })?.code;
    if (code === "email_exists" || code === "23505")
      return json({ error: "A user with this email is already registered." }, 409);
    if (code === "23503") return json({ error: "Reference not found" }, 400);
    return json({ error: "Operation failed. Please try again." }, 400);
  }
});
