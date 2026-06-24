import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";


export type Role = "admin" | "manager" | "sales" | "developer";

// Supabase Edge Functions return non-2xx as a FunctionsHttpError whose JSON
// body holds our { error } message. Pull it out for a useful toast.
async function extractFnError(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.json();
      if (body?.error) return body.error as string;
    } catch {
      /* ignore */
    }
  }
  return error instanceof Error ? error.message : fallback;
}

export interface Company {
  id: string;
  name: string;
  type: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  roles: Role[];
  createdBy: string;
  createdByName: string;
  status: "active" | "ended";
}

export interface Leave {
  id: string;
  userId: string;
  name: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
}

export interface OfmEvent {
  id: string;
  eventType: string;
  date: string;
  time: string;
  title: string;
  description: string;
  imageUrl: string;
  status: string;
}

interface OFMContextValue {
  loading: boolean;
  company: Company | null;
  users: User[];
  tasks: Task[];
  leaves: Leave[];
  attendance: Attendance[];
  wifiPassword: string;
  currentUser: User | null;
  hasSession: boolean;
  registerCompany: (data: { name: string; email: string; password: string; companyName: string; companyType: string }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<User | null>;
  signOut: () => Promise<void>;
  createStaff: (data: { name: string; email: string; password: string; role: Role }) => Promise<void>;
  updateStaff: (id: string, data: Partial<Pick<User, "name" | "email" | "password" | "role">>) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  createTask: (data: { title: string; description: string; roles: Role[] }) => Promise<void>;
  endTask: (id: string) => Promise<void>;
  addLeave: (data: { name: string; reason: string; userId?: string }) => Promise<void>;
  setLeaveStatus: (id: string, status: "approved" | "rejected") => Promise<void>;
  checkIn: () => Promise<void>;
  checkOut: () => Promise<void>;
  setWifiPassword: (pw: string) => Promise<void>;
}

const OFMContext = createContext<OFMContextValue | null>(null);

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function OFMProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [wifiPassword, setWifiPw] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async (uid: string | undefined): Promise<void> => {
    if (!uid) {
      setCompany(null);
      setUsers([]);
      setTasks([]);
      setLeaves([]);
      setAttendance([]);
      setCurrentUser(null);
      setWifiPw("");
      return;
    }
    // Dedupe concurrent refreshes (e.g. onAuthStateChange + explicit call) by
    // sharing the same in-flight promise so awaiters all see the loaded state.
    if (inFlight.current) {
      await inFlight.current;
      return;
    }
    const run = (async () => {
      try {
      const [companyRes, profilesRes, rolesRes, tasksRes, leavesRes, attRes] = await Promise.all([
        supabase.from("companies").select("*").maybeSingle(),
        supabase.from("profiles").select("id, full_name, email"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("leaves").select("*").order("created_at", { ascending: false }),
        supabase.from("attendance").select("*").order("date", { ascending: false }),
      ]);

      if (companyRes.data) {
        setCompany({ id: companyRes.data.id, name: companyRes.data.name, type: companyRes.data.type });
        setWifiPw(companyRes.data.wifi_password ?? "");
      }

      const roleMap = new Map<string, Role>();
      (rolesRes.data ?? []).forEach((r) => roleMap.set(r.user_id, r.role as Role));

      const list: User[] = (profilesRes.data ?? []).map((p) => ({
        id: p.id,
        name: p.full_name,
        email: p.email,
        role: roleMap.get(p.id) ?? "developer",
      }));
      setUsers(list);
      setCurrentUser(list.find((u) => u.id === uid) ?? null);

      setTasks(
        (tasksRes.data ?? []).map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          roles: (t.roles ?? []) as Role[],
          createdBy: t.created_by ?? "",
          createdByName: t.created_by_name,
          status: t.status as "active" | "ended",
        })),
      );

      setLeaves(
        (leavesRes.data ?? []).map((l) => ({
          id: l.id,
          userId: l.user_id ?? "",
          name: l.name,
          reason: l.reason,
          status: l.status as Leave["status"],
          createdAt: l.created_at,
        })),
      );

      setAttendance(
        (attRes.data ?? []).map((a) => ({
          id: a.id,
          userId: a.user_id,
          userName: a.user_name,
          date: a.date,
          checkIn: a.check_in ?? undefined,
          checkOut: a.check_out ?? undefined,
        })),
      );
      } finally {
        /* nothing */
      }
    })();
    inFlight.current = run;
    try {
      await run;
    } finally {
      inFlight.current = null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        setSession(data.session);
        refresh(data.session.user.id).finally(() => active && setLoading(false));
      } else {
        // No session at bootstrap: just finish loading. Don't clobber state
        // that a concurrent sign-in/registration may have already populated.
        setLoading(false);
      }
    });


    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      refresh(s?.user.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  const uid = session?.user.id;

  const value: OFMContextValue = {
    loading,
    hasSession: !!session,
    company,
    users,
    tasks,
    leaves,
    attendance,
    wifiPassword,
    currentUser,

    registerCompany: async ({ name, email, password, companyName, companyType }) => {
      // Create a confirmed admin via edge function (provisions company + role
      // through the handle_new_user trigger), then sign in immediately.
      const { error: fnError } = await supabase.functions.invoke("register-company", {
        body: { name, email, password, companyName, companyType },
      });
      if (fnError) {
        const msg = await extractFnError(fnError, "Registration failed");
        throw new Error(msg);
      }

      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !signInData.session) throw new Error("Account created, but automatic sign-in failed. Please sign in.");
      setSession(signInData.session);
      await refresh(signInData.session.user.id);
    },


    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) return null;
      setSession(data.session);
      await refresh(data.user.id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", data.user.id)
        .maybeSingle();
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!profile) return null;
      return {
        id: profile.id,
        name: profile.full_name,
        email: profile.email,
        role: (roleRow?.role ?? "developer") as Role,
      };
    },

    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      await refresh(undefined);
    },

    createStaff: async (data) => {
      const { error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "create", ...data },
      });
      if (error) throw new Error(await extractFnError(error, "Failed to create staff"));
      await refresh(uid);
    },

    updateStaff: async (id, data) => {
      const { error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "update", id, ...data },
      });
      if (error) throw new Error(await extractFnError(error, "Failed to update staff"));
      await refresh(uid);
    },

    deleteStaff: async (id) => {
      const { error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "delete", id },
      });
      if (error) throw new Error(await extractFnError(error, "Failed to delete staff"));
      await refresh(uid);
    },


    createTask: async ({ title, description, roles }) => {
      if (!company || !currentUser) return;
      const { error } = await supabase.from("tasks").insert({
        company_id: company.id,
        title,
        description,
        roles,
        created_by: currentUser.id,
        created_by_name: currentUser.name,
        status: "active",
      });
      if (error) throw error;
      await refresh(uid);
    },

    endTask: async (id) => {
      const { error } = await supabase.from("tasks").update({ status: "ended" }).eq("id", id);
      if (error) throw error;
      await refresh(uid);
    },

    addLeave: async ({ name, reason, userId }) => {
      if (!company) return;
      const { error } = await supabase.from("leaves").insert({
        company_id: company.id,
        user_id: userId ?? currentUser?.id ?? null,
        name,
        reason,
        status: "pending",
      });
      if (error) throw error;
      await refresh(uid);
    },

    setLeaveStatus: async (id, status) => {
      const { error } = await supabase.from("leaves").update({ status }).eq("id", id);
      if (error) throw error;
      await refresh(uid);
    },

    checkIn: async () => {
      if (!company || !currentUser) return;
      const date = new Date().toISOString().slice(0, 10);
      const existing = attendance.find((a) => a.userId === currentUser.id && a.date === date);
      if (existing) {
        if (existing.checkIn) return;
        const { error } = await supabase.from("attendance").update({ check_in: nowTime() }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert({
          company_id: company.id,
          user_id: currentUser.id,
          user_name: currentUser.name,
          date,
          check_in: nowTime(),
        });
        if (error) throw error;
      }
      await refresh(uid);
    },

    checkOut: async () => {
      if (!company || !currentUser) return;
      const date = new Date().toISOString().slice(0, 10);
      const existing = attendance.find((a) => a.userId === currentUser.id && a.date === date);
      if (existing) {
        const { error } = await supabase.from("attendance").update({ check_out: nowTime() }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert({
          company_id: company.id,
          user_id: currentUser.id,
          user_name: currentUser.name,
          date,
          check_out: nowTime(),
        });
        if (error) throw error;
      }
      await refresh(uid);
    },

    setWifiPassword: async (pw) => {
      if (!company) return;
      const { error } = await supabase.from("companies").update({ wifi_password: pw }).eq("id", company.id);
      if (error) throw error;
      setWifiPw(pw);
    },
  };

  return <OFMContext.Provider value={value}>{children}</OFMContext.Provider>;
}

export function useOFM() {
  const ctx = useContext(OFMContext);
  if (!ctx) throw new Error("useOFM must be used within OFMProvider");
  return ctx;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager / HR",
  sales: "Sales",
  developer: "Developer",
};
