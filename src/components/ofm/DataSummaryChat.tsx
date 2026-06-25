import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOFM, type Role } from "@/lib/ofm-store";
import { summarizeData } from "@/lib/data-summary.functions";
import { toast } from "sonner";

interface Msg {
  id: string;
  from: "bot" | "user";
  text: string;
}

const ELEVATED_PROMPTS = [
  "ယခုတစ်ပတ် ကုမ္ပဏီ Summary ပြပေးပါ",
  "လက်ရှိ ခွင့်ယူထားသူများ ဘယ်သူတွေလဲ",
  "ဒီလ ခွင့်အများဆုံး တိုင်ကြားသူ ဘယ်သူလဲ",
];

const STAFF_PROMPTS = [
  "ဒီတစ်ပတ်ပြီးခဲ့တဲ့ Task များ ပြပေးပါ",
  "ဒီလ ကျွန်တော် ခွင့်ဘယ်နှစ်ရက်ယူခဲ့လဲ",
];

export function DataSummaryChat({ role }: { role: Role }) {
  const { currentUser } = useOFM();
  const summarize = useServerFn(summarizeData);
  const isElevated = role === "admin" || role === "manager";
  const quick = isElevated ? ELEVATED_PROMPTS : STAFF_PROMPTS;

  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: "welcome",
      from: "bot",
      text: `မင်္ဂလာပါ ${currentUser?.name?.split(" ")[0] ?? ""}! ကျွန်တော်က **OfficeHub AI Data Assistant** ပါ။ သင့်ရဲ့ Task နှင့် ခွင့်ဆိုင်ရာ အချက်အလက်များကို မြန်မာဘာသာဖြင့် အကျဉ်းချုပ် တင်ပြပေးနိုင်ပါတယ်။ အောက်က အကြံပြုချက်များကို နှိပ်၍ဖြစ်စေ၊ မိမိဘာသာ မေးမြန်း၍ဖြစ်စေ စတင်နိုင်ပါတယ်။`,
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  async function ask(text: string) {
    if (!text.trim() || thinking) return;
    const userMsg: Msg = { id: crypto.randomUUID(), from: "user", text: text.trim() };
    setMsgs((p) => [...p, userMsg]);
    setInput("");

    const history = [...msgs, userMsg]
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.from === "user" ? ("user" as const) : ("assistant" as const), content: m.text }));

    setThinking(true);
    try {
      const res = await summarize({ data: { messages: history } });
      setMsgs((p) => [...p, { id: crypto.randomUUID(), from: "bot", text: res.text }]);
    } catch {
      toast.error("Assistant is unavailable right now. Please try again.");
      setMsgs((p) => [
        ...p,
        { id: crypto.randomUUID(), from: "bot", text: "တောင်းပန်ပါတယ်၊ အချက်အလက် မရယူနိုင်ခဲ့ပါ။ ပြန်ကြိုးစားပေးပါ။" },
      ]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Data Summary</h1>
          <p className="text-sm text-muted-foreground">
            မြန်မာဘာသာဖြင့် အချက်အလက် အကျဉ်းချုပ် — Read-only assistant
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          {isElevated ? "Company-wide" : "Personal only"}
        </Badge>
      </div>

      <Card className="flex h-[60vh] flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {msgs.map((m) => (
            <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] min-w-0 overflow-hidden rounded-2xl px-3.5 py-2.5 text-sm [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap ${
                  m.from === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {m.from === "user" ? (
                  m.text
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none [overflow-wrap:anywhere] [&_li]:my-0.5 [&_p]:my-1 [&_ul]:my-1">
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">တွက်ချက်နေပါသည်…</div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {quick.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                disabled={thinking}
                className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3 text-primary" /> {q}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(input)}
              placeholder="အချက်အလက် မေးမြန်းရန်…"
              className="flex-1"
            />
            <Button size="icon" onClick={() => ask(input)} disabled={thinking} aria-label="Send">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
