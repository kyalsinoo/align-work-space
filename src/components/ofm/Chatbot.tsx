import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOFM } from "@/lib/ofm-store";
import { toast } from "sonner";

type Msg =
  | { id: string; from: "bot" | "user"; text: string }
  | { id: string; from: "bot"; form: "leave" };

interface Props {
  variant?: "staff" | "manager" | "admin";
}

export function Chatbot({ variant = "staff" }: Props) {
  const { wifiPassword, currentUser, addLeave } = useOFM();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: "welcome",
      from: "bot",
      text:
        variant === "manager"
          ? "Hello Manager 👋 I can help with team activity, leave status and attendance. မြန်မာ သို့မဟုတ် English နဲ့ မေးနိုင်ပါတယ်။"
          : "Hi! I'm your office assistant 🤖 Ask me anything — e.g. \"What is the Wi-Fi password?\" or type \"Apply for Leave\" / \"ခွင့်တိုင်ချင်လို့\".",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  function push(m: Msg) {
    setMsgs((prev) => [...prev, m]);
  }

  function botReply(userText: string) {
    const t = userText.toLowerCase();
    const isMM = /[\u1000-\u109F]/.test(userText);

    if (t.includes("apply for leave") || userText.includes("ခွင့်တိုင်") || t.includes("leave form")) {
      push({ id: crypto.randomUUID(), from: "bot", text: isMM ? "ခွင့်တိုင်ဖောင်ကို အောက်မှာဖြည့်ပါ 👇" : "Sure! Please fill in the leave form below 👇" });
      push({ id: crypto.randomUUID(), from: "bot", form: "leave" });
      return;
    }
    if (t.includes("wifi") || t.includes("wi-fi") || t.includes("password") || userText.includes("ဝိုင်ဖိုင်") || userText.includes("စကားဝှက်")) {
      push({
        id: crypto.randomUUID(),
        from: "bot",
        text: isMM
          ? `ရုံး Wi-Fi စကားဝှက်က: ${wifiPassword} ဖြစ်ပါတယ်။`
          : `The office Wi-Fi password is: ${wifiPassword}`,
      });
      return;
    }
    if (t.includes("hello") || t.includes("hi") || userText.includes("မင်္ဂလာ")) {
      push({ id: crypto.randomUUID(), from: "bot", text: isMM ? "မင်္ဂလာပါ! ဘာကူညီပေးရမလဲ?" : "Hello! How can I help you today?" });
      return;
    }
    push({
      id: crypto.randomUUID(),
      from: "bot",
      text: isMM
        ? "နားမလည်လိုက်ပါ။ \"ဝိုင်ဖိုင် စကားဝှက်\" သို့မဟုတ် \"ခွင့်တိုင်ချင်လို့\" လို့ မေးကြည့်ပါ။"
        : "I can help with office Q&A and leave requests. Try \"What is the Wi-Fi password?\" or \"Apply for Leave\".",
    });
  }

  function handleSend() {
    if (!input.trim()) return;
    const text = input.trim();
    push({ id: crypto.randomUUID(), from: "user", text });
    setInput("");
    setTimeout(() => botReply(text), 350);
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-brand text-primary-foreground shadow-elegant transition-transform hover:scale-105"
          aria-label="Open assistant"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
          <div className="flex items-center justify-between bg-gradient-hero px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <div>
                <p className="text-sm font-semibold">Smart Assistant</p>
                <p className="text-[10px] opacity-80">English • မြန်မာ</p>
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
                  onSubmit={(name, reason) => {
                    addLeave({ name, reason });
                    toast.success("Leave request submitted to Manager");
                    push({ id: crypto.randomUUID(), from: "bot", text: `Thanks ${name}! Your leave request is now pending manager approval. ✅` });
                  }}
                />
              ) : (
                <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      m.from === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ),
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
            <Button size="icon" onClick={handleSend} aria-label="Send">
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
