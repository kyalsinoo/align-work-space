import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import authBg from "@/assets/auth-bg.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOFM } from "@/lib/ofm-store";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — OfficeHub Office Management System" },
      { name: "description", content: "Sign in as staff or register your company to start managing tasks, leave, attendance and more with an AI assistant." },
      { property: "og:title", content: "Sign In — OfficeHub Office Management System" },
      { property: "og:description", content: "Sign in or register your company to access role-based dashboards and an AI assistant." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { registerCompany, signIn, hasSession, currentUser } = useOFM();
  const navigate = useNavigate();

  useEffect(() => {
    if (hasSession && currentUser) navigate({ to: "/dashboard" });
  }, [hasSession, currentUser, navigate]);

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
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center p-6"
      style={{ backgroundImage: `url(${authBg})` }}
    >
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />

      <div className="relative z-10 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <Link to="/" className="text-2xl font-bold">OFM System</Link>
            <p className="mt-1 text-sm text-muted-foreground">
              <Link to="/" className="hover:underline">← Back to home</Link>
            </p>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Staff Sign-In</TabsTrigger>
              <TabsTrigger value="register">Register Company</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <div className="space-y-1"><Label>Email</Label><Input type="email" value={sEmail} onChange={(e) => setSEmail(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Password</Label><Input type="password" value={sPass} onChange={(e) => setSPass(e.target.value)} /></div>
                  <Button
                    className="w-full"
                    onClick={async () => {
                      try {
                        const u = await signIn(sEmail, sPass);
                        if (u) { toast.success(`Welcome, ${u.name}`); navigate({ to: "/dashboard" }); }
                        else toast.error("Invalid credentials");
                      } catch {
                        toast.error("Invalid credentials");
                      }
                    }}
                  >
                    Sign In
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardContent className="space-y-3 pt-6">
                  <p className="text-sm text-muted-foreground">Company Registration <span className="text-xs">(Admin)</span></p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Full Name</Label><Input placeholder="Full name" value={rName} onChange={(e) => setRName(e.target.value)} /></div>
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
                        <SelectItem value="Skincare / Beauty">Skincare / Beauty</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="w-full"
                    disabled={!rName || !rEmail || !rPass || !cName}
                    onClick={async () => {
                      try {
                        await registerCompany({ name: rName, email: rEmail, password: rPass, companyName: cName, companyType: cType });
                        toast.success("Company registered");
                        navigate({ to: "/dashboard" });
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Registration failed");
                      }
                    }}
                  >
                    Register Company
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
