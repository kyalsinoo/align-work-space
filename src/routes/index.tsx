import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center p-6"
      style={{ backgroundImage: `url(${authBg})` }}
    >
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />

      {/* Forms */}
      <div className="relative z-10 flex items-center justify-center p-6">

        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:hidden">
            <h1 className="text-2xl font-bold">OFM System</h1>
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
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </div>
  );
}
