import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import authBg from "@/assets/auth-bg.jpg";
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
} from "lucide-react";
import { useOFM } from "@/lib/ofm-store";
import { HeroAnimation } from "@/components/ofm/HeroAnimation";
import { ThemeToggle } from "@/components/ThemeToggle";

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
  { name: "Starter", price: "Free", features: ["Up to 5 staff", "Tasks & attendance", "Basic AI chatbot"], highlight: false },
  { name: "Business", price: "$29/mo", features: ["Up to 50 staff", "Leave & events", "AI data summaries", "Announcements"], highlight: true },
  { name: "Enterprise", price: "Custom", features: ["Unlimited staff", "Telegram broadcast", "Priority support", "Custom roles"], highlight: false },
];

function Landing() {
  const { hasSession, currentUser } = useOFM();
  const navigate = useNavigate();

  useEffect(() => {
    if (hasSession && currentUser) navigate({ to: "/dashboard" });
  }, [hasSession, currentUser, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <img src={officeHubLogo} alt="OfficeHub" className="h-9 w-auto" />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#services" className="hover:text-foreground">Our Services</a>
            <a href="#about" className="hover:text-foreground">About</a>
            <a href="#packages" className="hover:text-foreground">Packages</a>
            <a href="#contact" className="hover:text-foreground">Contact Us</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link to="/auth">Start Your Project</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative flex min-h-[70vh] items-center bg-cover bg-center"
        style={{ backgroundImage: `url(${authBg})` }}
      >
        <div className="absolute inset-0 bg-background/75" />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-6 py-24 md:grid-cols-2">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Run your office, intelligently.
            </h1>
            <p className="text-lg text-muted-foreground dark:text-foreground/85">
              OfficeHub brings tasks, leave, attendance, events and an AI assistant into one
              clean workspace — with role-based access for admins, managers and staff.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Start Your Project</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#services">Explore Services</a>
              </Button>
            </div>
          </div>
          <div className="hidden md:block">
            <HeroAnimation />
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold">Our Services</h2>
          <p className="mt-2 text-muted-foreground">Everything your team needs to stay organized.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.title}>
              <CardHeader>
                <s.icon className="h-8 w-8 text-primary" />
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
      <section id="about" className="border-y bg-muted/40">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-20 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">About OfficeHub</h2>
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
              <Card key={stat.v}>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-primary">{stat.k}</div>
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
          <h2 className="text-3xl font-bold">Packages</h2>
          <p className="mt-2 text-muted-foreground">Choose the plan that fits your team.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {packages.map((p) => (
            <Card
              key={p.name}
              className={`transition-all duration-300 hover:-translate-y-2 hover:shadow-elegant hover:border-primary ${
                p.highlight ? "border-primary shadow-lg" : ""
              }`}
            >
              <CardHeader>
                {p.highlight && (
                  <span className="mb-2 inline-block w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                    Most popular
                  </span>
                )}
                <CardTitle className="text-xl">{p.name}</CardTitle>
                <div className="text-3xl font-bold">{p.price}</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full" variant={p.highlight ? "default" : "outline"}>
                  <Link to="/auth">Start Your Project</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Start your project CTA */}
      <section className="border-y bg-primary/5">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-3xl font-bold">Ready to get started?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Register your company or sign in as staff to access your dashboard.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/auth">Start Your Project</Link>
          </Button>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold">Contact Us</h2>
          <p className="mt-2 text-muted-foreground">We'd love to hear from you.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Mail, label: "Email", value: "marketing@officehubmm.com", href: "mailto:marketing@officehubmm.com" },
            { icon: Phone, label: "Phone", value: "+95 9 123 456 789", href: "tel:+959123456789" },
            { icon: MapPin, label: "Address", value: "Yangon, Myanmar", href: null },
          ].map((c) => {
            const inner = (
              <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <c.icon className="h-6 w-6" />
                </div>
                <div className="font-medium">{c.label}</div>
                <div className="break-all text-sm text-muted-foreground">{c.value}</div>
              </CardContent>
            );
            return (
              <Card
                key={c.label}
                className="group transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-elegant"
              >
                {c.href ? (
                  <a href={c.href} className="block">
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} OfficeHub Office Management System</span>
          <Link to="/auth" className="hover:text-foreground">Sign In</Link>
        </div>
      </footer>
    </div>
  );
}
