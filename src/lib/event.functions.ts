import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const EventInput = z.object({
  eventType: z.string().min(1),
  date: z.string().optional(),
  time: z.string().optional(),
  companyType: z.string().nullable().optional(),
});

export const generateEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => EventInput.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);

    const prompt = `Create an engaging office event announcement.
Event type: ${data.eventType}
${data.date ? `Date: ${data.date}` : ""}
${data.time ? `Time: ${data.time}` : ""}
${data.companyType ? `Company context: ${data.companyType}` : ""}

Produce:
- title: a short, catchy event title (max 8 words)
- description: a warm, inviting 2-3 sentence description relevant to the event
- imageKeywords: 1-3 lowercase comma-free keywords (single words separated by spaces) describing a fitting photo for this event`;

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({
          schema: z.object({
            title: z.string(),
            description: z.string(),
            imageKeywords: z.string(),
          }),
        }),
        prompt,
      });

      const keywords = output.imageKeywords.trim().split(/\s+/).slice(0, 3).join(",") || "celebration";
      const imageUrl = `https://loremflickr.com/800/450/${encodeURIComponent(keywords)}?lock=${Math.floor(Math.random() * 1000)}`;

      return { title: output.title, description: output.description, imageUrl };
    } catch (err) {
      const status =
        (err as { statusCode?: number })?.statusCode ?? (err as { status?: number })?.status;
      if (status === 429) throw new Error("AI is busy right now — please try again in a moment.");
      if (status === 402) throw new Error("AI credits are exhausted. Add credits in Settings → Plans & credits.");
      throw err;
    }
  });
