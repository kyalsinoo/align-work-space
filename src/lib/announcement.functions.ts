import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BroadcastInput = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(4000),
});

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

/** Encode a UTF-8 RFC 2822 message as base64url for the Gmail API. */
function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(input, "utf-8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** RFC 2047 encode a header value so non-ASCII subjects render correctly. */
function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${toBase64Url(value).replace(/-/g, "+").replace(/_/g, "/")}?=`;
}

async function sendGmailToRecipients(
  recipients: string[],
  subject: string,
  bodyText: string,
): Promise<{ sent: boolean; reason?: string; detail?: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const gmailKey = process.env.GOOGLE_MAIL_API_KEY;
  if (!lovableKey || !gmailKey) {
    return { sent: false, reason: "email_not_configured" };
  }
  if (recipients.length === 0) {
    return { sent: false, reason: "no_recipients" };
  }

  // A single message with all addresses in Bcc keeps recipients private.
  const headers = [
    "To: undisclosed-recipients:;",
    `Bcc: ${recipients.join(", ")}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    bodyText,
  ].join("\r\n");

  try {
    const res = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmailKey,
      },
      body: JSON.stringify({ raw: toBase64Url(headers) }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { sent: false, reason: "email_error", detail: detail.slice(0, 300) };
    }
    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      reason: "email_error",
      detail: err instanceof Error ? err.message : "request failed",
    };
  }
}

/**
 * Broadcasts a published announcement to the company's Telegram group AND
 * emails every staff member in the company via the connected Gmail account.
 * Credentials are read server-side, never passed from the browser.
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

    // --- Telegram broadcast ---
    let telegramSent = false;
    let telegramReason: string | undefined;
    const token = company?.telegram_bot_token?.trim();
    const chatId = company?.telegram_chat_id?.trim();
    if (!token || !chatId) {
      telegramReason = "telegram_not_configured";
    } else {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `📢 *${data.title}*\n\n${data.content}`,
            parse_mode: "Markdown",
          }),
        });
        const body = (await res.json()) as { ok?: boolean; description?: string };
        telegramSent = !!body.ok;
        if (!body.ok) telegramReason = "telegram_error";
      } catch {
        telegramReason = "telegram_error";
      }
    }

    // --- Email broadcast to all staff ---
    const { data: profiles } = await supabase.from("profiles").select("email");
    const recipients = (profiles ?? [])
      .map((p) => (p.email ?? "").trim())
      .filter((e) => e.length > 0);
    const emailResult = await sendGmailToRecipients(
      recipients,
      `📢 ${data.title}`,
      `${data.content}\n\n— Sent via OfficeHub Announcements`,
    );

    return {
      // Backwards-compatible: `sent` reflects whether anything was broadcast.
      sent: telegramSent || emailResult.sent,
      reason: telegramSent ? undefined : telegramReason,
      telegram: { sent: telegramSent, reason: telegramReason },
      email: {
        sent: emailResult.sent,
        reason: emailResult.reason,
        count: emailResult.sent ? recipients.length : 0,
      },
    };
  });
