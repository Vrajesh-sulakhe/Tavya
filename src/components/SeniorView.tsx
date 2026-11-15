"use client";

import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  ArrowCounterClockwise,
  ArrowUpRight,
  Bell,
  CalendarCheck,
  CheckCircle,
  Clock,
  FirstAidKit,
  Heartbeat,
  MoonStars,
  ShieldCheck,
  SpeakerHigh,
  Sun,
  SunHorizon,
  Warning,
} from "@phosphor-icons/react";
import {
  SLOT_META,
  SLOT_ORDER,
  getNextDueMedication,
  getSlotWindowState,
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
import { BezelCard } from "./ui/BezelCard";
import { PillVisual } from "./ui/PillVisual";
import { Reveal } from "./ui/Reveal";

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

function SlotIcon({ slot }: { slot: DoseSlot }) {
  switch (slot) {
    case "morning":
      return <SunHorizon size={22} weight="light" aria-hidden="true" />;
    case "afternoon":
      return <Sun size={22} weight="light" aria-hidden="true" />;
    case "evening":
      return <SunHorizon size={22} weight="light" aria-hidden="true" />;
    case "night":
      return <MoonStars size={22} weight="light" aria-hidden="true" />;
  }
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
  const [speechStatus, setSpeechStatus] = useState<string>("");
  const [reminderOverride, setReminderOverride] = useState<
    "idle" | "granted" | "denied" | null
  >(null);
  const [snoozedUntil, setSnoozedUntil] = useState<Record<string, number>>({});
  const [dueReminderBanner, setDueReminderBanner] = useState<string>("");
  const [selectedMood, setSelectedMood] = useState<MoodState>("good");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [vitalsSaved, setVitalsSaved] = useState(false);

  const t = SENIOR_LANGUAGES[lang];

  // Use useSyncExternalStore with fixed server snapshots to avoid SSR/client hydration mismatches.
  const localHour = useSyncExternalStore(
    () => () => {},
    () => new Date().getHours(),
    () => 12
  );
  const browserNotificationState = useSyncExternalStore<"idle" | "granted" | "denied">(
    () => () => {},
    () => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return "idle";
      }
      if (Notification.permission === "granted") return "granted";
      if (Notification.permission === "denied") return "denied";
      return "idle";
    },
    () => "idle"
  );
  const reminderState = reminderOverride ?? browserNotificationState;

  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const hasPendingSnooze = Object.keys(snoozedUntil).length > 0;
    if (!hasPendingSnooze) return;

    const timer = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);

      const expiredEntry = Object.entries(snoozedUntil).find(
        ([, deadline]) => deadline <= current
      );
      if (expiredEntry) {
        const [expiredKey] = expiredEntry;
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
      }
    }, 15_000);

    return () => window.clearInterval(timer);
  }, [snoozedUntil, data.medications]);

  const grouped = useMemo(
    () =>
      groupMedicationsBySlot(data.medications, data.doseLogs, data.todayKey),
    [data.medications, data.doseLogs, data.todayKey]
  );

  const nextDue = useMemo(
    () =>
      getNextDueMedication(
        data.medications,
        data.doseLogs,
        data.todayKey,
        localHour
      ),
    [data.medications, data.doseLogs, data.todayKey, localHour]
  );

  const hasActiveMeds = useMemo(
    () => data.medications.some((m) => m.active),
    [data.medications]
  );

  const nextVisitSummary = useMemo(() => {
    const structured = (data.appointments ?? [])[0];
    if (structured) {
      const formatted = new Date(structured.startsAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
      return {
        dateLabel: formatted,
        detail: [structured.title, structured.doctor, structured.location]
          .filter(Boolean)
          .join(" · "),
      };
    }
    const noteVisit = (data.careNotes ?? []).find(
      (note) => note.category === "appointment"
    );
    if (noteVisit) {
      return {
        dateLabel: noteVisit.scheduledDate ?? "",
        detail: noteVisit.text,
      };
    }
    return null;
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
        setSnoozedUntil((prev) => ({
          ...prev,
          [snoozeKey]: now + 15 * 60_000,
        }));
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
    if (
      typeof window === "undefined" ||
      typeof window.speechSynthesis === "undefined"
    ) {
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

  async function handleVitalsSubmit(e: FormEvent) {
    e.preventDefault();
    setVitalsSaved(false);
    await onLogVitals({
      mood: selectedMood,
      systolic: systolic ? Number(systolic) : undefined,
      diastolic: diastolic ? Number(diastolic) : undefined,
      bloodSugarMgDl: bloodSugar ? Number(bloodSugar) : undefined,
    });
    setVitalsSaved(true);
    setSystolic("");
    setDiastolic("");
    setBloodSugar("");
  }

  return (
    <div
      className={`mx-auto w-full max-w-5xl space-y-8 px-3 pt-5 pb-10 sm:space-y-10 sm:px-4 sm:py-12 ${
        textScale === "xl" ? "text-lg" : "text-base"
      }`}
    >
      {/* Hero Header & Next-Up Card */}
      <Reveal>
        <section aria-labelledby="senior-greeting-heading" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#E6F3EE] px-3.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-[#0F6B54] uppercase">
                  {t.companionTag} · {data.todayKey}
                </span>
                <div
                  role="group"
                  aria-label="Language selector"
                  className="inline-flex rounded-full bg-white p-0.5 ring-1 ring-[#141D19]/10"
                >
                  {(["en", "hi", "mr"] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLang(code)}
                      aria-pressed={lang === code}
                      className={`min-h-[30px] rounded-full px-2.5 text-xs font-semibold transition-colors ${
                        lang === code
                          ? "bg-[#0F6B54] text-white"
                          : "text-[#46534C] hover:text-[#141D19]"
                      }`}
                    >
                      {SENIOR_LANGUAGES[code].shortLabel}
                    </button>
                  ))}
                </div>
              </div>
              <h1
                id="senior-greeting-heading"
                className="font-display mt-3 text-4xl leading-[1.08] text-[#141D19] sm:text-5xl"
              >
                {headingGreeting}
              </h1>
              <p className="mt-2 max-w-xl text-[#46534C]">
                {hasActiveMeds ? (
                  <>
                    You have completed{" "}
                    <strong className="font-mono-num text-[#141D19]">
                      {data.adherence.todayTaken} of {data.adherence.todayTotal}
                    </strong>{" "}
                    doses today. Take your time—everything you need is right
                    here.
                  </>
                ) : (
                  t.noMedsSub
                )}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleEnableReminders}
                className={`inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold ring-1 transition-colors sm:w-auto ${
                  reminderState === "granted"
                    ? "bg-[#E6F3EE] text-[#0F6B54] ring-[#0F6B54]/25"
                    : "bg-white text-[#46534C] ring-[#141D19]/12 hover:bg-[#F2EDE3]"
                }`}
              >
                <Bell size={18} weight="light" aria-hidden="true" />
                <span>
                  {reminderState === "granted"
                    ? t.remindersOn
                    : reminderState === "denied"
                      ? t.remindersBlocked
                      : t.enableReminders}
                </span>
              </button>

              <button
                type="button"
                onClick={handleReadSchedule}
                className="group inline-flex min-h-[48px] w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#141D19] shadow-sm ring-1 ring-[#141D19]/12 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#F2EDE3] active:scale-[0.98] sm:w-auto"
              >
                <SpeakerHigh size={20} weight="light" aria-hidden="true" />
                <span>{t.readSchedule}</span>
              </button>
            </div>
          </div>

          {dueReminderBanner ? (
            <div
              role="status"
              className="flex items-center justify-between gap-3 rounded-2xl bg-[#FEF3C7] px-4 py-3 text-sm font-semibold text-[#92400E] ring-1 ring-[#B45309]/25"
            >
              <span>{dueReminderBanner}</span>
              <button
                type="button"
                onClick={() => setDueReminderBanner("")}
                className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-[#92400E]"
              >
                Dismiss
              </button>
            </div>
          ) : null}

          {nextVisitSummary ? (
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-[#141D19] ring-1 ring-[#141D19]/10">
              <CalendarCheck
                size={20}
                weight="light"
                className="shrink-0 text-[#0F6B54]"
                aria-hidden="true"
              />
              <div>
                <span className="font-semibold text-[#0F6B54]">
                  {t.nextVisitLabel}
                  {nextVisitSummary.dateLabel
                    ? ` · ${nextVisitSummary.dateLabel}`
                    : ""}
                  :{" "}
                </span>
                <span>{nextVisitSummary.detail}</span>
              </div>
            </div>
          ) : null}

          {speechStatus ? (
            <p className="text-sm font-medium text-[#0F6B54]" role="status">
              {speechStatus}
            </p>
          ) : null}

          <BezelCard
            tone={nextDue ? "accent" : "default"}
            innerClassName="p-5 sm:p-8"
          >
            {!hasActiveMeds ? (
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-display text-3xl text-[#141D19]">
                    {t.emptyHeroTitle}
                  </h2>
                  <p className="mt-1 text-[#46534C]">{t.emptyHeroBody}</p>
                </div>
                {data.viewerRole !== "senior" ? (
                  <button
                    type="button"
                    onClick={onOpenCaregiver}
                    className="group inline-flex min-h-[52px] w-full shrink-0 items-center justify-between gap-3 rounded-full bg-[#0F6B54] py-2 pr-2 pl-6 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#0B5341] active:scale-[0.98] sm:w-auto"
                  >
                    <span>{t.openCaregiverHub}</span>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      <ArrowUpRight size={18} weight="light" aria-hidden="true" />
                    </span>
                  </button>
                ) : null}
              </div>
            ) : nextDue ? (
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center lg:gap-6">
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <PillVisual appearance={nextDue.medication.appearance} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#E6F3EE] px-3 py-1 text-xs font-semibold text-[#0F6B54]">
                        {t.nextUpLabel} · {t.slots[nextDue.slot]} (
                        {SLOT_META[nextDue.slot].windowLabel})
                      </span>
                      <span className="rounded-full bg-[#F2EDE3] px-3 py-1 text-xs font-medium text-[#46534C]">
                        {t.meals[nextDue.medication.mealTiming]}
                      </span>
                    </div>
                    <h2 className="font-display mt-2.5 text-3xl text-[#141D19] sm:mt-3 sm:text-4xl">
                      {nextDue.medication.name}{" "}
                      <span className="font-mono-num text-lg text-[#46534C] sm:text-xl">
                        {nextDue.medication.dosage}
                      </span>
                    </h2>
                    <p className="mt-1.5 text-base text-[#46534C] sm:text-lg">
                      {nextDue.medication.instructions}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <button
                    type="button"
                    disabled={
                      busyKey === `${nextDue.medication.id}-${nextDue.slot}`
                    }
                    onClick={() =>
                      handleDoseClick(
                        nextDue.medication.id,
                        nextDue.slot,
                        "taken"
                      )
                    }
                    className="group inline-flex min-h-[54px] w-full items-center justify-between gap-4 rounded-full bg-[#0F6B54] py-2.5 pr-2.5 pl-6 text-base font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#0B5341] active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:justify-start"
                  >
                    <span>{t.markDoseTaken}</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
                      <CheckCircle size={22} weight="light" aria-hidden="true" />
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={
                      busyKey === `${nextDue.medication.id}-${nextDue.slot}`
                    }
                    onClick={() =>
                      handleDoseClick(
                        nextDue.medication.id,
                        nextDue.slot,
                        "snoozed"
                      )
                    }
                    className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#FEF3C7] px-5 py-3 text-base font-semibold text-[#92400E] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#FDE68A] active:scale-[0.98] sm:w-auto"
                  >
                    <Clock size={20} weight="light" aria-hidden="true" />
                    <span>{t.snooze15}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F3EE] text-[#0F6B54]">
                    <CheckCircle size={32} weight="duotone" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="font-display text-3xl text-[#141D19]">
                      {t.allDoneTitle}
                    </h2>
                    <p className="mt-1 text-[#46534C]">{t.allDoneBody}</p>
                  </div>
                </div>
              </div>
            )}
          </BezelCard>
        </section>
      </Reveal>

      {/* 4-Slot Daily Timeline */}
      <Reveal delayMs={80}>
        <section aria-labelledby="daily-timeline-heading" className="space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="daily-timeline-heading"
              className="font-display text-2xl text-[#141D19] sm:text-3xl"
            >
              {t.timelineTitle}
            </h2>
            <span className="font-mono-num text-sm font-semibold text-[#0F6B54]">
              {data.adherence.todayPercent}% {t.completeLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
            {SLOT_ORDER.map((slot) => {
              const items = grouped[slot];
              const meta = SLOT_META[slot];
              const windowState = getSlotWindowState(slot, localHour);
              const hasOverdueItem =
                windowState === "passed" &&
                items.some(
                  (i) => i.status === "pending" || i.status === "snoozed"
                );
              return (
                <BezelCard key={slot} innerClassName="p-4 sm:p-6">
                  <div className="flex items-center justify-between border-b border-[#141D19]/[0.07] pb-4">
                    <div className="flex items-center gap-2.5 text-[#141D19]">
                      <SlotIcon slot={slot} />
                      <h3 className="font-display text-2xl">{t.slots[slot]}</h3>
                    </div>

                    <span className="font-mono-num rounded-full bg-[#FDFBF7] px-3 py-1 text-xs font-medium text-[#46534C] ring-1 ring-[#141D19]/[0.08]">
                      {meta.windowLabel}
                    </span>
                  </div>

                  {hasOverdueItem ? (
                    <div className="mt-3 flex items-start gap-2 rounded-2xl bg-[#FEF3C7] px-3.5 py-2.5 text-xs font-medium text-[#92400E] ring-1 ring-[#B45309]/20">
                      <Warning
                        size={16}
                        weight="light"
                        className="mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{t.windowPassedGuard}</span>
                    </div>
                  ) : null}

                  <div className="mt-4 space-y-4">
                    {items.length === 0 ? (
                      <p className="rounded-2xl bg-[#FDFBF7] px-4 py-6 text-center text-sm text-[#617068]">
                        {t.nothingScheduled}
                      </p>
                    ) : (
                      items.map(({ medication, status }) => {
                        const actionKey = `${medication.id}-${slot}`;
                        const snoozeKey = `${medication.id}::${slot}`;
                        const deadline = snoozedUntil[snoozeKey];
                        const minsLeft =
                          deadline && deadline > nowMs
                            ? Math.max(1, Math.ceil((deadline - nowMs) / 60_000))
                            : null;
                        const isBusy = busyKey === actionKey;
                        return (
                          <div
                            key={actionKey}
                            className="rounded-2xl bg-[#FDFBF7] p-4 ring-1 ring-[#141D19]/[0.06]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <PillVisual appearance={medication.appearance} />
                                <div>
                                  <p className="text-lg font-semibold text-[#141D19]">
                                    {medication.name}{" "}
                                    <span className="font-mono-num text-sm font-medium text-[#46534C]">
                                      {medication.dosage}
                                    </span>
                                  </p>
                                  <p className="text-sm text-[#46534C]">
                                    {medication.instructions}
                                  </p>
                                  <p className="mt-1 text-xs font-medium text-[#617068]">
                                    {medication.purpose} ·{" "}
                                    {t.meals[medication.mealTiming]}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                                  status === "taken"
                                    ? "bg-[#E6F3EE] text-[#0F6B54]"
                                    : status === "snoozed"
                                      ? "bg-[#FEF3C7] text-[#92400E]"
                                      : "bg-white text-[#46534C] ring-1 ring-[#141D19]/10"
                                }`}
                              >
                                {status === "snoozed" && minsLeft
                                  ? `${t.snoozedStatus} · ${minsLeft}m`
                                  : status === "taken"
                                    ? t.takenStatus
                                    : status === "snoozed"
                                      ? t.snoozedStatus
                                      : t.pendingStatus}
                              </span>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {status !== "taken" ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleDoseClick(
                                        medication.id,
                                        slot,
                                        "taken"
                                      )
                                    }
                                    className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-[#0F6B54] px-4 py-2 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#0B5341] active:scale-[0.98]"
                                  >
                                    <CheckCircle
                                      size={18}
                                      weight="light"
                                      aria-hidden="true"
                                    />
                                    <span>{t.takenBtn}</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() =>
                                      handleDoseClick(
                                        medication.id,
                                        slot,
                                        "snoozed"
                                      )
                                    }
                                    className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#46534C] ring-1 ring-[#141D19]/12 transition-colors hover:bg-[#FEF3C7] hover:text-[#92400E]"
                                  >
                                    <Clock
                                      size={18}
                                      weight="light"
                                      aria-hidden="true"
                                    />
                                    <span>{t.snoozeBtn}</span>
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleDoseClick(
                                      medication.id,
                                      slot,
                                      "pending"
                                    )
                                  }
                                  className="inline-flex min-h-[48px] items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#46534C] ring-1 ring-[#141D19]/12 hover:bg-[#F2EDE3]"
                                >
                                  <ArrowCounterClockwise
                                    size={16}
                                    weight="light"
                                    aria-hidden="true"
                                  />
                                  <span>{t.undoTaken}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </BezelCard>
              );
            })}
          </div>
        </section>
      </Reveal>

      {/* Wellness Check-in & Emergency Quick Card */}
      <Reveal delayMs={140}>
        <section
          aria-labelledby="wellness-checkin-heading"
          className="grid grid-cols-1 gap-6 md:grid-cols-12"
        >
          <BezelCard className="md:col-span-8" innerClassName="p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E6F3EE] text-[#0F6B54]">
                <Heartbeat size={24} weight="light" aria-hidden="true" />
              </span>
              <div>
                <h2
                  id="wellness-checkin-heading"
                  className="font-display text-3xl text-[#141D19]"
                >
                  {t.wellnessTitle}
                </h2>
                <p className="text-sm text-[#46534C]">
                  Updates {data.profile.caregiverName} automatically—especially
                  if you feel dizzy.
                </p>
              </div>
            </div>

            <form onSubmit={handleVitalsSubmit} className="mt-6 space-y-5">
              <div
                role="radiogroup"
                aria-label="Current wellness feeling"
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
              >
                {(["good", "tired", "dizzy", "nausea"] as const).map(
                  (value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selectedMood === value}
                      onClick={() => setSelectedMood(value)}
                      className={`min-h-[52px] rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                        selectedMood === value
                          ? value === "dizzy"
                            ? "bg-[#FEE4E2] text-[#B42318] ring-[#B42318]/40"
                            : "bg-[#E6F3EE] text-[#0F6B54] ring-[#0F6B54]/40"
                          : "bg-[#FDFBF7] text-[#141D19] ring-[#141D19]/10 hover:bg-[#F2EDE3]"
                      }`}
                    >
                      {t.moods[value]}
                    </button>
                  )
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-semibold text-[#46534C]">
                    {t.bpTop}
                  </span>
                  <input
                    type="number"
                    min={60}
                    max={260}
                    inputMode="numeric"
                    placeholder="e.g. 126"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="font-mono-num mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-3 text-[#141D19] ring-1 ring-[#141D19]/12"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#46534C]">
                    {t.bpBottom}
                  </span>
                  <input
                    type="number"
                    min={40}
                    max={160}
                    inputMode="numeric"
                    placeholder="e.g. 78"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="font-mono-num mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-3 text-[#141D19] ring-1 ring-[#141D19]/12"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#46534C]">
                    {t.bloodSugar}
                  </span>
                  <input
                    type="number"
                    min={30}
                    max={600}
                    inputMode="numeric"
                    placeholder="e.g. 112"
                    value={bloodSugar}
                    onChange={(e) => setBloodSugar(e.target.value)}
                    className="font-mono-num mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-3 text-[#141D19] ring-1 ring-[#141D19]/12"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <button
                  type="submit"
                  className="group inline-flex min-h-[52px] items-center gap-3 rounded-full bg-[#141D19] py-2 pr-2.5 pl-6 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#27352E] active:scale-[0.98]"
                >
                  <span>{t.saveCheckin}</span>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    <ArrowUpRight size={18} weight="light" aria-hidden="true" />
                  </span>
                </button>

                {vitalsSaved ? (
                  <span
                    className="text-sm font-semibold text-[#0F6B54]"
                    role="status"
                  >
                    {t.savedCheckin}
                  </span>
                ) : null}
              </div>
            </form>
          </BezelCard>

          <BezelCard
            tone="critical"
            className="md:col-span-4"
            innerClassName="flex h-full flex-col justify-between p-6 sm:p-8"
          >
            <div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEE4E2] text-[#B42318]">
                <FirstAidKit size={24} weight="light" aria-hidden="true" />
              </span>
              <h3 className="font-display mt-4 text-3xl text-[#141D19]">
                {t.sosTitle}
              </h3>
              <p className="mt-2 text-sm text-[#46534C]">
                One tap opens {data.profile.caregiverName}&apos;s direct phone
                link and your medical allergy card.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenSos}
              className="group mt-6 inline-flex min-h-[56px] w-full items-center justify-between rounded-full bg-[#B42318] py-2.5 pr-2.5 pl-6 text-base font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#911B12] active:scale-[0.98]"
            >
              <span>{t.sosButton}</span>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105">
                <ArrowUpRight size={20} weight="light" aria-hidden="true" />
              </span>
            </button>
          </BezelCard>
        </section>
      </Reveal>

      {onUpdateConsent &&
      (data.viewerRole === "senior" || data.viewerRole === "caretaker") ? (
        <Reveal delayMs={180}>
          <section aria-labelledby="senior-privacy-heading">
            <BezelCard innerClassName="p-6 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E6F3EE] text-[#0F6B54]">
                    <ShieldCheck size={22} weight="light" aria-hidden="true" />
                  </span>
                  <div>
                    <h2
                      id="senior-privacy-heading"
                      className="font-display text-2xl text-[#141D19] sm:text-3xl"
                    >
                      My Sharing &amp; Privacy Choices
                    </h2>
                    <p className="mt-1 text-sm text-[#46534C]">
                      Stay in control of what extended family members can view
                      and when automatic missed-dose email alerts go out.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={data.consent.shareVitalsWithFamily}
                  onClick={() =>
                    void onUpdateConsent({
                      shareVitalsWithFamily:
                        !data.consent.shareVitalsWithFamily,
                    })
                  }
                  className="flex min-h-[58px] items-center justify-between gap-4 rounded-2xl bg-[#FDFBF7] px-4 py-3 text-left ring-1 ring-[#141D19]/10 hover:bg-[#F2EDE3]"
                >
                  <div>
                    <span className="block text-sm font-semibold text-[#141D19]">
                      Share daily mood &amp; vitals with family
                    </span>
                    <span className="text-xs text-[#46534C]">
                      {data.consent.shareVitalsWithFamily
                        ? "Currently visible in Family Hub"
                        : "Kept private to you & primary caretaker"}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      data.consent.shareVitalsWithFamily
                        ? "bg-[#0F6B54] text-white"
                        : "bg-[#E5E7EB] text-[#374151]"
                    }`}
                  >
                    {data.consent.shareVitalsWithFamily ? "Shared" : "Private"}
                  </span>
                </button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={data.consent.emailFamilyOnMissedDose}
                  onClick={() =>
                    void onUpdateConsent({
                      emailFamilyOnMissedDose:
                        !data.consent.emailFamilyOnMissedDose,
                    })
                  }
                  className="flex min-h-[58px] items-center justify-between gap-4 rounded-2xl bg-[#FDFBF7] px-4 py-3 text-left ring-1 ring-[#141D19]/10 hover:bg-[#F2EDE3]"
                >
                  <div>
                    <span className="block text-sm font-semibold text-[#141D19]">
                      Notify family by email if a dose is missed
                    </span>
                    <span className="text-xs text-[#46534C]">
                      {data.consent.emailFamilyOnMissedDose
                        ? "Automatic family check-in alerts active"
                        : "Primary caretaker notified only"}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      data.consent.emailFamilyOnMissedDose
                        ? "bg-[#0F6B54] text-white"
                        : "bg-[#E5E7EB] text-[#374151]"
                    }`}
                  >
                    {data.consent.emailFamilyOnMissedDose ? "Active" : "Paused"}
                  </span>
                </button>
              </div>
            </BezelCard>
          </section>
        </Reveal>
      ) : null}
    </div>
  );
}
