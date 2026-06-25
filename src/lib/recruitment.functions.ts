import { createServerFn } from "@tanstack/react-start";
import { generateText, type ModelMessage } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

// ---------------------------------------------------------------------------
// Shared schemas
// ---------------------------------------------------------------------------
const JobInput = z.object({
  title: z.string().min(1).max(200),
  requiredSkills: z.array(z.string().min(1).max(80)).max(50),
  preferredSkills: z.array(z.string().min(1).max(80)).max(50),
  minExperience: z.number().int().min(0).max(50),
  requiredEducation: z.string().max(200).default(""),
  industry: z.string().max(200).default(""),
  additionalRequirements: z.string().max(2000).default(""),
});

const AnalyzeInput = z.object({
  job: JobInput,
  candidates: z
    .array(
      z.object({
        name: z.string().max(200).optional(),
        // Either pasted text OR an uploaded file (image/PDF/text) as a data URL.
        resume: z.string().max(12000).default(""),
        fileName: z.string().max(300).optional(),
        mimeType: z.string().max(120).optional(),
        // data URL: "data:<mime>;base64,...."  (capped ~10MB encoded)
        fileData: z.string().max(14_000_000).optional(),
      }),
    )
    .min(1)
    .max(25)
    .refine((arr) => arr.every((c) => c.resume.trim() || c.fileData), {
      message: "Each candidate needs resume text or an uploaded file.",
    }),
});

const ChatInput = z.object({
  jobId: z.string().uuid(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(30),
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

async function assertAdmin(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<string> {
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role, company_id")
    .eq("user_id", userId);
  const rows = (roleRows ?? []) as { role: string; company_id: string }[];
  const adminRow = rows.find((r) => r.role === "admin");
  if (!adminRow) {
    throw new Error("Only the company owner (admin) can use the recruitment engine.");
  }
  return adminRow.company_id;
}

function extractJson(text: string): unknown {
  // Strip markdown fences if present, then find the first JSON value.
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) throw new Error("No JSON found in AI response");
  const slice = cleaned.slice(start);
  return JSON.parse(slice);
}

// ---------------------------------------------------------------------------
// Analyze: filter, score, rank candidates against a job, then persist.
// ---------------------------------------------------------------------------
export const analyzeRecruitment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => AnalyzeInput.parse(data))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { supabase, userId } = context;
    const companyId = await assertAdmin(supabase, userId);

    const { job, candidates } = data;

    const system =
      `You are a senior HR recruiter and talent evaluator. Analyze candidates strictly against the job requirements.\n\n` +
      `PROCESS (mandatory, in order):\n` +
      `1. FIELD RELEVANCE FILTER FIRST. Decide if the candidate belongs to the relevant professional field for this job. ` +
      `If the candidate comes from an unrelated field (e.g. a Web Developer applying for a Marketing Manager role), set status="Rejected" and reason to a short field-mismatch explanation, and set score=0. DO NOT score unrelated candidates.\n` +
      `2. Only score candidates that pass the field filter. Score out of 100 using EXACT weights:\n` +
      `   - Skills match = 50 (skillsScore: 0-50)\n` +
      `   - Experience match = 30 (experienceScore: 0-30)\n` +
      `   - Education match = 20 (educationScore: 0-20)\n` +
      `   score MUST equal skillsScore + experienceScore + educationScore.\n` +
      `3. Status rules for scored candidates: score >= 75 => "Qualified"; 50-74 => "Review"; < 50 => "Rejected".\n` +
      `4. Prioritize in this order: industry relevance, required skills, work experience, education.\n\n` +
      `For EACH candidate extract real data from the resume: name, skills, experienceYears (number), jobTitles, industry, education, certifications, projects.\n` +
      `Then provide: strengths[], weaknesses[], missingSkills[], experienceGaps, educationMatch, recommendation.\n\n` +
      `Return ONLY a JSON array (no prose, no markdown) where each item matches:\n` +
      `{"name","status","reason","score","skillsScore","experienceScore","educationScore","experienceYears","education","industry","jobTitles":[],"skills":[],"certifications":[],"projects","strengths":[],"weaknesses":[],"missingSkills":[],"experienceGaps","educationMatch","recommendation"}`;

    const userPrompt =
      `JOB REQUIREMENTS:\n${JSON.stringify(job)}\n\n` +
      `CANDIDATES (resume text):\n` +
      candidates
        .map(
          (c, i) =>
            `--- Candidate ${i + 1}${c.name ? ` (${c.name})` : ""} ---\n${c.resume}`,
        )
        .join("\n\n");

    const gateway = createLovableAiGatewayProvider(key);
    let parsed: CandidateAnalysis[];
    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt: userPrompt,
      });
      const json = extractJson(text);
      parsed = (Array.isArray(json) ? json : [json]) as CandidateAnalysis[];
    } catch (err) {
      const status =
        (err as { statusCode?: number })?.statusCode ??
        (err as { status?: number })?.status;
      if (status === 429) throw new Error("AI is busy — please try again shortly.");
      if (status === 402)
        throw new Error("AI credits exhausted. Add credits in Settings → Plans & credits.");
      throw new Error("AI analysis failed. Please try again.");
    }

    // Persist: create the job, then replace candidate rows.
    const { data: jobRow, error: jobErr } = await supabase
      .from("recruitment_jobs")
      .insert({
        company_id: companyId,
        title: job.title,
        required_skills: job.requiredSkills,
        preferred_skills: job.preferredSkills,
        min_experience: job.minExperience,
        required_education: job.requiredEducation,
        industry: job.industry,
        additional_requirements: job.additionalRequirements,
        created_by: userId,
      })
      .select("id")
      .single();
    if (jobErr || !jobRow) throw new Error("Could not save the job opening.");

    const rows = parsed.map((a) => ({
      company_id: companyId,
      job_id: jobRow.id,
      name: a.name || "Unknown",
      profile: {
        experienceYears: a.experienceYears ?? 0,
        education: a.education ?? "",
        industry: a.industry ?? "",
        jobTitles: a.jobTitles ?? [],
        skills: a.skills ?? [],
        certifications: a.certifications ?? [],
        projects: a.projects ?? "",
      },
      analysis: JSON.parse(JSON.stringify(a)),
      status: a.status ?? "Review",
      score: Math.max(0, Math.min(100, Math.round(a.score ?? 0))),
    }));
    await supabase.from("recruitment_candidates").insert(rows);

    // Return ranked (highest score first; rejected sink to the bottom).
    const ranked = [...parsed].sort((x, y) => (y.score ?? 0) - (x.score ?? 0));
    return { jobId: jobRow.id as string, candidates: ranked };
  });

// ---------------------------------------------------------------------------
// List previously analyzed jobs for the company.
// ---------------------------------------------------------------------------
export const listRecruitmentJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data } = await supabase
      .from("recruitment_jobs")
      .select("id, title, industry, created_at")
      .order("created_at", { ascending: false });
    return { jobs: data ?? [] };
  });

// ---------------------------------------------------------------------------
// Load one job's ranked candidates.
// ---------------------------------------------------------------------------
export const getRecruitmentJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data: cand } = await supabase
      .from("recruitment_candidates")
      .select("analysis, score")
      .eq("job_id", data.jobId)
      .order("score", { ascending: false });
    const candidates = (cand ?? []).map((c) => c.analysis as unknown as CandidateAnalysis);
    return { candidates };
  });

// ---------------------------------------------------------------------------
// Recruitment-specific AI chat (read-only over stored analysis).
// ---------------------------------------------------------------------------
export const recruitmentChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ChatInput.parse(data))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const [{ data: jobRow }, { data: cand }] = await Promise.all([
      supabase
        .from("recruitment_jobs")
        .select(
          "title, required_skills, preferred_skills, min_experience, required_education, industry, additional_requirements",
        )
        .eq("id", data.jobId)
        .maybeSingle(),
      supabase
        .from("recruitment_candidates")
        .select("analysis, score, status")
        .eq("job_id", data.jobId)
        .order("score", { ascending: false }),
    ]);

    const dataContext = {
      job: jobRow ?? {},
      candidates: (cand ?? []).map((c) => c.analysis),
    };

    const system =
      `You are an experienced HR recruiter assistant. Answer ONLY using the provided candidate analysis JSON. ` +
      `Never invent candidates or data. If asked who is the best candidate, use the highest score among non-rejected candidates. ` +
      `Explain rejections using each candidate's "reason". When comparing candidates, contrast their scores, skills, experience, and education. ` +
      `Use clear, professional English with bullet points and bold key metrics.\n\n` +
      `DATA (read-only):\n${JSON.stringify(dataContext)}`;

    const gateway = createLovableAiGatewayProvider(key);
    const messages: ModelMessage[] = data.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        messages,
      });
      return { text };
    } catch (err) {
      const status =
        (err as { statusCode?: number })?.statusCode ??
        (err as { status?: number })?.status;
      if (status === 429) return { text: "AI is busy — please try again shortly." };
      if (status === 402)
        return { text: "AI credits exhausted. Add credits in Settings → Plans & credits." };
      throw err;
    }
  });
