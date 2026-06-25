import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, MessageCircle, Bookmark } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOFM } from "@/lib/ofm-store";
import { getDepartmentContext } from "@/lib/department-context";
import { sendChat } from "@/lib/chat.functions";
import { useSavedInsights } from "@/lib/saved-insights";
import { toast } from "sonner";

type Msg =
  | { id: string; from: "bot" | "user"; text: string }
  | { id: string; from: "bot"; form: "leave" };

interface Props {
  variant?: "staff" | "manager" | "admin";
}

// Anonymous, client-only profanity/negativity detection.
// No message, user ID, or flag is ever sent to or stored in the database.
const PROFANITY = [
  "fuck", "shit", "bitch", "asshole", "bastard", "dick", "cunt", "damn",
  "crap", "piss", "slut", "whore", "idiot", "stupid", "moron", "retard",
  "hate you", "shut up", "screw you", "dumbass", "jerk", "loser",
  "ကောင်မလေး", "ကောင်ဆိုး", "ဖင်", "ညစ်ညမ်း",
];

function containsProfanity(text: string): boolean {
  const t = text.toLowerCase();
  return PROFANITY.some((w) => {
    if (/[a-z]/.test(w)) {
      return new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(t);
    }
    return t.includes(w);
  });
}

export function Chatbot({ variant = "staff" }: Props) {
  const { wifiPassword, currentUser, company, addLeave } = useOFM();
  const { save: saveInsight } = useSavedInsights(currentUser?.id);
  const chat = useServerFn(sendChat);

  const dept = currentUser
    ? getDepartmentContext(currentUser.role, company?.type ?? null)
    : null;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: "welcome",
      from: "bot",
      text: dept
        ? `Hi ${currentUser?.name?.split(" ")[0] ?? ""}! I'm your **${dept.label}** assistant 🤖 Ask me anything about ${dept.domain} or office operations. Type "Apply for Leave" / "ခွင့်တိုင်ချင်လို့" to file leave. (English • မြန်မာ)`
        : "Hi! I'm your office assistant 🤖",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open, thinking]);

  function push(m: Msg) {
    setMsgs((prev) => [...prev, m]);
  }

  async function handleSend() {
    if (!input.trim() || thinking) return;
    const text = input.trim();

    // Client-side, anonymous profanity/negativity guard.
    // Nothing is logged, flagged, or persisted — handled instantly in the UI.
    if (containsProfanity(text)) {
      setInput("");
      push({
        id: crypto.randomUUID(),
        from: "bot",
        text: "Let's keep things professional and respectful here 🙏 I'm happy to help once we rephrase that. (သင့်လျော်စွာ ပြောဆိုပေးပါ။)",
      });
      return;
    }

    push({ id: crypto.randomUUID(), from: "user", text });
    setInput("");

    const t = text.toLowerCase();
    // Local interactive leave form trigger
    if (t.includes("apply for leave") || text.includes("ခွင့်တိုင်") || t.includes("leave form")) {
      const isMM = /[\u1000-\u109F]/.test(text);
      push({ id: crypto.randomUUID(), from: "bot", text: isMM ? "ခွင့်တိုင်ဖောင်ကို အောက်မှာဖြည့်ပါ 👇" : "Sure! Please fill in the leave form below 👇" });
      push({ id: crypto.randomUUID(), from: "bot", form: "leave" });
      return;
    }

    if (!currentUser) return;

    // Build conversation history for the AI (text messages only)
    const history = [...msgs, { id: "", from: "user", text } as Msg]
      .filter((m): m is Extract<Msg, { text: string }> => "text" in m && m.id !== "welcome")
      .map((m) => ({ role: m.from === "user" ? ("user" as const) : ("assistant" as const), content: m.text }));

    setThinking(true);
    try {
      const res = await chat({
        data: {
          role: currentUser.role,
          companyType: company?.type ?? null,
          userName: currentUser.name,
          wifiPassword,
          messages: history,
        },
      });
      push({ id: crypto.randomUUID(), from: "bot", text: res.text });
    } catch {
      toast.error("Assistant is unavailable right now. Please try again.");
      push({ id: crypto.randomUUID(), from: "bot", text: "Sorry, I couldn't reach the assistant. Please try again." });
    } finally {
      setThinking(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-brand text-brand-foreground shadow-elegant transition-transform hover:scale-105"
          aria-label="Open assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
          <div className="flex items-center justify-between bg-gradient-hero px-4 py-3 text-brand-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">{dept ? dept.label : "Smart Assistant"}</p>
                <p className="text-[10px] opacity-80">{dept ? `${dept.tagline} • English • မြန်မာ` : "English • မြန်မာ"}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.map((m) =>
              "form" in m ? (
                <LeaveForm
                  key={m.id}
                  defaultName={currentUser?.name ?? ""}
                  onSubmit={(name, reason, startDate, endDate, days) => {
                    addLeave({ name, reason, startDate, endDate, days });
                    toast.success("Leave request submitted to Manager");
                    push({ id: crypto.randomUUID(), from: "bot", text: `Thanks ${name}! Your **${days}-day** leave request (${startDate} → ${endDate}) is now pending manager approval. ✅` });
                  }}
                />
              ) : (
                <div key={m.id} className={`flex flex-col ${m.from === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`max-w-[85%] min-w-0 overflow-hidden rounded-2xl px-3 py-2 text-sm [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap ${
                      m.from === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.from === "user" ? (
                      m.text
                    ) : (
                      <div className="prose prose-sm dark:prose-invert max-w-none [overflow-wrap:anywhere] [&_code]:whitespace-pre-wrap [&_code]:[overflow-wrap:anywhere] [&_ol]:my-1 [&_p]:my-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-background/80 [&_pre]:p-3 [&_pre_code]:whitespace-pre [&_ul]:my-1">
                        <ReactMarkdown>{m.text}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                  {m.from === "bot" && m.id !== "welcome" && (
                    <button
                      onClick={() => {
                        saveInsight(m.text);
                        toast.success("Saved to your AI Insights");
                      }}
                      className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-primary"
                      aria-label="Save this reply"
                    >
                      <Bookmark className="h-3 w-3" /> Save
                    </button>
                  )}
                </div>
              ),
            )}
            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">Thinking…</div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button size="icon" onClick={handleSend} disabled={thinking} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function LeaveForm({ defaultName, onSubmit }: { defaultName: string; onSubmit: (name: string, reason: string) => void }) {
  const [name, setName] = useState(defaultName);
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return <div className="rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-xs text-foreground">Submitted ✓</div>;
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-background p-3">
      <p className="text-xs font-semibold text-foreground">Leave Request Form</p>
      <div className="space-y-1">
        <Label className="text-xs">Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Reason</Label>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="text-sm" placeholder="Reason for leave" />
      </div>
      <Button
        size="sm"
        className="w-full"
        disabled={!name.trim() || !reason.trim()}
        onClick={() => {
          onSubmit(name.trim(), reason.trim());
          setDone(true);
        }}
      >
        Submit
      </Button>
    </div>
  );
}
