import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BroadcastInput = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(4000),
});

/**
 * Posts a published announcement to the company's Telegram group.
 * Bot token + chat id are read from the company row (RLS-scoped to the caller),
 * so credentials never have to be passed from the browser.
 */
export const broadcastAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => BroadcastInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: company, error } = await supabase
      .from("companies")
      .select("telegram_bot_token, telegram_chat_id")
      .maybeSingle();

    if (error) throw new Error(error.message);

    const token = company?.telegram_bot_token?.trim();
    const chatId = company?.telegram_chat_id?.trim();

    if (!token || !chatId) {
      return { sent: false, reason: "telegram_not_configured" as const };
    }

    const text = `📢 *${data.title}*\n\n${data.content}`;

    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "Markdown",
        }),
      });
      const body = (await res.json()) as { ok?: boolean; description?: string };
      if (!body.ok) {
        return { sent: false, reason: "telegram_error" as const, detail: body.description ?? "" };
      }
      return { sent: true as const };
    } catch (err) {
      return {
        sent: false,
        reason: "telegram_error" as const,
        detail: err instanceof Error ? err.message : "request failed",
      };
    }
  });
