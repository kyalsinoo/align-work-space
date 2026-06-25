import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import officeHubLogo from "@/assets/officehub-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  CalendarDays,
  Clock,
  Settings,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Sparkles,
  Wifi,
  Building2,
  Bookmark,
  PartyPopper,
  Loader2,
  Megaphone,
  Send,
  MessageCircle,
  Trophy,
  AlertTriangle,
  Camera,
  MapPin,
  Navigation,

} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Chatbot } from "@/components/ofm/Chatbot";
import { DataSummaryChat } from "@/components/ofm/DataSummaryChat";
import { useOFM, ROLE_LABELS, getLeaveUsage, LEAVE_LIMIT_DAYS, type Role, type User } from "@/lib/ofm-store";
import { useSavedInsights } from "@/lib/saved-insights";
import { generateEvent } from "@/lib/event.functions";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type ViewKey =
  | "dashboard"
  | "employees"
  | "tasks"
  | "leave"
  | "attendance"
  | "events"
  | "announcements"
  | "insights"
  | "ai-summary"
  | "ai-assistant"
  | "recruitment"
  | "settings";

const STAFF_ROLES: Role[] = ["manager", "sales", "developer"];
const ASSIGN_ROLES: Role[] = ["sales", "developer", "manager"];

export function Dashboard() {
  const { currentUser, company, signOut } = useOFM();
  const navigate = useNavigate();
  const [view, setView] = useState<ViewKey>("dashboard");

  if (!currentUser) return null;
  const role = currentUser.role;

  const nav: { key: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ...(role !== "sales" && role !== "developer"
      ? [{ key: "employees" as ViewKey, label: "Employee Management", icon: Users }]
      : []),
    { key: "tasks", label: "Task Management", icon: ClipboardList },
    ...(role === "admin" || role === "manager"
      ? [{ key: "leave" as ViewKey, label: "Leave Management", icon: CalendarDays }]
      : []),
    { key: "attendance", label: "Attendance", icon: Clock },
    { key: "events" as ViewKey, label: "Events", icon: PartyPopper },
    { key: "announcements" as ViewKey, label: "Announcements", icon: Megaphone },
    { key: "ai-summary" as ViewKey, label: "AI Data Summary", icon: Sparkles },
    
    { key: "insights" as ViewKey, label: "Saved AI Insights", icon: Bookmark },
    ...(role === "admin"
      ? [
          { key: "recruitment" as ViewKey, label: "Recruitment Ranking", icon: Trophy },
          { key: "settings" as ViewKey, label: "Settings", icon: Settings },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background p-1 dark:bg-foreground dark:p-1.5 dark:shadow-sm">
            <img src={officeHubLogo} alt="OfficeHub logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">{company?.name ?? "OfficeHub"}</p>
            <p className="text-[10px] text-sidebar-foreground/60">{company?.type}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() =>
                n.key === "ai-assistant"
                  ? navigate({ to: "/ai-assistant" })
                  : n.key === "recruitment"
                    ? navigate({ to: "/recruitment-ranking" })
                    : setView(n.key)
              }
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                view === n.key
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 px-2">
            <p className="text-sm font-semibold">{currentUser.name}</p>
            <Badge variant="secondary" className="mt-1 text-[10px]">{ROLE_LABELS[role]}</Badge>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => {
              signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-x-hidden">
        <header className="flex items-center justify-between border-b border-border bg-card px-8 py-4">
          <div>
            <h1 className="text-xl font-bold capitalize">{nav.find((n) => n.key === view)?.label}</h1>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[role]} workspace</p>
          </div>
          <ThemeToggle />
        </header>
        <div className="p-8">
          {view === "dashboard" && <DashboardView role={role} />}
          {view === "employees" && <EmployeesView role={role} />}
          {view === "tasks" && <TasksView role={role} />}
          {view === "leave" && <LeaveView />}
          {view === "attendance" && <AttendanceView role={role} />}
          {view === "events" && <EventsView role={role} />}
          {view === "announcements" && <AnnouncementsView role={role} />}
          {view === "insights" && <SavedInsightsView />}
          {view === "ai-summary" && <DataSummaryChat role={role} />}
          {view === "settings" && <SettingsView />}
        </div>
      </main>

      <Chatbot variant={role === "manager" ? "manager" : role === "admin" ? "admin" : "staff"} />
    </div>
  );
}

/* ---------- Dashboard ---------- */
function StatCard({ title, value, sub, icon: Icon }: { title: string; value: string; sub?: string; icon: typeof Sparkles }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function LeaveLimitWarnings({ role }: { role: Role }) {
  const { leaves, users, currentUser } = useOFM();
  if (!currentUser) return null;
  const isManagerial = role === "admin" || role === "manager";

  // Managerial roles see warnings for all low-balance staff;
  // staff only see their own warning.
  const targets = isManagerial
    ? users.filter((u) => u.role !== "admin")
    : users.filter((u) => u.id === currentUser.id);

  const warnings = targets
    .map((u) => ({ user: u, usage: getLeaveUsage(leaves, u.id) }))
    .filter((w) => w.usage.isLow);

  if (warnings.length === 0) return null;

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-destructive">
          <AlertTriangle className="h-5 w-5" /> Leave Balance Warning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {warnings.map(({ user, usage }) => (
          <div
            key={user.id}
            className="flex items-center justify-between rounded-lg border border-destructive/30 bg-background p-3"
          >
            <div>
              <p className="text-sm font-medium">
                {isManagerial ? user.name : "You"}
                {isManagerial && (
                  <span className="ml-2 text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Used {usage.used} of {LEAVE_LIMIT_DAYS} leave days
              </p>
            </div>
            <Badge variant={usage.isExceeded ? "destructive" : "outline"}>
              {usage.isExceeded ? "Limit reached" : `${usage.remaining} day(s) left`}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DashboardView({ role }: { role: Role }) {
  const { tasks, leaves, attendance, currentUser } = useOFM();
  const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
  const endedTasks = tasks.filter((t) => t.status === "ended").length;
  const myTasks = tasks.filter((t) => t.roles.includes(role) && t.status === "active");

  return (
    <div className="space-y-6">
      <LeaveLimitWarnings role={role} />

      <Card className="overflow-hidden border-0 bg-gradient-hero text-brand-foreground">
        <CardContent className="flex items-center gap-4 p-6">
          <Sparkles className="h-8 w-8" />
          <div>
            <p className="text-sm font-semibold">AI Summary Block</p>
            <p className="text-sm opacity-90">
              {role === "admin" &&
                `Company running smoothly — ${pendingLeaves} leave request(s) pending, ${endedTasks} task(s) completed this cycle.`}
              {role === "manager" &&
                `Your team has ${pendingLeaves} pending leave(s) and ${endedTasks} ended task(s). Attendance is healthy today.`}
              {(role === "sales" || role === "developer") &&
                `You have ${myTasks.length} active task(s) assigned to your role. Keep up the great work, ${currentUser?.name}!`}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(role === "admin" || role === "manager") && (
          <>
            <StatCard title="Leave Requests" value={String(pendingLeaves)} sub="pending approval" icon={CalendarDays} />
            <StatCard title="Ended Tasks" value={String(endedTasks)} sub="completed" icon={Check} />
            <StatCard title="Attendance Today" value={String(attendance.length)} sub="logs recorded" icon={Clock} />
          </>
        )}
        {(role === "sales" || role === "developer") && (
          <>
            <StatCard title="Active Tasks" value={String(myTasks.length)} sub="assigned to you" icon={ClipboardList} />
            <StatCard title="Ended Tasks" value={String(tasks.filter((t) => t.roles.includes(role) && t.status === "ended").length)} sub="your completed work" icon={Check} />
            <StatCard title="Role Data" value={ROLE_LABELS[role]} sub="your work area" icon={Users} />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {role === "sales" || role === "developer" ? "Your Active Tasks" : "Recent Tasks Overview"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(role === "sales" || role === "developer" ? myTasks : tasks).slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>
              <Badge variant={t.status === "ended" ? "secondary" : "default"}>{t.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Employees ---------- */
function EmployeesView({ role }: { role: Role }) {
  const { users, createStaff, updateStaff, deleteStaff } = useOFM();
  const readOnly = role === "manager";
  const staff = users.filter((u) => u.role !== "admin");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Staff Data List</p>
        {!readOnly && <StaffDialog onSave={(d) => { createStaff(d); toast.success("Staff account created"); }} trigger={<Button><Plus className="mr-2 h-4 w-4" /> Create Staff Account</Button>} />}
        {readOnly && <Badge variant="secondary">Read-only view</Badge>}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {!readOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><Badge variant="outline">{ROLE_LABELS[u.role]}</Badge></TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <StaffDialog
                          initial={u}
                          onSave={(d) => { updateStaff(u.id, d); toast.success("Staff updated"); }}
                          trigger={<Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {staff.length === 0 && (
                <TableRow><TableCell colSpan={readOnly ? 3 : 4} className="text-center text-muted-foreground">No staff yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StaffDialog({ initial, onSave, trigger }: { initial?: User; onSave: (d: { name: string; email: string; password: string; role: Role }) => void; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [role, setRole] = useState<Role>(initial?.role ?? "sales");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial ? "Edit Staff" : "Create Staff Account"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label>Full Name</Label><Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" placeholder="name@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            {email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && (
              <p className="text-xs text-destructive">Enter a valid email like name@gmail.com</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Password</Label>
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
            <ul className="space-y-0.5 pt-1">
              {STAFF_PASSWORD_RULES.map((r) => {
                const ok = r.test(password);
                return (
                  <li key={r.label} className={`text-xs ${password ? (ok ? "text-green-600" : "text-destructive") : "text-muted-foreground"}`}>
                    {password && ok ? "✓" : "•"} {r.label}
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!name || !email || !password}
            onClick={() => {
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Enter a valid email like name@gmail.com"); return; }
              if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
              onSave({ name, email, password, role }); setOpen(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Tasks ---------- */
function TasksView({ role }: { role: Role }) {
  const { tasks, createTask, endTask } = useOFM();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const isStaff = role === "sales" || role === "developer";
  const [roles, setRoles] = useState<Role[]>([]);

  const availableRoles = ASSIGN_ROLES;

  function toggleRole(r: Role, checked: boolean) {
    setRoles((prev) => (checked ? [...prev, r] : prev.filter((x) => x !== r)));
  }

  // Staff: read-only list of all tasks; they can only End tasks assigned to
  // their own role. Admin/Manager: create + manage all tasks.
  if (isStaff) {
    const myTasks = tasks.filter((t) => t.roles.includes(role));
    const otherTasks = tasks.filter((t) => !t.roles.includes(role));
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Your Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Assigned by {t.createdByName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.status === "ended" ? "secondary" : "default"}>{t.status}</Badge>
                  {t.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => { endTask(t.id); toast.success("Task ended"); }}>End</Button>
                  )}
                </div>
              </div>
            ))}
            {myTasks.length === 0 && <p className="text-center text-sm text-muted-foreground">No tasks assigned to you</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Other Tasks (read-only)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {otherTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3 opacity-75">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.roles.map((r) => <Badge key={r} variant="outline" className="text-[10px]">{ROLE_LABELS[r]}</Badge>)}
                  </div>
                </div>
                <Badge variant={t.status === "ended" ? "secondary" : "default"}>{t.status}</Badge>
              </div>
            ))}
            {otherTasks.length === 0 && <p className="text-center text-sm text-muted-foreground">No other tasks</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      <Card>
        <CardHeader><CardTitle className="text-base">Create Task</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></div>
          <div className="space-y-2">
            <Label>Assign to role <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">Choose one or more roles for this task</p>
            <div className="flex flex-wrap gap-4">
              {availableRoles.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={roles.includes(r)}
                    onCheckedChange={(c) => toggleRole(r, !!c)}
                  />
                  {ROLE_LABELS[r]}
                </label>
              ))}
            </div>
          </div>
          <Button
            className="w-full"
            disabled={!title || roles.length === 0}
            onClick={() => {
              createTask({ title, description: desc, roles });
              setTitle(""); setDesc(""); setRoles([]);
              toast.success("Task created");
            }}
          >
            Create Task
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tasks</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {t.roles.map((r) => <Badge key={r} variant="outline" className="text-[10px]">{ROLE_LABELS[r]}</Badge>)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={t.status === "ended" ? "secondary" : "default"}>{t.status}</Badge>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-center text-sm text-muted-foreground">No tasks</p>}
        </CardContent>
      </Card>
    </div>
  );
}


/* ---------- Leave ---------- */
function LeaveView() {
  const { leaves, setLeaveStatus } = useOFM();
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const list = useMemo(() => (filter === "pending" ? leaves.filter((l) => l.status === "pending") : leaves), [leaves, filter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={filter === "pending" ? "default" : "outline"} size="sm" onClick={() => setFilter("pending")}>Pending</Button>
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Reason</TableHead><TableHead>Duration</TableHead><TableHead>Date &amp; Time</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {list.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.reason}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {l.days ? (
                      <span className="font-medium">{l.days} day{l.days > 1 ? "s" : ""}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                    {l.startDate && l.endDate && (
                      <div className="text-xs text-muted-foreground">{l.startDate} → {l.endDate}</div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {l.createdAt ? new Date(l.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={l.status === "approved" ? "default" : l.status === "rejected" ? "destructive" : "secondary"}>{l.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {l.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" onClick={() => { setLeaveStatus(l.id, "approved"); toast.success("Leave approved"); }}><Check className="mr-1 h-4 w-4" /> Approve</Button>
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => { setLeaveStatus(l.id, "rejected"); toast.success("Leave rejected"); }}><X className="mr-1 h-4 w-4" /> Reject</Button>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No leave requests</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Attendance ---------- */
function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function AttendanceCaptureDialog({
  mode,
  disabled,
  onSubmit,
}: {
  mode: "in" | "out";
  disabled: boolean;
  onSubmit: (data: { lat: number; lng: number; photo: string }) => Promise<void>;
}) {
  const { company } = useOFM();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const hasGeofence = company?.latitude != null && company?.longitude != null;
  const distance =
    coords && hasGeofence
      ? distanceMeters(coords.lat, coords.lng, company!.latitude!, company!.longitude!)
      : null;
  const withinFence = distance == null ? true : distance <= (company?.geofenceRadius ?? 200);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  const startCamera = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setCamError("Camera access denied. Please allow camera permission.");
    }
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }
    setPhoto(null);
    setGeoError(null);
    setCoords(null);
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported on this device.");
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setGeoError("Location access denied. Please allow location permission."),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    }
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const w = 480;
    const h = (video.videoHeight / video.videoWidth) * w || 360;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    setPhoto(canvas.toDataURL("image/jpeg", 0.7));
    stopCamera();
  };

  const submit = async () => {
    if (!coords || !photo) return;
    setSubmitting(true);
    try {
      await onSubmit({ lat: coords.lat, lng: coords.lng, photo });
      toast.success(mode === "in" ? "Checked in" : "Checked out");
      setOpen(false);
    } catch {
      toast.error("Failed to save attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!coords && !!photo && withinFence && !submitting;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          variant={mode === "in" ? "default" : "secondary"}
          disabled={disabled}
          className="h-14 px-8"
        >
          <Camera className="mr-2 h-5 w-5" />
          {mode === "in" ? "Daily Check-In" : "Daily Check-Out"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "in" ? "Check-In" : "Check-Out"} — Face Verification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Location status */}
          <div className="rounded-lg border p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4 text-primary" /> Location
            </div>
            {geoError ? (
              <p className="mt-1 text-destructive">{geoError}</p>
            ) : coords ? (
              <div className="mt-1 space-y-1 text-muted-foreground">
                <p>
                  <Navigation className="mr-1 inline h-3 w-3" />
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
                {hasGeofence ? (
                  withinFence ? (
                    <p className="text-emerald-600">
                      ✓ Within office area ({Math.round(distance!)} m away)
                    </p>
                  ) : (
                    <p className="text-destructive">
                      ✗ You are {Math.round(distance!)} m from the office (allowed{" "}
                      {company?.geofenceRadius} m). Move closer to check {mode === "in" ? "in" : "out"}.
                    </p>
                  )
                ) : (
                  <p className="text-amber-600">Office location not set — showing current location only.</p>
                )}
              </div>
            ) : (
              <p className="mt-1 text-muted-foreground">Getting your location…</p>
            )}
          </div>

          {/* Camera / photo */}
          <div className="overflow-hidden rounded-lg border bg-muted">
            {photo ? (
              <img src={photo} alt="Captured" className="w-full" />
            ) : (
              <video ref={videoRef} playsInline muted className="w-full bg-black" />
            )}
          </div>
          {camError && <p className="text-sm text-destructive">{camError}</p>}

          <div className="flex gap-2">
            {photo ? (
              <Button variant="outline" className="flex-1" onClick={() => { setPhoto(null); startCamera(); }}>
                Retake
              </Button>
            ) : (
              <Button
                variant="outline"
                className="flex-1"
                disabled={!cameraReady}
                onClick={capture}
              >
                <Camera className="mr-2 h-4 w-4" /> Capture
              </Button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!canSubmit} className="w-full">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm Check-{mode === "in" ? "In" : "Out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AttendanceView({ role }: { role: Role }) {
  const { attendance, checkIn, checkOut, currentUser } = useOFM();
  const showPanel = role !== "admin";
  const today = new Date().toISOString().slice(0, 10);
  const mine = attendance.find((a) => a.userId === currentUser?.id && a.date === today);
  const logs = role === "admin" || role === "manager" ? attendance : attendance.filter((a) => a.userId === currentUser?.id);

  return (
    <div className="space-y-6">
      {showPanel && (
        <Card>
          <CardHeader><CardTitle className="text-base">Daily Check-In / Check-Out</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4">
            <AttendanceCaptureDialog mode="in" disabled={!!mine?.checkIn} onSubmit={checkIn} />
            <AttendanceCaptureDialog mode="out" disabled={!mine?.checkIn || !!mine?.checkOut} onSubmit={checkOut} />
            {mine && (
              <div className="text-sm text-muted-foreground">
                In: <span className="font-medium text-foreground">{mine.checkIn ?? "—"}</span> · Out: <span className="font-medium text-foreground">{mine.checkOut ?? "—"}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Attendance Logs</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Check-In</TableHead><TableHead>Check-Out</TableHead><TableHead>Photo</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.userName}</TableCell>
                  <TableCell>{a.date}</TableCell>
                  <TableCell>{a.checkIn ?? "—"}</TableCell>
                  <TableCell>{a.checkOut ?? "—"}</TableCell>
                  <TableCell className="flex gap-1">
                    {a.checkInPhoto && <img src={a.checkInPhoto} alt="in" className="h-8 w-8 rounded object-cover" />}
                    {a.checkOutPhoto && <img src={a.checkOutPhoto} alt="out" className="h-8 w-8 rounded object-cover" />}
                    {!a.checkInPhoto && !a.checkOutPhoto && "—"}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Company Location (Geofence) ---------- */
function CompanyLocationCard() {
  const { company, saveCompanyLocation } = useOFM();
  const [lat, setLat] = useState(company?.latitude != null ? String(company.latitude) : "");
  const [lng, setLng] = useState(company?.longitude != null ? String(company.longitude) : "");
  const [radius, setRadius] = useState(String(company?.geofenceRadius ?? 200));
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const useCurrent = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setLocating(false);
        toast.success("Current location filled");
      },
      () => {
        setLocating(false);
        toast.error("Location access denied");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const save = async () => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    const r = parseInt(radius, 10);
    if (Number.isNaN(la) || Number.isNaN(ln)) {
      toast.error("Enter valid latitude and longitude");
      return;
    }
    setSaving(true);
    try {
      await saveCompanyLocation({ latitude: la, longitude: ln, geofenceRadius: Number.isNaN(r) ? 200 : r });
      toast.success("Company location saved");
    } catch {
      toast.error("Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" /> Office Location (Check-In Geofence)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Set your office latitude & longitude. Staff must be within the allowed radius to check in/out.
          If left empty, staff can check in/out from any location (current location is still recorded).
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Latitude</Label>
            <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="e.g. 16.8409" />
          </div>
          <div className="space-y-1">
            <Label>Longitude</Label>
            <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="e.g. 96.1735" />
          </div>
          <div className="space-y-1">
            <Label>Radius (m)</Label>
            <Input value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="200" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={useCurrent} disabled={locating}>
            {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Navigation className="mr-2 h-4 w-4" />}
            Use Current Location
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Location
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Settings ---------- */

function SettingsView() {
  const {
    wifiPassword,
    setWifiPassword,
    company,
    telegramBotToken,
    telegramChatId,
    saveTelegramSettings,
  } = useOFM();
  const [pw, setPw] = useState(wifiPassword);
  const [token, setToken] = useState(telegramBotToken);
  const [chatId, setChatId] = useState(telegramChatId);
  const [savingTg, setSavingTg] = useState(false);

  const steps = [
    {
      title: "Create your bot with BotFather",
      body: (
        <>
          On Telegram, search for <b>@BotFather</b>, send <code className="rounded bg-muted px-1">/newbot</code>,
          give it a name, and copy the <b>bot token</b> it gives you.
        </>
      ),
    },
    {
      title: "Make a staff group & add the bot",
      body: (
        <>
          Create a Telegram <b>Group</b> for your staff, add your new bot to it, then open the group
          settings and <b>promote the bot to Administrator</b>.
        </>
      ),
    },
    {
      title: "Find your Chat ID",
      body: (
        <>
          Type any message in the group, then open{" "}
          <code className="break-all rounded bg-muted px-1">
            https://api.telegram.org/bot&lt;YOUR_TOKEN&gt;/getUpdates
          </code>{" "}
          in your browser and copy the <b>Chat ID</b> (the negative number, e.g. <b>-1001234567890</b>).
        </>
      ),
    },
    {
      title: "Paste & save",
      body: <>Paste both the <b>token</b> and the <b>Chat ID</b> below and click Save.</>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wifi className="h-4 w-4" /> Office Wi-Fi Password</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Staff can ask the chatbot for this value.</p>
            <Input value={pw} onChange={(e) => setPw(e.target.value)} />
            <Button onClick={() => { setWifiPassword(pw); toast.success("Wi-Fi password updated"); }}>Save</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Company</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {company?.name}</p>
            <p><span className="text-muted-foreground">Type:</span> {company?.type}</p>
          </CardContent>
        </Card>
      </div>

      <CompanyLocationCard />



      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" /> How to Setup Telegram Notification Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="grid gap-4 md:grid-cols-2">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-border bg-muted/40 p-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-brand text-sm font-bold text-brand-foreground">
                  {i + 1}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">TELEGRAM_BOT_TOKEN</Label>
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456:ABC-DEF..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">TELEGRAM_CHAT_ID</Label>
              <Input
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-1001234567890"
              />
            </div>
          </div>
          <Button
            disabled={savingTg}
            onClick={async () => {
              setSavingTg(true);
              try {
                await saveTelegramSettings({ botToken: token.trim(), chatId: chatId.trim() });
                toast.success("Telegram settings saved");
              } catch {
                toast.error("Failed to save Telegram settings");
              } finally {
                setSavingTg(false);
              }
            }}
          >
            {savingTg ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Telegram Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Announcements ---------- */
function AnnouncementsView({ role }: { role: Role }) {
  const { announcements, publishAnnouncement } = useOFM();
  const canPublish = role === "admin" || role === "manager";
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Add a title and message first");
      return;
    }
    setPublishing(true);
    try {
      const { sent, reason, email } = await publishAnnouncement({ title: title.trim(), content: content.trim() });
      setTitle("");
      setContent("");

      if (email?.sent) {
        toast.success(`Published. Emailed ${email.count} staff member${email.count === 1 ? "" : "s"}.`);
      } else if (sent) {
        toast.success("Published & broadcast to Telegram");
      } else if (reason === "telegram_not_configured") {
        toast.success("Published. Add Telegram credentials in Settings to broadcast.");
      } else {
        toast.success("Published. Broadcast failed — check Telegram/email settings.");
      }
    } catch {
      toast.error("Failed to publish announcement");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {canPublish && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4" /> Create Announcement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea
              placeholder="Write your announcement..."
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <Button onClick={handlePublish} disabled={publishing}>
              {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Publish &amp; Broadcast
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Announcements Feed</h2>
        {announcements.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No announcements yet.
          </p>
        ) : (
          announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold">{a.title}</h3>
                  <Badge variant="secondary" className="flex-shrink-0 text-[10px]">
                    {new Date(a.createdAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.content}</p>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <MessageCircle className="h-3 w-3" /> {a.createdByName}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}


/* ---------- Saved AI Insights (private per user) ---------- */
function SavedInsightsView() {
  const { currentUser } = useOFM();
  const { items, remove } = useSavedInsights(currentUser?.id);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-gradient-hero text-brand-foreground">
        <CardContent className="flex items-center gap-4 p-6">
          <Bookmark className="h-8 w-8" />
          <div>
            <p className="text-sm font-semibold">My Knowledge Base</p>
            <p className="text-sm opacity-90">
              Your private collection of saved AI replies. Only you can see these — no other staff or admin has access.
            </p>
          </div>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No saved insights yet. Tap the <span className="font-medium">Save</span> button under any chatbot reply to keep it here.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((it) => (
            <Card key={it.id}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="prose prose-sm dark:prose-invert max-w-none overflow-hidden [overflow-wrap:anywhere] [word-break:break-word] [&_code]:whitespace-pre-wrap [&_code]:[overflow-wrap:anywhere] [&_ol]:my-1 [&_p]:my-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-background/80 [&_pre]:p-3 [&_pre_code]:whitespace-pre [&_ul]:my-1">
                    <ReactMarkdown>{it.text}</ReactMarkdown>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Saved {new Date(it.savedAt).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Remove insight"
                  onClick={() => {
                    remove(it.id);
                    toast.success("Removed from your insights");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Events ---------- */
function EventCard({ ev }: { ev: { title: string; description: string; imageUrl: string; eventType: string; date: string; time: string } }) {
  return (
    <Card className="overflow-hidden">
      {ev.imageUrl && (
        <div className="aspect-video w-full overflow-hidden bg-muted">
          <img src={ev.imageUrl} alt={ev.title} className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <CardContent className="space-y-2 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {ev.eventType && <Badge variant="secondary">{ev.eventType}</Badge>}
          <span className="text-xs text-muted-foreground">
            {ev.date}{ev.time ? ` · ${ev.time}` : ""}
          </span>
        </div>
        <h3 className="text-lg font-bold leading-tight">{ev.title}</h3>
        <p className="text-sm text-muted-foreground">{ev.description}</p>
      </CardContent>
    </Card>
  );
}

function EventsView({ role }: { role: Role }) {
  const { events, company, saveEvent } = useOFM();
  const isAdmin = role === "admin";
  const [tab, setTab] = useState<"upcoming" | "ended">("upcoming");

  const todayStr = new Date().toISOString().slice(0, 10);
  const published = events.filter((e) => e.status === "published");
  const upcoming = published.filter((e) => e.date >= todayStr);
  const ended = published.filter((e) => e.date < todayStr);

  // Admin editor state
  const [eventType, setEventType] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [details, setDetails] = useState("");
  const [language, setLanguage] = useState<"en" | "my">("en");
  const [uploadedImage, setUploadedImage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const runGenerate = useServerFn(generateEvent);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Image too large (max 4MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setUploadedImage(url);
      setImageUrl(url);
    };
    reader.readAsDataURL(file);
  }

  async function handleGenerate() {
    if (!eventType) return;
    setGenerating(true);
    try {
      const res = await runGenerate({
        data: {
          eventType,
          date,
          time,
          companyType: company?.type ?? null,
          details: details || undefined,
          language,
          imageDataUrl: uploadedImage || undefined,
        },
      });
      setTitle(res.title);
      setDescription(res.description);
      setImageUrl(res.imageUrl);
      toast.success("Event preview generated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleAdd() {
    if (!title || !date) {
      toast.error("Add a title and date first");
      return;
    }
    setSaving(true);
    try {
      await saveEvent({ eventType, date, time, title, description, imageUrl });
      toast.success("Event published");
      setEventType(""); setDate(""); setTime(""); setTitle(""); setDescription(""); setImageUrl("");
      setDetails(""); setUploadedImage(""); setLanguage("en");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to publish event");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card>
            <CardHeader><CardTitle className="text-base">Event Editor</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1"><Label>Event Type</Label><Input placeholder="e.g. Team Dinner, Product Launch" value={eventType} onChange={(e) => setEventType(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div className="space-y-1"><Label>Time</Label><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label>Extra details for AI (optional)</Label><Textarea rows={3} placeholder="e.g. theme, dress code, special guests, tone you want…" value={details} onChange={(e) => setDetails(e.target.value)} /></div>
              <div className="space-y-1">
                <Label>Reference picture (optional)</Label>
                <Input type="file" accept="image/*" onChange={handleImageUpload} />
                {uploadedImage && (
                  <div className="mt-2 aspect-video w-full overflow-hidden rounded-lg bg-muted">
                    <img src={uploadedImage} alt="Reference" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Output language</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant={language === "en" ? "default" : "outline"} onClick={() => setLanguage("en")}>English</Button>
                  <Button type="button" size="sm" variant={language === "my" ? "default" : "outline"} onClick={() => setLanguage("my")}>Burmese (မြန်မာ)</Button>
                </div>
              </div>
              <Button className="w-full" variant="secondary" disabled={!eventType || generating} onClick={handleGenerate}>
                {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                AI Generate Event
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Preview (editable)</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {imageUrl ? (
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                  <img src={imageUrl} alt="Event" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                  Generate an event to see the preview
                </div>
              )}
              <div className="space-y-1"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" /></div>
              <div className="space-y-1"><Label>Description</Label><Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Event description" /></div>
              <div className="space-y-1"><Label>Image URL</Label><Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." /></div>
              <Button className="w-full" disabled={saving || !title || !date} onClick={handleAdd}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add to Event
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button variant={tab === "upcoming" ? "default" : "outline"} size="sm" onClick={() => setTab("upcoming")}>Upcoming Events</Button>
          <Button variant={tab === "ended" ? "default" : "outline"} size="sm" onClick={() => setTab("ended")}>Ended Events</Button>
        </div>
        {(tab === "upcoming" ? upcoming : ended).length === 0 ? (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">No {tab} events.</CardContent></Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(tab === "upcoming" ? upcoming : ended).map((ev) => <EventCard key={ev.id} ev={ev} />)}
          </div>
        )}
      </div>
    </div>
  );
}
