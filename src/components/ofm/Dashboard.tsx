import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useOFM, ROLE_LABELS, type Role, type User } from "@/lib/ofm-store";
import { useSavedInsights } from "@/lib/saved-insights";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type ViewKey =
  | "dashboard"
  | "employees"
  | "tasks"
  | "leave"
  | "attendance"
  | "insights"
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
    { key: "insights" as ViewKey, label: "Saved AI Insights", icon: Bookmark },
    ...(role === "admin" ? [{ key: "settings" as ViewKey, label: "Settings", icon: Settings }] : []),
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-64 flex-shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">{company?.name ?? "OFM"}</p>
            <p className="text-[10px] text-sidebar-foreground/60">{company?.type}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((n) => (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
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
        </header>
        <div className="p-8">
          {view === "dashboard" && <DashboardView role={role} />}
          {view === "employees" && <EmployeesView role={role} />}
          {view === "tasks" && <TasksView role={role} />}
          {view === "leave" && <LeaveView />}
          {view === "attendance" && <AttendanceView role={role} />}
          {view === "insights" && <SavedInsightsView />}
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

function DashboardView({ role }: { role: Role }) {
  const { tasks, leaves, attendance, currentUser } = useOFM();
  const pendingLeaves = leaves.filter((l) => l.status === "pending").length;
  const endedTasks = tasks.filter((t) => t.status === "ended").length;
  const myTasks = tasks.filter((t) => t.roles.includes(role) && t.status === "active");

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-gradient-hero text-primary-foreground">
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
          <div className="space-y-1"><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1"><Label>Password</Label><Input value={password} onChange={(e) => setPassword(e.target.value)} /></div>
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
            onClick={() => { onSave({ name, email, password, role }); setOpen(false); }}
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

  function toggle(r: Role) {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
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
            <Label>Assign to roles</Label>
            <div className="flex flex-wrap gap-4">
              {availableRoles.map((r) => (
                <label key={r} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={roles.includes(r)} onCheckedChange={() => toggle(r)} />
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
                {t.status === "active" && (
                  <Button size="sm" variant="outline" onClick={() => { endTask(t.id); toast.success("Task ended"); }}>End</Button>
                )}
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
              <TableRow><TableHead>Name</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {list.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell>{l.reason}</TableCell>
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
              {list.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No leave requests</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Attendance ---------- */
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
            <Button size="lg" disabled={!!mine?.checkIn} onClick={() => { checkIn(); toast.success("Checked in"); }} className="h-14 px-8">
              <Clock className="mr-2 h-5 w-5" /> Daily Check-In
            </Button>
            <Button size="lg" variant="secondary" disabled={!mine?.checkIn || !!mine?.checkOut} onClick={() => { checkOut(); toast.success("Checked out"); }} className="h-14 px-8">
              <Clock className="mr-2 h-5 w-5" /> Daily Check-Out
            </Button>
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
            <TableHeader><TableRow><TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Check-In</TableHead><TableHead>Check-Out</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.userName}</TableCell>
                  <TableCell>{a.date}</TableCell>
                  <TableCell>{a.checkIn ?? "—"}</TableCell>
                  <TableCell>{a.checkOut ?? "—"}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No records</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Settings ---------- */
function SettingsView() {
  const { wifiPassword, setWifiPassword, company } = useOFM();
  const [pw, setPw] = useState(wifiPassword);
  return (
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
  );
}

/* ---------- Saved AI Insights (private per user) ---------- */
function SavedInsightsView() {
  const { currentUser } = useOFM();
  const { items, remove } = useSavedInsights(currentUser?.id);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-gradient-hero text-primary-foreground">
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
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_pre]:my-2 [&_ul]:my-1 [&_ol]:my-1">
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
