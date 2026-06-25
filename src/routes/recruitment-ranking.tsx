import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Sparkles,
  Send,
  Bot,
  User as UserIcon,
  Users,
  Trophy,
  Loader2,
  Plus,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useOFM } from "@/lib/ofm-store";
import {
  analyzeRecruitment,
  recruitmentChat,
} from "@/lib/recruitment.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/recruitment-ranking")({
  head: () => ({
    meta: [
      { title: "AI Candidate Ranking — OfficeHub System" },
      {
        name: "description",
        content:
          "HR recruitment engine that filters, scores, and ranks job applicants with AI.",
      },
    ],
  }),
  component: RecruitmentPage,
});

interface CandidateAnalysis {
  name: string;
  status: "Qualified" | "Review" | "Rejected";
  reason: string;
  score: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
  experienceYears: number;
  education: string;
  industry: string;
  jobTitles: string[];
  skills: string[];
  certifications: string[];
  projects: string;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  experienceGaps: string;
  educationMatch: string;
  recommendation: string;
}

interface CandidateInput {
  id: string;
  name: string;
  resume: string;
  fileName?: string;
  fileData?: string; // data URL
  mimeType?: string;
}

interface ChatMsg {
  id: string;
  from: "bot" | "user";
  text: string;
}

const CHAT_SUGGESTIONS = [
  "Who is the best candidate?",
  "Which candidates should be interviewed first?",
  "Which candidates lack required skills?",
  "Show only qualified candidates.",
];

function statusVariant(status: string): "default" | "secondary" | "destructive" {
  if (status === "Qualified") return "default";
  if (status === "Rejected") return "destructive";
  return "secondary";
}

function RecruitmentPage() {
  const { currentUser, loading, hasSession } = useOFM();
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeRecruitment);
  const chat = useServerFn(recruitmentChat);

  // Job form state
  const [title, setTitle] = useState("");
  const [requiredSkills, setRequiredSkills] = useState("");
  const [preferredSkills, setPreferredSkills] = useState("");
  const [minExperience, setMinExperience] = useState("0");
  const [requiredEducation, setRequiredEducation] = useState("");
  const [industry, setIndustry] = useState("");
  const [additional, setAdditional] = useState("");

  // Candidates
  const [candidates, setCandidates] = useState<CandidateInput[]>([
    { id: crypto.randomUUID(), name: "", resume: "" },
  ]);

  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<CandidateAnalysis[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);

  // Chat
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const chatScroll = useRef<HTMLDivElement>(null);

  // Auth guard — admin (owner) only.
  useEffect(() => {
    if (loading || hasSession || currentUser) return;
    const t = setTimeout(() => navigate({ to: "/" }), 1500);
    return () => clearTimeout(t);
  }, [currentUser, loading, hasSession, navigate]);

  useEffect(() => {
    chatScroll.current?.scrollTo({
      top: chatScroll.current.scrollHeight,
      behavior: "smooth",
    });
  }, [msgs, thinking]);

  if (loading || (hasSession && !currentUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (!currentUser) return null;

  if (currentUser.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-bold">Restricted</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The Recruitment Ranking engine is available to the company owner (HR / Admin) only.
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/dashboard" })}>Back to Dashboard</Button>
      </div>
    );
  }

  function parseList(v: string): string[] {
    return v
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function addCandidate() {
    setCandidates((p) => [...p, { id: crypto.randomUUID(), name: "", resume: "" }]);
  }
  function removeCandidate(id: string) {
    setCandidates((p) => (p.length > 1 ? p.filter((c) => c.id !== id) : p));
  }
  function updateCandidate(id: string, field: "name" | "resume", value: string) {
    setCandidates((p) => p.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function handleFile(id: string, file: File | null) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is too large (max 10MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCandidates((p) =>
        p.map((c) =>
          c.id === id
            ? {
                ...c,
                fileName: file.name,
                fileData: reader.result as string,
                mimeType: file.type || "application/octet-stream",
              }
            : c,
        ),
      );
    };
    reader.onerror = () => toast.error("Could not read the file.");
    reader.readAsDataURL(file);
  }

  function clearFile(id: string) {
    setCandidates((p) =>
      p.map((c) =>
        c.id === id
          ? { ...c, fileName: undefined, fileData: undefined, mimeType: undefined }
          : c,
      ),
    );
  }

  async function runAnalysis() {
    if (!title.trim()) {
      toast.error("Please enter a job title.");
      return;
    }
    const filled = candidates.filter((c) => c.fileData || c.resume.trim());
    if (filled.length === 0) {
      toast.error("Upload at least one candidate file.");
      return;
    }
    setRunning(true);
    setResults([]);
    setMsgs([]);
    try {
      const res = await analyze({
        data: {
          job: {
            title: title.trim(),
            requiredSkills: parseList(requiredSkills),
            preferredSkills: parseList(preferredSkills),
            minExperience: Number(minExperience) || 0,
            requiredEducation: requiredEducation.trim(),
            industry: industry.trim(),
            additionalRequirements: additional.trim(),
          },
          candidates: filled.map((c) => ({
            name: c.name.trim() || undefined,
            resume: c.resume.trim(),
            fileName: c.fileName,
            mimeType: c.mimeType,
            fileData: c.fileData,
          })),
        },
      });
      setResults(res.candidates);
      setJobId(res.jobId);
      toast.success("Analysis complete.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setRunning(false);
    }
  }

  async function sendChat(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking || !jobId) return;
    const userMsg: ChatMsg = { id: crypto.randomUUID(), from: "user", text: trimmed };
    setMsgs((p) => [...p, userMsg]);
    setChatInput("");
    const history = [...msgs, userMsg].map((m) => ({
      role: m.from === "user" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));
    setThinking(true);
    try {
      const res = await chat({ data: { jobId, messages: history } });
      setMsgs((p) => [...p, { id: crypto.randomUUID(), from: "bot", text: res.text }]);
    } catch {
      toast.error("AI is unavailable right now.");
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-4 py-3 sm:px-8">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/dashboard" })}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand">
            <Trophy className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">AI Candidate Ranking</h1>
            <p className="text-xs text-muted-foreground">
              Filter, score &amp; rank applicants
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="h-3.5 w-3.5" /> HR / Owner
        </Badge>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 sm:p-6 lg:grid-cols-5">
        {/* Left: job + candidates */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Job Requirements</CardTitle>
              <CardDescription>Define what the role needs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Job Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Frontend Developer"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Required Skills (comma or line separated)</Label>
                <Textarea
                  value={requiredSkills}
                  onChange={(e) => setRequiredSkills(e.target.value)}
                  placeholder="React, TypeScript, JavaScript, HTML, CSS"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preferred Skills</Label>
                <Textarea
                  value={preferredSkills}
                  onChange={(e) => setPreferredSkills(e.target.value)}
                  placeholder="Next.js, Tailwind CSS"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Min. Experience (yrs)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={minExperience}
                    onChange={(e) => setMinExperience(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Industry / Field</Label>
                  <Input
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Software Development"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Required Education</Label>
                <Input
                  value={requiredEducation}
                  onChange={(e) => setRequiredEducation(e.target.value)}
                  placeholder="Computer Science"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Additional Requirements</Label>
                <Textarea
                  value={additional}
                  onChange={(e) => setAdditional(e.target.value)}
                  placeholder="Any extra notes…"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Candidates</CardTitle>
                  <CardDescription>Paste each applicant's resume.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={addCandidate}>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidates.map((c, i) => (
                <div key={c.id} className="space-y-2 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={c.name}
                      onChange={(e) => updateCandidate(c.id, "name", e.target.value)}
                      placeholder={`Candidate ${i + 1} name (optional)`}
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeCandidate(c.id)}
                      aria-label="Remove candidate"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={c.resume}
                    onChange={(e) => updateCandidate(c.id, "resume", e.target.value)}
                    placeholder="Paste resume / CV text here…"
                    rows={4}
                  />
                </div>
              ))}
              <Button onClick={runAnalysis} disabled={running} className="w-full">
                {running ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Run AI Filtering &amp; Ranking
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: results + chat */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-primary" /> Ranking
              </CardTitle>
              <CardDescription>
                Candidates ranked highest to lowest. Unrelated fields are auto-rejected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-muted-foreground">
                  <Users className="h-8 w-8" />
                  Run an analysis to see ranked candidates here.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Candidate</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Exp.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((c, i) => (
                          <TableRow key={`${c.name}-${i}`}>
                            <TableCell className="font-semibold">{i + 1}</TableCell>
                            <TableCell className="font-medium">{c.name}</TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {c.status === "Rejected" ? "—" : `${c.score}%`}
                            </TableCell>
                            <TableCell>{c.experienceYears ?? 0}y</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Accordion type="single" collapsible className="mt-4">
                    {results.map((c, i) => (
                      <AccordionItem key={`detail-${c.name}-${i}`} value={`item-${i}`}>
                        <AccordionTrigger className="text-sm">
                          <span className="flex items-center gap-2 [overflow-wrap:anywhere]">
                            <Badge variant={statusVariant(c.status)} className="shrink-0">
                              {c.status === "Rejected" ? "✕" : `${c.score}%`}
                            </Badge>
                            {c.name}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 text-sm [overflow-wrap:anywhere]">
                          {c.status === "Rejected" && (
                            <p className="rounded-md bg-destructive/10 p-2 text-destructive">
                              <strong>Reason:</strong> {c.reason}
                            </p>
                          )}
                          {c.status !== "Rejected" && (
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="rounded-md bg-muted p-2">
                                <div className="font-bold">{c.skillsScore}/50</div>
                                Skills
                              </div>
                              <div className="rounded-md bg-muted p-2">
                                <div className="font-bold">{c.experienceScore}/30</div>
                                Experience
                              </div>
                              <div className="rounded-md bg-muted p-2">
                                <div className="font-bold">{c.educationScore}/20</div>
                                Education
                              </div>
                            </div>
                          )}
                          {c.strengths?.length > 0 && (
                            <div>
                              <p className="font-semibold">Strengths</p>
                              <ul className="ml-4 list-disc">
                                {c.strengths.map((s, k) => (
                                  <li key={k}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {c.weaknesses?.length > 0 && (
                            <div>
                              <p className="font-semibold">Weaknesses</p>
                              <ul className="ml-4 list-disc">
                                {c.weaknesses.map((s, k) => (
                                  <li key={k}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {c.missingSkills?.length > 0 && (
                            <p>
                              <span className="font-semibold">Missing Skills:</span>{" "}
                              {c.missingSkills.join(", ")}
                            </p>
                          )}
                          {c.experienceGaps && (
                            <p>
                              <span className="font-semibold">Experience Gaps:</span>{" "}
                              {c.experienceGaps}
                            </p>
                          )}
                          {c.educationMatch && (
                            <p>
                              <span className="font-semibold">Education:</span>{" "}
                              {c.educationMatch}
                            </p>
                          )}
                          {c.recommendation && (
                            <p className="rounded-md bg-primary/10 p-2">
                              <span className="font-semibold">Recommendation:</span>{" "}
                              {c.recommendation}
                            </p>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recruitment AI chat */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4 text-primary" /> Recruitment AI Chat
              </CardTitle>
              <CardDescription>
                Ask about your analyzed candidates.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {!jobId ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Run an analysis first, then chat about the results.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {CHAT_SUGGESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendChat(q)}
                        className="rounded-full border border-border bg-card px-3 py-1 text-xs transition-colors hover:bg-accent"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <div
                    ref={chatScroll}
                    className="max-h-80 space-y-4 overflow-y-auto rounded-lg border border-border p-3"
                  >
                    {msgs.length === 0 && (
                      <p className="py-4 text-center text-sm text-muted-foreground">
                        Ask "Who is the best candidate?" to get started.
                      </p>
                    )}
                    {msgs.map((m) => (
                      <div
                        key={m.id}
                        className={`flex gap-2 ${m.from === "user" ? "flex-row-reverse" : ""}`}
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            m.from === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-primary"
                          }`}
                        >
                          {m.from === "user" ? (
                            <UserIcon className="h-3.5 w-3.5" />
                          ) : (
                            <Bot className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div
                          className={`min-w-0 overflow-hidden rounded-2xl px-3 py-2 text-sm [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap ${
                            m.from === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
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
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChat(chatInput)}
                      placeholder="Ask about candidates…"
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      onClick={() => sendChat(chatInput)}
                      disabled={thinking || !chatInput.trim()}
                      aria-label="Send"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
