import { formatDateKey, groupMedicationsBySlot, SLOT_META, SLOT_ORDER } from "./schedule";
import type { ReminderKind, TavyaStoreData } from "./types";

export interface DueReminder {
  dedupeKey: string;
  kind: ReminderKind;
  subject: string;
  text: string;
  html: string;
  recipients: string[];
  summaryTitle: string;
  summaryDetail: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function uniqueEmails(emails: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const email of emails) {
    const trimmed = email?.trim().toLowerCase();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Computes deduplicated upcoming dose, missed dose, and 24-hour appointment
 * reminder emails using current time, schedule slots, and senior consent.
 */
export function computeDueReminders(
  store: TavyaStoreData,
  now: Date = new Date()
): DueReminder[] {
  const todayKey = formatDateKey(now);
  const currentHourFloat = now.getUTCHours() + now.getUTCMinutes() / 60;
  const sentKeys = new Set((store.emailLog ?? []).map((entry) => entry.dedupeKey));
  const consent = store.consent ?? {
    shareVitalsWithFamily: true,
    emailFamilyOnMissedDose: true,
  };

  const members = store.circle?.members ?? [];
  const caretakerEmails = uniqueEmails(
    members.filter((m) => m.role === "caretaker").map((m) => m.email)
  );
  const familyEmails = uniqueEmails(
    members.filter((m) => m.role === "family").map((m) => m.email)
  );
  const seniorEmails = uniqueEmails(
    members.filter((m) => m.role === "senior").map((m) => m.email)
  );

  const grouped = groupMedicationsBySlot(
    store.medications,
    store.doseLogs,
    todayKey
  );
  const patientName = store.profile.name || "Care Recipient";
  const due: DueReminder[] = [];

  for (const slot of SLOT_ORDER) {
    const pendingItems = grouped[slot].filter(
      (item) => item.status === "pending" || item.status === "snoozed"
    );
    if (pendingItems.length === 0) continue;

    const meta = SLOT_META[slot];
    const medNames = pendingItems
      .map((item) => `${item.medication.name} (${item.medication.dosage})`)
      .join(", ");

    // Slot starts within 30 minutes or is currently active
    if (currentHourFloat >= meta.startHour - 0.5 && currentHourFloat < meta.endHour) {
      const dedupeKey = `upcoming_dose:${todayKey}:${slot}`;
      const recipients = uniqueEmails([...seniorEmails, ...caretakerEmails]);
      if (!sentKeys.has(dedupeKey) && recipients.length > 0) {
        const subject = `Tavya Reminder: ${meta.label} doses for ${patientName} (${meta.windowLabel})`;
        const text = `${meta.label} medication window (${meta.windowLabel}) for ${patientName}: ${medNames}. Please confirm in Tavya once taken.`;
        const html = `<p><strong>${escapeHtml(meta.label)} medication reminder</strong> (${escapeHtml(meta.windowLabel)}) for <strong>${escapeHtml(patientName)}</strong>:</p><ul>${pendingItems
          .map(
            (item) =>
              `<li>${escapeHtml(item.medication.name)} — ${escapeHtml(item.medication.dosage)}${
                item.medication.instructions ? ` (${escapeHtml(item.medication.instructions)})` : ""
              }</li>`
          )
          .join("")}</ul><p>Open Tavya to mark doses as taken.</p>`;
        due.push({
          dedupeKey,
          kind: "upcoming_dose",
          subject,
          text,
          html,
          recipients,
          summaryTitle: `${meta.label} dose reminder queued`,
          summaryDetail: `${medNames} (${meta.windowLabel})`,
        });
      }
      continue;
    }

    // Slot window has passed with untaken doses
    if (currentHourFloat >= meta.endHour) {
      const dedupeKey = `missed_dose:${todayKey}:${slot}`;
      const recipients = uniqueEmails([
        ...caretakerEmails,
        ...(consent.emailFamilyOnMissedDose ? familyEmails : []),
      ]);
      if (!sentKeys.has(dedupeKey) && recipients.length > 0) {
        const subject = `Tavya Alert: Missed ${meta.label.toLowerCase()} dose for ${patientName}`;
        const text = `${patientName} has unconfirmed ${meta.label.toLowerCase()} medication(s) from ${meta.windowLabel}: ${medNames}. Do not double-dose without clinician guidance.`;
        const html = `<p><strong>Missed ${escapeHtml(meta.label)} dose alert</strong> for <strong>${escapeHtml(patientName)}</strong> (${escapeHtml(meta.windowLabel)}):</p><ul>${pendingItems
          .map(
            (item) =>
              `<li>${escapeHtml(item.medication.name)} — ${escapeHtml(item.medication.dosage)}</li>`
          )
          .join("")}</ul><p>Check in with ${escapeHtml(patientName)} before the next scheduled window.</p>`;
        due.push({
          dedupeKey,
          kind: "missed_dose",
          subject,
          text,
          html,
          recipients,
          summaryTitle: `Missed ${meta.label.toLowerCase()} dose for ${patientName}`,
          summaryDetail: `${medNames} exceeded the ${meta.windowLabel} window.`,
        });
      }
    }
  }

  for (const appt of store.appointments ?? []) {
    const startsMs = Date.parse(appt.startsAt);
    if (Number.isNaN(startsMs)) continue;
    const diffMs = startsMs - now.getTime();
    if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
      const dedupeKey = `appointment:${appt.id}`;
      const recipients = uniqueEmails([
        ...caretakerEmails,
        ...familyEmails,
        ...seniorEmails,
      ]);
      if (!sentKeys.has(dedupeKey) && recipients.length > 0) {
        const formattedTime = new Date(startsMs).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "UTC",
        });
        const doctorPart = appt.doctor ? ` with ${appt.doctor}` : "";
        const locationPart = appt.location ? ` at ${appt.location}` : "";
        const subject = `Tavya Appointment: ${appt.title} for ${patientName}`;
        const text = `Upcoming appointment for ${patientName}: ${appt.title}${doctorPart}${locationPart} on ${formattedTime} UTC.${
          appt.notes ? ` Notes: ${appt.notes}` : ""
        }`;
        const html = `<p><strong>Upcoming medical appointment</strong> for <strong>${escapeHtml(patientName)}</strong>:</p><p>${escapeHtml(appt.title)}${escapeHtml(doctorPart)}${escapeHtml(locationPart)}<br/>Scheduled: <strong>${escapeHtml(formattedTime)} UTC</strong></p>${
          appt.notes ? `<p>Notes: ${escapeHtml(appt.notes)}</p>` : ""
        }`;
        due.push({
          dedupeKey,
          kind: "appointment",
          subject,
          text,
          html,
          recipients,
          summaryTitle: `Upcoming appointment: ${appt.title}`,
          summaryDetail: `${appt.doctor ?? "Clinic"} on ${formattedTime} UTC`,
        });
      }
    }
  }

  return due;
}
