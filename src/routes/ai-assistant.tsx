import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Sparkles, ShieldCheck, Bot, User as UserIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOFM } from "@/lib/ofm-store";
import { askAssistant } from "@/lib/ai-assistant.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/ai-assistant")({
  head: () => ({
    meta: [{ title: "AI Assistant — OfficeHub System" }],
  }),
  component: AIAssistantPage,
});

interface Msg {
  id: string;
  from: "bot" | "user";
  text: string;
  at: number;
}

const STAFF_SUGGESTIONS = [
  "How many leave days do I have left?",
  "Show my attendance this month.",
  "What tasks are due this week?",
  "What company events are upcoming?",
  "Generate a leave request form.",
];

const ELEVATED_SUGGESTIONS = [
  "Which employee completed the most tasks?",
  "Who has attendance issues?",
  "Show late arrivals this month.",
  "Which employee is performing best?",
  "Summarize company performance.",
];

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AIAssistantPage() {
  const { currentUser, loading, hasSession } = useOFM();
  const navigate = useNavigate();
  const ask = useServerFn(askAssistant);

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [language, setLanguage] = useState<"en" | "my">("en");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth guard — mirror the dashboard route's grace-period redirect.
  useEffect(() => {
    if (loading || hasSession || currentUser) return;
    const t = setTimeout(() => navigate({ to: "/" }), 1500);
    return () => clearTimeout(t);
  }, [currentUser, loading, hasSession, navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  if (loading || (hasSession && !currentUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (!currentUser) return null;

  const isElevated = currentUser.role === "admin" || currentUser.role === "manager";
  const suggestions = isElevated ? ELEVATED_SUGGESTIONS : STAFF_SUGGESTIONS;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const userMsg: Msg = { id: crypto.randomUUID(), from: "user", text: trimmed, at: Date.now() };
    setMsgs((p) => [...p, userMsg]);
    setInput("");

    const history = [...msgs, userMsg].map((m) => ({
      role: m.from === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));

    setThinking(true);
    try {
      const res = await ask({ data: { messages: history } });
      setMsgs((p) => [...p, { id: crypto.randomUUID(), from: "bot", text: res.text, at: Date.now() }]);
    } catch {
      toast.error("Assistant is unavailable right now. Please try again.");
      setMsgs((p) => [
        ...p,
        {
          id: crypto.randomUUID(),
          from: "bot",
          text: "Sorry, I couldn't reach the assistant. Please try again.",
          at: Date.now(),
        },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/dashboard" })} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Ask about your work data</p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          {isElevated ? "Company-wide" : "Personal only"}
        </Badge>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="mx-auto w-full max-w-3xl flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-brand">
              <Bot className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Hi {currentUser.name.split(" ")[0]} 👋</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                I can answer questions based on your role and company data.
              </p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-left text-sm transition-colors hover:bg-accent"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-primary" />
                  <span className="[overflow-wrap:anywhere]">{q}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m) => (
          <div key={m.id} className={`flex gap-3 ${m.from === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                m.from === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
              }`}
            >
              {m.from === "user" ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={`flex max-w-[85%] flex-col ${m.from === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`min-w-0 overflow-hidden rounded-2xl px-3.5 py-2.5 text-sm [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap ${
                  m.from === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {m.from === "user" ? (
                  m.text
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none [overflow-wrap:anywhere] [&_li]:my-0.5 [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-background [&_pre]:p-3 [&_table]:block [&_table]:overflow-x-auto [&_ul]:my-1">
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                )}
              </div>
              <span className="mt-1 px-1 text-[10px] text-muted-foreground">{formatTime(m.at)}</span>
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-muted-foreground">Thinking…</div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border bg-card p-3 sm:p-4">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask the AI Assistant…"
            className="flex-1"
          />
          <Button size="icon" onClick={() => send(input)} disabled={thinking || !input.trim()} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
