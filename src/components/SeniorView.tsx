"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  getNextDueMedication,
  groupMedicationsBySlot,
} from "@/domain/schedule";
import {
  SENIOR_LANGUAGES,
  type SeniorLanguage,
} from "@/domain/senior-i18n";
import type {
  DashboardPayload,
  DoseSlot,
  DoseStatus,
  MoodState,
  SharingConsent,
} from "@/domain/types";
import type { TextScale } from "./Navbar";
import { SeniorHeroSection } from "./senior/SeniorHeroSection";
import { SeniorPrivacyCard } from "./senior/SeniorPrivacyCard";
import { SeniorSlotSchedule } from "./senior/SeniorSlotSchedule";
import { SeniorWellnessAndSos } from "./senior/SeniorWellnessAndSos";

interface SeniorViewProps {
  data: DashboardPayload;
  textScale: TextScale;
  onDoseAction: (
    medicationId: string,
    slot: DoseSlot,
    status: DoseStatus
  ) => Promise<void>;
  onLogVitals: (payload: {
    mood: MoodState;
    systolic?: number;
    diastolic?: number;
    bloodSugarMgDl?: number;
    note?: string;
  }) => Promise<void>;
  onUpdateConsent?: (next: Partial<SharingConsent>) => Promise<void>;
  onOpenCaregiver: () => void;
  onOpenSos: () => void;
}

function getLocalizedGreeting(hour: number, lang: SeniorLanguage): string {
  const t = SENIOR_LANGUAGES[lang];
  if (hour < 12) return t.morningGreeting;
  if (hour < 17) return t.afternoonGreeting;
  return t.eveningGreeting;
}

export function SeniorView({
  data,
  textScale,
  onDoseAction,
  onLogVitals,
  onUpdateConsent,
  onOpenCaregiver,
  onOpenSos,
}: SeniorViewProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [lang, setLang] = useState<SeniorLanguage>("en");
  const [speechStatus, setSpeechStatus] = useState("");
  const [reminderOverride, setReminderOverride] = useState<
    "idle" | "granted" | "denied" | null
  >(null);
  const [snoozedUntil, setSnoozedUntil] = useState<Record<string, number>>({});
  const [dueReminderBanner, setDueReminderBanner] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const t = SENIOR_LANGUAGES[lang];

  const localHour = useSyncExternalStore(
    () => () => {},
    () => new Date().getHours(),
    () => 12
  );
  const browserNotificationState = useSyncExternalStore<"idle" | "granted" | "denied">(
    () => () => {},
    () => {
      if (typeof window === "undefined" || !("Notification" in window)) return "idle";
      if (Notification.permission === "granted") return "granted";
      if (Notification.permission === "denied") return "denied";
      return "idle";
    },
    () => "idle"
  );
  const reminderState = reminderOverride ?? browserNotificationState;

  useEffect(() => {
    if (Object.keys(snoozedUntil).length === 0) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      const expired = Object.entries(snoozedUntil).find(
        ([, deadline]) => deadline <= current
      );
      if (!expired) return;
      const [expiredKey] = expired;
      const [medId] = expiredKey.split("::");
      const med = data.medications.find((m) => m.id === medId);
      const msg = `Snooze ended for ${med?.name ?? "your medicine"} — ready when you are.`;
      setDueReminderBanner(msg);
      setSnoozedUntil((prev) => {
        const copy = { ...prev };
        delete copy[expiredKey];
        return copy;
      });
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        new Notification("Tavya Dose Reminder", { body: msg });
      }
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [snoozedUntil, data.medications]);

  const grouped = useMemo(
    () => groupMedicationsBySlot(data.medications, data.doseLogs, data.todayKey),
    [data.medications, data.doseLogs, data.todayKey]
  );

  const nextDue = useMemo(
    () =>
      getNextDueMedication(data.medications, data.doseLogs, data.todayKey, localHour),
    [data.medications, data.doseLogs, data.todayKey, localHour]
  );

  const hasActiveMeds = useMemo(
    () => data.medications.some((m) => m.active),
    [data.medications]
  );

  const nextVisitSummary = useMemo(() => {
    const structured = (data.appointments ?? [])[0];
    if (structured) {
      const dateLabel = new Date(structured.startsAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      return {
        dateLabel,
        detail: [structured.title, structured.doctor, structured.location]
          .filter(Boolean)
          .join(" · "),
      };
    }
    const noteVisit = (data.careNotes ?? []).find((n) => n.category === "appointment");
    return noteVisit
      ? { dateLabel: noteVisit.scheduledDate ?? "", detail: noteVisit.text }
      : null;
  }, [data.appointments, data.careNotes]);

  const isPlaceholderProfile =
    data.profile.name.trim().toLowerCase() === "your loved one";
  const firstName = isPlaceholderProfile
    ? "there"
    : (data.profile.name.split(" ")[0] ?? data.profile.name);
  const headingGreeting = isPlaceholderProfile
    ? getLocalizedGreeting(localHour, lang)
    : `${getLocalizedGreeting(localHour, lang)}, ${firstName}`;

  async function handleEnableReminders() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setReminderOverride("denied");
      return;
    }
    const perm = await Notification.requestPermission();
    setReminderOverride(perm === "granted" ? "granted" : "denied");
  }

  async function handleDoseClick(
    medicationId: string,
    slot: DoseSlot,
    status: DoseStatus
  ) {
    const key = `${medicationId}-${slot}`;
    const snoozeKey = `${medicationId}::${slot}`;
    setBusyKey(key);
    try {
      await onDoseAction(medicationId, slot, status);
      if (status === "snoozed") {
        const now = Date.now();
        setNowMs(now);
        setSnoozedUntil((prev) => ({ ...prev, [snoozeKey]: now + 15 * 60_000 }));
      } else {
        setSnoozedUntil((prev) => {
          if (!(snoozeKey in prev)) return prev;
          const copy = { ...prev };
          delete copy[snoozeKey];
          return copy;
        });
      }
    } finally {
      setBusyKey(null);
    }
  }

  function handleReadSchedule() {
    if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") {
      setSpeechStatus("Voice read-aloud is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const text = !hasActiveMeds
      ? t.noMedsSub
      : nextDue
        ? `${getLocalizedGreeting(localHour, lang)}. ${nextDue.medication.name} ${nextDue.medication.dosage}. ${nextDue.medication.instructions}.`
        : t.allDoneTitle;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = t.speechLang;
    utterance.rate = 0.92;
    window.speechSynthesis.speak(utterance);
    setSpeechStatus(`${t.readSchedule}...`);
  }

  return (
    <div
      className={`mx-auto w-full max-w-5xl space-y-8 px-3 pt-5 pb-10 sm:space-y-10 sm:px-4 sm:py-12 ${
        textScale === "xl" ? "text-lg" : "text-base"
      }`}
    >
      <SeniorHeroSection
        todayKey={data.todayKey}
        todayTaken={data.adherence.todayTaken}
        todayTotal={data.adherence.todayTotal}
        viewerRole={data.viewerRole}
        lang={lang}
        onLangChange={setLang}
        headingGreeting={headingGreeting}
        reminderState={reminderState}
        onEnableReminders={() => void handleEnableReminders()}
        onReadSchedule={handleReadSchedule}
        dueReminderBanner={dueReminderBanner}
        onDismissBanner={() => setDueReminderBanner("")}
        nextVisitSummary={nextVisitSummary}
        speechStatus={speechStatus}
        hasActiveMeds={hasActiveMeds}
        nextDue={nextDue}
        busyKey={busyKey}
        onDoseClick={handleDoseClick}
        onOpenCaregiver={onOpenCaregiver}
      />

      <SeniorSlotSchedule
        grouped={grouped}
        todayPercent={data.adherence.todayPercent}
        localHour={localHour}
        lang={lang}
        busyKey={busyKey}
        snoozedUntil={snoozedUntil}
        nowMs={nowMs}
        onDoseClick={handleDoseClick}
      />

      <SeniorWellnessAndSos
        caregiverName={data.profile.caregiverName}
        lang={lang}
        onLogVitals={onLogVitals}
        onOpenSos={onOpenSos}
      />

      {onUpdateConsent &&
      (data.viewerRole === "senior" || data.viewerRole === "caretaker") ? (
        <SeniorPrivacyCard
          consent={data.consent}
          onUpdateConsent={onUpdateConsent}
        />
      ) : null}
    </div>
  );
}
