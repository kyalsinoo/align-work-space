import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import officeHubLogo from "@/assets/officehub-logo.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  CheckSquare,
  CalendarDays,
  Clock,
  Sparkles,
  Megaphone,
  Mail,
  Phone,
  MapPin,
  Check,
} from "lucide-react";
import { useOFM } from "@/lib/ofm-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OfficeHub — Smart Office Management System" },
      { name: "description", content: "OfficeHub helps teams manage tasks, leave, attendance, events and announcements with a built-in AI assistant. Start your project today." },
      { property: "og:title", content: "OfficeHub — Smart Office Management System" },
      { property: "og:description", content: "Manage tasks, leave, attendance and more with role-based dashboards and an AI assistant." },
    ],
  }),
  component: Landing,
});

const services = [
  { icon: Users, title: "Employee Management", desc: "Create staff accounts, manage roles, and keep your team directory organized." },
  { icon: CheckSquare, title: "Task Management", desc: "Assign role-based tasks, track progress, and close out completed work." },
  { icon: CalendarDays, title: "Leave Management", desc: "Request, approve and track leave with smart limits and warnings." },
  { icon: Clock, title: "Attendance Tracking", desc: "Daily check-in / check-out with full attendance logs for the whole team." },
  { icon: Sparkles, title: "AI Assistant", desc: "A bilingual (English / မြန်မာ) assistant for office Q&A and data summaries." },
  { icon: Megaphone, title: "Events & Announcements", desc: "Publish events and broadcast announcements straight to Telegram." },
];

const packages = [
  { name: "Bronze", price: "Free", features: ["Up to 5 staff", "Tasks & attendance", "Basic AI chatbot"], highlight: false },
  { name: "Silver Plan", price: "$29/mo", features: ["Up to 50 staff", "Leave & events", "AI data summaries", "Announcements"], highlight: true },
  { name: "Golden Plan", price: "Custom", features: ["Unlimited staff", "Telegram broadcast", "Priority support", "Custom roles"], highlight: false },
];

function Landing() {
  const { hasSession, currentUser } = useOFM();
  const navigate = useNavigate();

  useEffect(() => {
    if (hasSession && currentUser) navigate({ to: "/dashboard" });
  }, [hasSession, currentUser, navigate]);

  return (
    <div className="cyber-bg min-h-screen text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-primary/20 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <img src={officeHubLogo} alt="OfficeHub" className="h-9 w-auto drop-shadow-[0_0_8px_var(--color-primary)]" />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#services" className="transition-colors hover:text-primary">Our Services</a>
            <a href="#about" className="transition-colors hover:text-primary">About</a>
            <a href="#packages" className="transition-colors hover:text-primary">Packages</a>
            <a href="#contact" className="transition-colors hover:text-primary">Contact Us</a>
          </nav>
          <Button asChild size="sm" className="shadow-glow">
            <Link to="/auth">Start Your Project</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="cyber-rings relative flex min-h-[72vh] items-center overflow-hidden">
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-24">
          <div className="max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Next-gen workspace
            </span>
            <h1 className="font-display text-4xl font-extrabold leading-tight text-foreground text-glow md:text-6xl">
              Tecfy Attendance
            </h1>
            <p className="text-lg text-muted-foreground">
              OfficeHub brings tasks, leave, attendance, events and an AI assistant into one
              high-tech workspace — with role-based access for admins, managers and staff.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="shadow-glow">
                <Link to="/auth">Start Your Project</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10">
                <a href="#services">Explore Services</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold text-glow">Our Services</h2>
          <p className="mt-2 text-muted-foreground">Everything your team needs to stay organized.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card
              key={s.title}
              className="border-primary/20 bg-card/60 backdrop-blur transition-all hover:border-primary/50 hover:shadow-glow"
            >
              <CardHeader>
                <s.icon className="h-8 w-8 text-primary drop-shadow-[0_0_6px_var(--color-primary)]" />
                <CardTitle className="text-lg">{s.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-y border-primary/15 bg-card/30">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="font-display text-3xl font-bold text-glow">About OfficeHub</h2>
            <p className="text-muted-foreground">
              OfficeHub (Office Management System) is built for modern teams who want a single,
              intelligent platform to handle daily operations. From staff onboarding to
              attendance and leave, every workflow is role-aware and secure.
            </p>
            <p className="text-muted-foreground">
              Our built-in AI assistant speaks both English and Myanmar, answers office
              questions, and summarizes your data — while respecting strict privacy rules.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { k: "3", v: "Role-based dashboards" },
              { k: "AI", v: "Bilingual assistant" },
              { k: "100%", v: "Secure RBAC" },
              { k: "24/7", v: "Always available" },
            ].map((stat) => (
              <Card key={stat.v} className="border-primary/20 bg-card/60 backdrop-blur">
                <CardContent className="p-6 text-center">
                  <div className="font-display text-3xl font-bold text-primary text-glow">{stat.k}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{stat.v}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold text-glow">Packages</h2>
          <p className="mt-2 text-muted-foreground">Choose the plan that fits your team.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {packages.map((p) => (
            <Card
              key={p.name}
              className={
                p.highlight
                  ? "border-primary/60 bg-card/70 shadow-glow backdrop-blur"
                  : "border-primary/20 bg-card/50 backdrop-blur"
              }
            >
              <CardHeader>
                {p.highlight && (
                  <span className="mb-2 inline-block w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary-foreground shadow-glow">
                    Most popular
                  </span>
                )}
                <CardTitle className="font-display text-xl text-glow">{p.name}</CardTitle>
                <div className="font-display text-3xl font-bold text-primary">{p.price}</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-foreground/90">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary drop-shadow-[0_0_5px_var(--color-primary)]" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className={p.highlight ? "w-full shadow-glow" : "w-full"}
                  variant={p.highlight ? "default" : "outline"}
                >
                  <Link to="/auth">Start Your Project</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Start your project CTA */}
      <section className="cyber-rings relative border-y border-primary/15 bg-primary/5">
        <div className="relative z-10 mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="font-display text-3xl font-bold text-glow">Ready to get started?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Register your company or sign in as staff to access your dashboard.
          </p>
          <Button asChild size="lg" className="mt-6 shadow-glow">
            <Link to="/auth">Start Your Project</Link>
          </Button>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold text-glow">Contact Us</h2>
          <p className="mt-2 text-muted-foreground">We'd love to hear from you.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Mail, label: "Email", value: "hello@ofm.app" },
            { icon: Phone, label: "Phone", value: "+95 9 123 456 789" },
            { icon: MapPin, label: "Address", value: "Yangon, Myanmar" },
          ].map((c) => (
            <Card key={c.label} className="border-primary/20 bg-card/60 backdrop-blur transition-all hover:border-primary/50 hover:shadow-glow">
              <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
                <c.icon className="h-8 w-8 text-primary drop-shadow-[0_0_6px_var(--color-primary)]" />
                <div className="font-medium">{c.label}</div>
                <div className="text-sm text-muted-foreground">{c.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-primary/15">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} OfficeHub Office Management System</span>
          <Link to="/auth" className="transition-colors hover:text-primary">Sign In</Link>
        </div>
      </footer>
    </div>
  );
}
