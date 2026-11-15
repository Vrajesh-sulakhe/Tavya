"use client";

import { useState } from "react";
import { Database, EnvelopeSimple, PaperPlaneTilt } from "@phosphor-icons/react";
import type { EmailLogEntry } from "@/domain/types";
import { BezelCard } from "../ui/BezelCard";
import { Reveal } from "../ui/Reveal";

interface EmailRemindersOutboxPanelProps {
  emailDelivery: "live" | "preview";
  persistence: "durable" | "ephemeral";
  emailLog: EmailLogEntry[];
  isCaretaker: boolean;
  onRunReminders?: () => Promise<string>;
}

const EMAIL_STATUS_BADGE: Record<string, string> = {
  sent: "bg-[#E6F3EE] text-[#0F6B54]",
  preview: "bg-[#FEF3C7] text-[#92400E]",
  failed: "bg-[#FEE4E2] text-[#7A1B14]",
  skipped: "bg-[#F2EDE3] text-[#46534C]",
};

export function EmailRemindersOutboxPanel({
  emailDelivery,
  persistence,
  emailLog,
  isCaretaker,
  onRunReminders,
}: EmailRemindersOutboxPanelProps) {
  const [runningReminders, setRunningReminders] = useState(false);
  const [reminderStatus, setReminderStatus] = useState("");

  async function handleTriggerReminders() {
    if (!onRunReminders) return;
    setRunningReminders(true);
    try {
      setReminderStatus(await onRunReminders());
    } finally {
      setRunningReminders(false);
    }
  }

  return (
    <Reveal delayMs={180}>
      <section aria-labelledby="email-outbox-heading" className="no-print">
        <BezelCard innerClassName="p-5 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <EnvelopeSimple
                  size={22}
                  weight="light"
                  className="text-[#0F6B54]"
                  aria-hidden="true"
                />
                <h2
                  id="email-outbox-heading"
                  className="font-display text-3xl text-[#141D19]"
                >
                  Email Reminders &amp; Outbox
                </h2>
              </div>
              <p className="mt-1 text-sm text-[#46534C]">
                Automated checks email circle members for upcoming doses, missed
                dose windows, and appointments within 24 hours.
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDFBF7] px-3 py-1 text-[#141D19] ring-1 ring-[#141D19]/10">
                  <EnvelopeSimple size={14} weight="light" aria-hidden="true" />
                  <span>
                    Delivery:{" "}
                    {emailDelivery === "live"
                      ? "Resend Live API"
                      : "Outbox Preview"}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDFBF7] px-3 py-1 text-[#141D19] ring-1 ring-[#141D19]/10">
                  <Database size={14} weight="light" aria-hidden="true" />
                  <span>
                    Storage:{" "}
                    {persistence === "durable"
                      ? "Upstash Redis Durable"
                      : "Local Ephemeral Disk"}
                  </span>
                </span>
              </div>
            </div>

            {isCaretaker && onRunReminders ? (
              <button
                type="button"
                disabled={runningReminders}
                onClick={handleTriggerReminders}
                className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#141D19] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#27352E] disabled:opacity-60"
              >
                <PaperPlaneTilt size={16} weight="light" aria-hidden="true" />
                <span>
                  {runningReminders
                    ? "Checking Due Reminders…"
                    : "Send Due Reminders Now"}
                </span>
              </button>
            ) : null}
          </div>

          {reminderStatus ? (
            <p
              role="status"
              className="mt-4 rounded-2xl bg-[#E6F3EE] px-4 py-2.5 text-sm font-medium text-[#0F6B54]"
            >
              {reminderStatus}
            </p>
          ) : null}

          <div className="mt-5 space-y-2.5">
            {emailLog.length === 0 ? (
              <p className="rounded-2xl bg-[#FDFBF7] px-4 py-4 text-sm text-[#617068]">
                No reminder emails queued yet for today&apos;s window. Use
                &ldquo;Send Due Reminders Now&rdquo; to evaluate active slots
                and upcoming appointments.
              </p>
            ) : (
              emailLog.slice(0, 12).map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col justify-between gap-2 rounded-2xl bg-[#FDFBF7] p-3.5 ring-1 ring-[#141D19]/[0.07] sm:flex-row sm:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                          EMAIL_STATUS_BADGE[entry.status] ??
                          "bg-[#F2EDE3] text-[#46534C]"
                        }`}
                      >
                        {entry.status}
                      </span>
                      <span className="text-sm font-semibold text-[#141D19]">
                        {entry.subject}
                      </span>
                    </div>
                    <p className="font-mono-num mt-1 text-xs text-[#46534C]">
                      To: {entry.recipients.join(", ")}
                      {entry.detail ? ` · ${entry.detail}` : ""}
                    </p>
                  </div>
                  <span className="font-mono-num shrink-0 text-[11px] text-[#617068]">
                    {entry.createdAt.slice(0, 16).replace("T", " ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </BezelCard>
      </section>
    </Reveal>
  );
}
