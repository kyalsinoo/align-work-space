import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOFM } from "@/lib/ofm-store";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OFM — Office Management System" },
      { name: "description", content: "Register your company or sign in as staff to manage tasks, leave, attendance and more with an AI assistant." },
      { property: "og:title", content: "OFM — Office Management System" },
      { property: "og:description", content: "Smart office management with role-based dashboards and an AI assistant." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { registerCompany, signIn } = useOFM();
  const navigate = useNavigate();

  // register fields
  const [rName, setRName] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPass, setRPass] = useState("");
  const [cName, setCName] = useState("");
  const [cType, setCType] = useState("Tech Startup");

  // sign-in fields
  const [sEmail, setSEmail] = useState("");
  const [sPass, setSPass] = useState("");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-hero p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
            <Building2 className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold">OFM System</span>
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">Run your office, intelligently.</h1>
          <p className="max-w-md text-primary-foreground/80">
            Role-based dashboards for Admins, Managers and Staff. Manage employees, tasks,
            leave and attendance — with a bilingual AI assistant built in.
          </p>
          <div className="space-y-3">
            {[
              { icon: ShieldCheck, t: "Granular role access control" },
              { icon: Sparkles, t: "AI assistant (English & မြန်မာ)" },
              { icon: LogIn, t: "In-chatbot leave requests" },
            ].map((f) => (
              <div key={f.t} className="flex items-center gap-3 text-sm">
                <f.icon className="h-5 w-5" /> {f.t}
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-primary-foreground/60">Demo: admin@ofm.com / admin123 · manager@ofm.com / manager123 · sales@ofm.com / sales123 · dev@ofm.com / dev123</p>
      </div>

      {/* Forms */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:hidden">
            <h1 className="text-2xl font-bold">OFM System</h1>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Company Registration <span className="text-xs font-normal text-muted-foreground">(Admin)</span></CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Name</Label><Input value={rName} onChange={(e) => setRName(e.target.value)} /></div>
                <div className="space-y-1"><Label>Email</Label><Input type="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label>Password</Label><Input type="password" value={rPass} onChange={(e) => setRPass(e.target.value)} /></div>
              <div className="space-y-1"><Label>Company Name</Label><Input value={cName} onChange={(e) => setCName(e.target.value)} /></div>
              <div className="space-y-1">
                <Label>Company Type</Label>
                <Select value={cType} onValueChange={setCType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tech Startup">Tech Startup</SelectItem>
                    <SelectItem value="Creative Agency">Creative Agency</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                disabled={!rName || !rEmail || !rPass || !cName}
                onClick={() => {
                  registerCompany({ name: rName, email: rEmail, password: rPass, companyName: cName, companyType: cType });
                  toast.success("Company registered");
                  navigate({ to: "/dashboard" });
                }}
              >
                Register Company
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Staff Sign-In</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} /></div>
              <div className="space-y-1"><Label>Password</Label><Input type="password" value={sPass} onChange={(e) => setSPass(e.target.value)} /></div>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  const u = signIn(sEmail, sPass);
                  if (u) { toast.success(`Welcome, ${u.name}`); navigate({ to: "/dashboard" }); }
                  else toast.error("Invalid credentials");
                }}
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
