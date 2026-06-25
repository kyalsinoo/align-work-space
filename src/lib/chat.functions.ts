import { createServerFn } from "@tanstack/react-start";
import { generateText, type ModelMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { getDepartmentContext } from "./department-context";
import { buildHolidayContext2026 } from "./myanmar-holidays-2026";

const ChatInput = z.object({
  role: z.enum(["admin", "manager", "sales", "developer"]),
  companyType: z.string().nullable().optional(),
  userName: z.string().optional(),
  wifiPassword: z.string().optional(),
  language: z.enum(["en", "my"]).optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
});

export const sendChat = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ChatInput.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const ctx = getDepartmentContext(data.role, data.companyType ?? null);

    const facts: string[] = [];
    if (data.userName) facts.push(`The current user's name is ${data.userName}.`);
    if (data.wifiPassword) facts.push(`The office Wi-Fi password is "${data.wifiPassword}".`);

    const system =
      ctx.systemPrompt +
      (facts.length ? `\n\nKnown office data:\n${facts.join("\n")}` : "") +
      `\n\n${buildHolidayContext2026()}` +
      `\n\nKeep replies concise and chat-friendly (use markdown when helpful).`;

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
      return { text, department: ctx.label };
    } catch (err) {
      const status = (err as { statusCode?: number; status?: number })?.statusCode ??
        (err as { status?: number })?.status;
      if (status === 429) {
        return { text: "I'm getting a lot of requests right now — please try again in a moment.", department: ctx.label, error: "rate_limit" as const };
      }
      if (status === 402) {
        return { text: "AI credits are exhausted. Please add credits in Settings → Plans & credits.", department: ctx.label, error: "credits" as const };
      }
      throw err;
    }
  });
