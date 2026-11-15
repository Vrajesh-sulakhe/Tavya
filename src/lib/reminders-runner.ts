import { randomUUID } from "node:crypto";
import { computeDueReminders } from "@/domain/reminders";
import type { EmailLogEntry } from "@/domain/types";
import { sendReminderEmail } from "./email";
import { mutateStore, readStore } from "./store";

export interface ReminderRunSummary {
  checkedAt: string;
  processedCount: number;
  sentCount: number;
  previewCount: number;
  failedCount: number;
  entries: EmailLogEntry[];
}

/**
 * Evaluates due upcoming-dose, missed-dose, and 24h appointment reminders,
 * dispatches them via Resend (or preview log offline), and deduplicates results.
 */
export async function executeRemindersRun(
  now: Date = new Date()
): Promise<ReminderRunSummary> {
  const store = await readStore();
  const due = computeDueReminders(store, now);

  if (due.length === 0) {
    return {
      checkedAt: now.toISOString(),
      processedCount: 0,
      sentCount: 0,
      previewCount: 0,
      failedCount: 0,
      entries: [],
    };
  }

  const deliveryResults = await Promise.all(
    due.map(async (item) => {
      const outcome = await sendReminderEmail({
        to: item.recipients,
        subject: item.subject,
        text: item.text,
        html: item.html,
      });
      return { item, outcome };
    })
  );

  const createdEntries: EmailLogEntry[] = deliveryResults.map(
    ({ item, outcome }) => ({
      id: `mail-${randomUUID().slice(0, 8)}`,
      dedupeKey: item.dedupeKey,
      kind: item.kind,
      subject: item.subject,
      recipients: item.recipients,
      status: outcome.status,
      detail: outcome.detail,
      createdAt: now.toISOString(),
    })
  );

  await mutateStore((draft) => {
    const existingKeys = new Set(
      (draft.emailLog ?? []).map((entry) => entry.dedupeKey)
    );
    const freshEntries = createdEntries.filter(
      (entry) => !existingKeys.has(entry.dedupeKey)
    );

    const existingAlerts = new Set(draft.alerts.map((a) => `${a.category}:${a.title}`));
    const missedAlerts = deliveryResults
      .filter(
        ({ item, outcome }) =>
          item.kind === "missed_dose" &&
          (outcome.status === "sent" || outcome.status === "preview") &&
          !existingAlerts.has(`missed_dose:${item.summaryTitle}`)
      )
      .map(({ item }) => ({
        id: `alert-${randomUUID().slice(0, 8)}`,
        severity: "warning" as const,
        category: "missed_dose" as const,
        title: item.summaryTitle,
        detail: item.summaryDetail,
        createdAt: now.toISOString(),
      }));

    return {
      ...draft,
      emailLog: [...freshEntries, ...(draft.emailLog ?? [])].slice(0, 60),
      alerts: [...missedAlerts, ...draft.alerts].slice(0, 20),
    };
  });

  return {
    checkedAt: now.toISOString(),
    processedCount: createdEntries.length,
    sentCount: createdEntries.filter((e) => e.status === "sent").length,
    previewCount: createdEntries.filter((e) => e.status === "preview").length,
    failedCount: createdEntries.filter((e) => e.status === "failed").length,
    entries: createdEntries,
  };
}
