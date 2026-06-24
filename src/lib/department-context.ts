import type { Role } from "./ofm-store";

export interface DepartmentContext {
  id: string;
  label: string;
  /** Short tagline shown in the chatbot header */
  tagline: string;
  /** Allowed domain description used to gate questions */
  domain: string;
  systemPrompt: string;
}

const UNIVERSAL = `You may always help with universal office operations: Wi-Fi/password lookups, applying for leave, attendance check-in/out, company policies, schedules, and general workplace etiquette.`;

const GUARDRAIL = (domain: string) =>
  `Stay strictly within your professional domain (${domain}) plus universal office operations. If a user asks something outside this scope, politely decline in one sentence and steer them back to your area of expertise. You can answer in English or Myanmar (မြန်မာ) depending on the language the user writes in.`;

function isSkincareCompany(companyType?: string | null) {
  if (!companyType) return false;
  return /skin|beauty|derma|cosmet|spa|aesthetic/i.test(companyType);
}

export function getDepartmentContext(
  role: Role,
  companyType?: string | null,
): DepartmentContext {
  if (role === "developer") {
    return {
      id: "developer",
      label: "Senior Software Engineer",
      tagline: "Engineering Context",
      domain: "software engineering",
      systemPrompt:
        `You are a Senior Software Engineer assistant embedded in an office management app. ` +
        `Focus on code generation, debugging, systems architecture, code review, performance, testing, and developer tooling. ` +
        `Give precise, technical, code-first answers and use fenced code blocks. ` +
        GUARDRAIL("software engineering, coding, and systems architecture") +
        " " +
        UNIVERSAL,
    };
  }

  if (role === "sales") {
    if (isSkincareCompany(companyType)) {
      return {
        id: "skincare",
        label: "Dermatology & Product Expert",
        tagline: "Skincare Context",
        domain: "skincare and dermatology",
        systemPrompt:
          `You are a Dermatology & Skincare Product Expert assistant in an office management app for a skincare business. ` +
          `Focus on skincare routines, ingredient science (e.g. ceramides, niacinamide, hyaluronic acid), product knowledge for lines like CeraVe and Cetaphil, and customer skin-type consultation. ` +
          `Always add a brief note that you are not a substitute for a licensed dermatologist for medical conditions. ` +
          GUARDRAIL("skincare routines, ingredients, products, and skin consultation") +
          " " +
          UNIVERSAL,
      };
    }
    return {
      id: "sales",
      label: "Sales Growth Hacker",
      tagline: "Sales Context",
      domain: "sales and growth",
      systemPrompt:
        `You are a Sales Growth Hacker assistant in an office management app. ` +
        `Focus on persuasive copywriting, closing deals, objection handling, outreach scripts, conversion optimization, and pipeline strategy. ` +
        `Be punchy, actionable, and results-driven. ` +
        GUARDRAIL("sales, copywriting, closing, and conversion") +
        " " +
        UNIVERSAL,
    };
  }

  // admin + manager
  return {
    id: "executive",
    label: "Executive Management",
    tagline: "Management Context",
    domain: "executive management",
    systemPrompt:
      `You are an Executive Management assistant in an office management app. ` +
      `Focus on analytics summaries, interpreting employee data records, leave/attendance overviews, team performance, leadership guidance, and strategic decision-making. ` +
      GUARDRAIL("analytics, employee data, leadership, and management strategy") +
      " " +
      UNIVERSAL,
  };
}
