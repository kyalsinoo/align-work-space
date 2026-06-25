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
import { broadcastAnnouncement } from "@/lib/announcement.functions";


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

// Annual leave policy: each staff member gets 20 leave days per year.
// When 15 or more approved days are used (5 or fewer remaining) we warn.
export const LEAVE_LIMIT_DAYS = 20;
export const LEAVE_WARNING_THRESHOLD = 5;

export interface LeaveUsage {
  used: number;
  remaining: number;
  isLow: boolean;
  isExceeded: boolean;
}

/** Approved leave days are summed by their requested duration. */
export function getLeaveUsage(leaves: Leave[], userId: string): LeaveUsage {
  const used = leaves
    .filter((l) => l.userId === userId && l.status === "approved")
    .reduce((sum, l) => sum + (l.days && l.days > 0 ? l.days : 1), 0);
  const remaining = Math.max(0, LEAVE_LIMIT_DAYS - used);
  return {
    used,
    remaining,
    isLow: remaining <= LEAVE_WARNING_THRESHOLD,
    isExceeded: used >= LEAVE_LIMIT_DAYS,
  };
}



export interface Company {
  id: string;
  name: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  geofenceRadius: number;
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
  checkInLat?: number | null;
  checkInLng?: number | null;
  checkOutLat?: number | null;
  checkOutLng?: number | null;
  checkInPhoto?: string | null;
  checkOutPhoto?: string | null;
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

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

interface OFMContextValue {
  loading: boolean;
  company: Company | null;
  users: User[];
  tasks: Task[];
  leaves: Leave[];
  attendance: Attendance[];
  events: OfmEvent[];
  announcements: Announcement[];
  wifiPassword: string;
  telegramBotToken: string;
  telegramChatId: string;
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
  checkIn: (data: { lat: number; lng: number; photo: string }) => Promise<void>;
  checkOut: (data: { lat: number; lng: number; photo: string }) => Promise<void>;
  saveCompanyLocation: (data: { latitude: number; longitude: number; geofenceRadius: number }) => Promise<void>;
  setWifiPassword: (pw: string) => Promise<void>;
  saveTelegramSettings: (data: { botToken: string; chatId: string }) => Promise<void>;
  publishAnnouncement: (data: { title: string; content: string }) => Promise<{ sent: boolean; reason?: string; email?: { sent: boolean; reason?: string; count: number }; telegram?: { sent: boolean; reason?: string } }>;
  saveEvent: (data: { eventType: string; date: string; time: string; title: string; description: string; imageUrl: string }) => Promise<void>;
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
  const [events, setEvents] = useState<OfmEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [wifiPassword, setWifiPw] = useState("");
  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async (uid: string | undefined): Promise<void> => {
    if (!uid) {
      setCompany(null);
      setUsers([]);
      setTasks([]);
      setLeaves([]);
      setAttendance([]);
      setEvents([]);
      setAnnouncements([]);
      setCurrentUser(null);
      setWifiPw("");
      setTelegramBotToken("");
      setTelegramChatId("");
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
      const [companyRes, profilesRes, rolesRes, tasksRes, leavesRes, attRes, eventsRes, announcementsRes] = await Promise.all([
        supabase.from("companies").select("*").maybeSingle(),
        supabase.from("profiles").select("id, full_name, email"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("leaves").select("*").order("created_at", { ascending: false }),
        supabase.from("attendance").select("*").order("date", { ascending: false }),
        supabase.from("events").select("*").order("event_date", { ascending: true }),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      ]);

      if (companyRes.data) {
        setCompany({ id: companyRes.data.id, name: companyRes.data.name, type: companyRes.data.type, latitude: companyRes.data.latitude ?? null, longitude: companyRes.data.longitude ?? null, geofenceRadius: companyRes.data.geofence_radius ?? 200 });
        setWifiPw(companyRes.data.wifi_password ?? "");
        setTelegramBotToken(companyRes.data.telegram_bot_token ?? "");
        setTelegramChatId(companyRes.data.telegram_chat_id ?? "");
      }

      setAnnouncements(
        (announcementsRes.data ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          createdBy: a.created_by ?? "",
          createdByName: a.created_by_name,
          createdAt: a.created_at,
        })),
      );

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
          checkInLat: a.check_in_lat ?? null,
          checkInLng: a.check_in_lng ?? null,
          checkOutLat: a.check_out_lat ?? null,
          checkOutLng: a.check_out_lng ?? null,
          checkInPhoto: a.check_in_photo ?? null,
          checkOutPhoto: a.check_out_photo ?? null,
        })),
      );

      setEvents(
        (eventsRes.data ?? []).map((e) => ({
          id: e.id,
          eventType: e.event_type,
          date: e.event_date,
          time: e.event_time,
          title: e.title,
          description: e.description,
          imageUrl: e.image_url,
          status: e.status,
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
    events,
    announcements,
    wifiPassword,
    telegramBotToken,
    telegramChatId,
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

    checkIn: async ({ lat, lng, photo }) => {
      if (!company || !currentUser) return;
      const date = new Date().toISOString().slice(0, 10);
      const existing = attendance.find((a) => a.userId === currentUser.id && a.date === date);
      if (existing) {
        if (existing.checkIn) return;
        const { error } = await supabase.from("attendance").update({ check_in: nowTime(), check_in_lat: lat, check_in_lng: lng, check_in_photo: photo }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert({
          company_id: company.id,
          user_id: currentUser.id,
          user_name: currentUser.name,
          date,
          check_in: nowTime(),
          check_in_lat: lat,
          check_in_lng: lng,
          check_in_photo: photo,
        });
        if (error) throw error;
      }
      await refresh(uid);
    },

    checkOut: async ({ lat, lng, photo }) => {
      if (!company || !currentUser) return;
      const date = new Date().toISOString().slice(0, 10);
      const existing = attendance.find((a) => a.userId === currentUser.id && a.date === date);
      if (existing) {
        const { error } = await supabase.from("attendance").update({ check_out: nowTime(), check_out_lat: lat, check_out_lng: lng, check_out_photo: photo }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert({
          company_id: company.id,
          user_id: currentUser.id,
          user_name: currentUser.name,
          date,
          check_out: nowTime(),
          check_out_lat: lat,
          check_out_lng: lng,
          check_out_photo: photo,
        });
        if (error) throw error;
      }
      await refresh(uid);
    },

    saveCompanyLocation: async ({ latitude, longitude, geofenceRadius }) => {
      if (!company) return;
      const { error } = await supabase
        .from("companies")
        .update({ latitude, longitude, geofence_radius: geofenceRadius })
        .eq("id", company.id);
      if (error) throw error;
      setCompany({ ...company, latitude, longitude, geofenceRadius });
    },

    setWifiPassword: async (pw) => {
      if (!company) return;
      const { error } = await supabase.from("companies").update({ wifi_password: pw }).eq("id", company.id);
      if (error) throw error;
      setWifiPw(pw);
    },

    saveTelegramSettings: async ({ botToken, chatId }) => {
      if (!company) return;
      const { error } = await supabase
        .from("companies")
        .update({ telegram_bot_token: botToken, telegram_chat_id: chatId })
        .eq("id", company.id);
      if (error) throw error;
      setTelegramBotToken(botToken);
      setTelegramChatId(chatId);
    },

    publishAnnouncement: async ({ title, content }) => {
      if (!company || !currentUser) return { sent: false, reason: "no_company" };
      const { error } = await supabase.from("announcements").insert({
        company_id: company.id,
        title,
        content,
        created_by: currentUser.id,
        created_by_name: currentUser.name,
      });
      if (error) throw error;
      await refresh(uid);
      const result = await broadcastAnnouncement({ data: { title, content } });
      return {
        sent: result.sent,
        reason: "reason" in result ? result.reason : undefined,
        email: result.email,
        telegram: result.telegram,
      };
    },


    saveEvent: async ({ eventType, date, time, title, description, imageUrl }) => {
      if (!company || !currentUser) return;
      const { error } = await supabase.from("events").insert({
        company_id: company.id,
        event_type: eventType,
        event_date: date,
        event_time: time,
        title,
        description,
        image_url: imageUrl,
        status: "published",
        created_by: currentUser.id,
        created_by_name: currentUser.name,
      });
      if (error) throw error;
      await refresh(uid);
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
