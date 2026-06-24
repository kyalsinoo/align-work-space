import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const EventInput = z.object({
  eventType: z.string().min(1),
  date: z.string().optional(),
  time: z.string().optional(),
  companyType: z.string().nullable().optional(),
  details: z.string().optional(),
  language: z.enum(["en", "my"]).optional(),
  imageDataUrl: z.string().optional(),
});

export const generateEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => EventInput.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);

    const langInstruction =
      data.language === "my"
        ? "Write BOTH the title and description in Burmese (Myanmar language)."
        : "Write the title and description in English.";

    const promptText = `Create an engaging office event announcement.
Event type: ${data.eventType}
${data.date ? `Date: ${data.date}` : ""}
${data.time ? `Time: ${data.time}` : ""}
${data.companyType ? `Company context: ${data.companyType}` : ""}
${data.details ? `Extra context / notes from the admin: ${data.details}` : ""}
${data.imageDataUrl ? "An admin-uploaded reference image is attached — use it to craft a fitting title and description." : ""}

${langInstruction}

Produce:
- title: a short, catchy event title (max 8 words)
- description: a warm, inviting 2-3 sentence description relevant to the event
- imageKeywords: 1-3 lowercase comma-free keywords in ENGLISH (single words separated by spaces) describing a fitting photo for this event`;

    try {
      const messages = data.imageDataUrl
        ? [
            {
              role: "user" as const,
              content: [
                { type: "text" as const, text: promptText },
                { type: "image" as const, image: data.imageDataUrl },
              ],
            },
          ]
        : undefined;

      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({
          schema: z.object({
            title: z.string(),
            description: z.string(),
            imageKeywords: z.string(),
          }),
        }),
        ...(messages ? { messages } : { prompt: promptText }),
      });

      // Prefer the admin-uploaded image when provided; otherwise build one from keywords.
      const keywords = output.imageKeywords.trim().split(/\s+/).slice(0, 3).join(",") || "celebration";
      const imageUrl =
        data.imageDataUrl ||
        `https://loremflickr.com/800/450/${encodeURIComponent(keywords)}?lock=${Math.floor(Math.random() * 1000)}`;

      return { title: output.title, description: output.description, imageUrl };
    } catch (err) {
      const status =
        (err as { statusCode?: number })?.statusCode ?? (err as { status?: number })?.status;
      if (status === 429) throw new Error("AI is busy right now — please try again in a moment.");
      if (status === 402) throw new Error("AI credits are exhausted. Add credits in Settings → Plans & credits.");
      throw err;
    }
  });
