import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Role = "admin" | "manager" | "sales" | "developer";

export interface Company {
  name: string;
  type: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
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

interface OFMState {
  company: Company | null;
  users: User[];
  tasks: Task[];
  leaves: Leave[];
  attendance: Attendance[];
  wifiPassword: string;
  currentUserId: string | null;
}

const STORAGE_KEY = "ofm-state-v1";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultState(): OFMState {
  return {
    company: null,
    users: [],
    tasks: [],
    leaves: [],
    attendance: [],
    wifiPassword: "OFM-Office-2024",
    currentUserId: null,
  };
}

function seed(state: OFMState): OFMState {
  if (state.company) return state;
  const company: Company = { name: "Acme OFM", type: "Tech Startup" };
  const admin: User = { id: uid(), name: "Admin User", email: "admin@ofm.com", password: "admin123", role: "admin" };
  const manager: User = { id: uid(), name: "Maria Manager", email: "manager@ofm.com", password: "manager123", role: "manager" };
  const sales: User = { id: uid(), name: "Sam Sales", email: "sales@ofm.com", password: "sales123", role: "sales" };
  const dev: User = { id: uid(), name: "Dana Dev", email: "dev@ofm.com", password: "dev123", role: "developer" };
  const users = [admin, manager, sales, dev];
  const tasks: Task[] = [
    { id: uid(), title: "Q3 Sales Outreach", description: "Contact 50 leads this week.", roles: ["sales"], createdBy: manager.id, createdByName: manager.name, status: "active" },
    { id: uid(), title: "Ship dashboard v2", description: "Finish the analytics dashboard.", roles: ["developer"], createdBy: admin.id, createdByName: admin.name, status: "active" },
    { id: uid(), title: "Onboarding docs", description: "Write onboarding guide.", roles: ["sales", "developer"], createdBy: admin.id, createdByName: admin.name, status: "ended" },
  ];
  const leaves: Leave[] = [
    { id: uid(), userId: sales.id, name: sales.name, reason: "Medical appointment", status: "pending", createdAt: new Date().toISOString() },
  ];
  const today = new Date().toISOString().slice(0, 10);
  const attendance: Attendance[] = [
    { id: uid(), userId: sales.id, userName: sales.name, date: today, checkIn: "09:02", checkOut: "17:30" },
    { id: uid(), userId: dev.id, userName: dev.name, date: today, checkIn: "08:55" },
  ];
  return { ...state, company, users, tasks, leaves, attendance };
}

function load(): OFMState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OFMState;
  } catch {
    /* ignore */
  }
  const seeded = seed(defaultState());
  return seeded;
}

interface OFMContextValue extends OFMState {
  currentUser: User | null;
  registerCompany: (data: { name: string; email: string; password: string; companyName: string; companyType: string }) => void;
  signIn: (email: string, password: string) => User | null;
  signOut: () => void;
  createStaff: (data: { name: string; email: string; password: string; role: Role }) => void;
  updateStaff: (id: string, data: Partial<Pick<User, "name" | "email" | "password" | "role">>) => void;
  deleteStaff: (id: string) => void;
  createTask: (data: { title: string; description: string; roles: Role[] }) => void;
  endTask: (id: string) => void;
  addLeave: (data: { name: string; reason: string; userId?: string }) => void;
  setLeaveStatus: (id: string, status: "approved" | "rejected") => void;
  checkIn: () => void;
  checkOut: () => void;
  setWifiPassword: (pw: string) => void;
}

const OFMContext = createContext<OFMContextValue | null>(null);

export function OFMProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OFMState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const currentUser = state.users.find((u) => u.id === state.currentUserId) ?? null;

  const value: OFMContextValue = {
    ...state,
    currentUser,
    registerCompany: ({ name, email, password, companyName, companyType }) => {
      setState((s) => {
        const admin: User = { id: uid(), name, email, password, role: "admin" };
        return {
          ...s,
          company: { name: companyName, type: companyType },
          users: [...s.users.filter((u) => u.email !== email), admin],
          currentUserId: admin.id,
        };
      });
    },
    signIn: (email, password) => {
      const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (user) setState((s) => ({ ...s, currentUserId: user.id }));
      return user ?? null;
    },
    signOut: () => setState((s) => ({ ...s, currentUserId: null })),
    createStaff: (data) =>
      setState((s) => ({ ...s, users: [...s.users, { id: uid(), ...data }] })),
    updateStaff: (id, data) =>
      setState((s) => ({ ...s, users: s.users.map((u) => (u.id === id ? { ...u, ...data } : u)) })),
    deleteStaff: (id) =>
      setState((s) => ({ ...s, users: s.users.filter((u) => u.id !== id) })),
    createTask: (data) =>
      setState((s) => ({
        ...s,
        tasks: [
          { id: uid(), ...data, createdBy: s.currentUserId ?? "", createdByName: currentUser?.name ?? "Unknown", status: "active" },
          ...s.tasks,
        ],
      })),
    endTask: (id) =>
      setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: "ended" } : t)) })),
    addLeave: ({ name, reason, userId }) =>
      setState((s) => ({
        ...s,
        leaves: [
          { id: uid(), userId: userId ?? s.currentUserId ?? "", name, reason, status: "pending", createdAt: new Date().toISOString() },
          ...s.leaves,
        ],
      })),
    setLeaveStatus: (id, status) =>
      setState((s) => ({ ...s, leaves: s.leaves.map((l) => (l.id === id ? { ...l, status } : l)) })),
    checkIn: () =>
      setState((s) => {
        if (!currentUser) return s;
        const date = new Date().toISOString().slice(0, 10);
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const existing = s.attendance.find((a) => a.userId === currentUser.id && a.date === date);
        if (existing) {
          return { ...s, attendance: s.attendance.map((a) => (a.id === existing.id ? { ...a, checkIn: a.checkIn ?? time } : a)) };
        }
        return { ...s, attendance: [{ id: uid(), userId: currentUser.id, userName: currentUser.name, date, checkIn: time }, ...s.attendance] };
      }),
    checkOut: () =>
      setState((s) => {
        if (!currentUser) return s;
        const date = new Date().toISOString().slice(0, 10);
        const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const existing = s.attendance.find((a) => a.userId === currentUser.id && a.date === date);
        if (existing) {
          return { ...s, attendance: s.attendance.map((a) => (a.id === existing.id ? { ...a, checkOut: time } : a)) };
        }
        return { ...s, attendance: [{ id: uid(), userId: currentUser.id, userName: currentUser.name, date, checkOut: time }, ...s.attendance] };
      }),
    setWifiPassword: (pw) => setState((s) => ({ ...s, wifiPassword: pw })),
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
