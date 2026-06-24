import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RoleEnum = z.enum(["manager", "sales", "developer"]);

const CreateStaffInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: RoleEnum,
});

const UpdateStaffInput = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: RoleEnum.optional(),
});

const DeleteStaffInput = z.object({ id: z.string().uuid() });

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Forbidden: admin only");

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", userId)
    .single();
  if (pErr) throw new Error(pErr.message);
  return profile.company_id as string;
}

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateStaffInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await assertAdmin(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.name },
    });
    if (cErr) throw new Error(cErr.message);
    const newId = created.user!.id;

    const { error: profErr } = await supabaseAdmin.from("profiles").insert({
      id: newId,
      company_id: companyId,
      full_name: data.name,
      email: data.email,
    });
    if (profErr) throw new Error(profErr.message);

    const { error: roleErr } = await supabaseAdmin.from("user_roles").insert({
      user_id: newId,
      company_id: companyId,
      role: data.role,
    });
    if (roleErr) throw new Error(roleErr.message);

    return { id: newId };
  });

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => UpdateStaffInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await assertAdmin(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ensure target belongs to same company
    const { data: target, error: tErr } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", data.id)
      .single();
    if (tErr) throw new Error(tErr.message);
    if (target.company_id !== companyId) throw new Error("Forbidden");

    const profileUpdate: { full_name?: string; email?: string } = {};
    if (data.name !== undefined) profileUpdate.full_name = data.name;
    if (data.email !== undefined) profileUpdate.email = data.email;
    if (Object.keys(profileUpdate).length) {
      const { error } = await supabaseAdmin.from("profiles").update(profileUpdate).eq("id", data.id);
      if (error) throw new Error(error.message);
    }

    if (data.role !== undefined) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .update({ role: data.role })
        .eq("user_id", data.id);
      if (error) throw new Error(error.message);
    }

    if (data.email !== undefined || data.password !== undefined) {
      const authUpdate: { email?: string; password?: string } = {};
      if (data.email !== undefined) authUpdate.email = data.email;
      if (data.password !== undefined) authUpdate.password = data.password;
      const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, authUpdate);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DeleteStaffInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const companyId = await assertAdmin(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: target, error: tErr } = await supabaseAdmin
      .from("profiles")
      .select("company_id")
      .eq("id", data.id)
      .single();
    if (tErr) throw new Error(tErr.message);
    if (target.company_id !== companyId) throw new Error("Forbidden");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

const RegisterCompanyInput = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  companyName: z.string().min(1),
  companyType: z.string().min(1),
});

// Public registration: creates a confirmed admin user so login works
// immediately regardless of the project's email-confirmation setting.
// The handle_new_user trigger provisions the company, profile, and admin role
// from the user_metadata below.
export const registerCompany = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => RegisterCompanyInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.name,
        company_name: data.companyName,
        company_type: data.companyType,
      },
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  });
