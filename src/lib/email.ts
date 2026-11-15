export type EmailDeliveryMode = "live" | "preview";

export interface SendEmailInput {
  to: string[];
  subject: string;
  text: string;
  html: string;
}

export interface SendEmailResult {
  status: "sent" | "preview" | "failed" | "skipped";
  detail: string;
}

/** Indicates whether outbound email credentials (Resend API) are configured. */
export function getEmailDeliveryMode(): EmailDeliveryMode {
  return process.env.RESEND_API_KEY?.trim() ? "live" : "preview";
}

/**
 * Dispatches a reminder email through Resend REST API when configured, or records
 * a clean sandbox preview when RESEND_API_KEY is absent so local/demo evaluation works offline.
 */
export async function sendReminderEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  if (input.to.length === 0) {
    return {
      status: "skipped",
      detail: "No email recipients configured for this reminder.",
    };
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      status: "preview",
      detail:
        "Preview recorded (configure RESEND_API_KEY to send live emails).",
    };
  }

  const from =
    process.env.REMINDER_FROM_EMAIL?.trim() ||
    "Tavya Care Circle <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
      signal: AbortSignal.timeout(8000),
    });

    const data = (await response.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };

    if (!response.ok) {
      return {
        status: "failed",
        detail: data.message
          ? `Resend HTTP ${response.status}: ${data.message}`
          : `Resend HTTP ${response.status}`,
      };
    }

    return {
      status: "sent",
      detail: data.id
        ? `Delivered via Resend (${data.id}).`
        : "Delivered via Resend.",
    };
  } catch (error) {
    return {
      status: "failed",
      detail:
        error instanceof Error
          ? error.message
          : "Network error dispatching reminder email.",
    };
  }
}
