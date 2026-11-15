"use client";

import {
  ArrowUpRight,
  Bell,
  CalendarCheck,
  CheckCircle,
  Clock,
  SpeakerHigh,
} from "@phosphor-icons/react";
import { SLOT_META } from "@/domain/schedule";
import {
  SENIOR_LANGUAGES,
  type SeniorLanguage,
} from "@/domain/senior-i18n";
import type {
  CircleRole,
  DoseSlot,
  DoseStatus,
  ScheduledDoseItem,
} from "@/domain/types";
import { BezelCard } from "../ui/BezelCard";
import { PillVisual } from "../ui/PillVisual";
import { Reveal } from "../ui/Reveal";

interface SeniorHeroSectionProps {
  todayKey: string;
  todayTaken: number;
  todayTotal: number;
  viewerRole: CircleRole;
  lang: SeniorLanguage;
  onLangChange: (lang: SeniorLanguage) => void;
  headingGreeting: string;
  reminderState: "idle" | "granted" | "denied";
  onEnableReminders: () => void;
  onReadSchedule: () => void;
  dueReminderBanner: string;
  onDismissBanner: () => void;
  nextVisitSummary: { dateLabel: string; detail: string } | null;
  speechStatus: string;
  hasActiveMeds: boolean;
  nextDue: ScheduledDoseItem | null;
  busyKey: string | null;
  onDoseClick: (medicationId: string, slot: DoseSlot, status: DoseStatus) => void;
  onOpenCaregiver: () => void;
}

export function SeniorHeroSection({
  todayKey,
  todayTaken,
  todayTotal,
  viewerRole,
  lang,
  onLangChange,
  headingGreeting,
  reminderState,
  onEnableReminders,
  onReadSchedule,
  dueReminderBanner,
  onDismissBanner,
  nextVisitSummary,
  speechStatus,
  hasActiveMeds,
  nextDue,
  busyKey,
  onDoseClick,
  onOpenCaregiver,
}: SeniorHeroSectionProps) {
  const t = SENIOR_LANGUAGES[lang];

  return (
    <Reveal>
      <section aria-labelledby="senior-greeting-heading" className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#E6F3EE] px-3.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-[#0F6B54] uppercase">
                {t.companionTag} · {todayKey}
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
                    onClick={() => onLangChange(code)}
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
                    {todayTaken} of {todayTotal}
                  </strong>{" "}
                  doses today. Take your time—everything you need is right here.
                </>
              ) : (
                t.noMedsSub
              )}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onEnableReminders}
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
              onClick={onReadSchedule}
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
              onClick={onDismissBanner}
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
                {nextVisitSummary.dateLabel ? ` · ${nextVisitSummary.dateLabel}` : ""}:{" "}
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

        <BezelCard tone={nextDue ? "accent" : "default"} innerClassName="p-5 sm:p-8">
          {!hasActiveMeds ? (
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-display text-3xl text-[#141D19]">{t.emptyHeroTitle}</h2>
                <p className="mt-1 text-[#46534C]">{t.emptyHeroBody}</p>
              </div>
              {viewerRole !== "senior" ? (
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
                      {t.nextUpLabel} · {t.slots[nextDue.slot]} ({SLOT_META[nextDue.slot].windowLabel})
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
                  disabled={busyKey === `${nextDue.medication.id}-${nextDue.slot}`}
                  onClick={() => onDoseClick(nextDue.medication.id, nextDue.slot, "taken")}
                  className="group inline-flex min-h-[54px] w-full items-center justify-between gap-4 rounded-full bg-[#0F6B54] py-2.5 pr-2.5 pl-6 text-base font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#0B5341] active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:justify-start"
                >
                  <span>{t.markDoseTaken}</span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105">
                    <CheckCircle size={22} weight="light" aria-hidden="true" />
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busyKey === `${nextDue.medication.id}-${nextDue.slot}`}
                  onClick={() => onDoseClick(nextDue.medication.id, nextDue.slot, "snoozed")}
                  className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#FEF3C7] px-5 py-3 text-base font-semibold text-[#92400E] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#FDE68A] active:scale-[0.98] sm:w-auto"
                >
                  <Clock size={20} weight="light" aria-hidden="true" />
                  <span>{t.snooze15}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F3EE] text-[#0F6B54]">
                <CheckCircle size={32} weight="duotone" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-3xl text-[#141D19]">{t.allDoneTitle}</h2>
                <p className="mt-1 text-[#46534C]">{t.allDoneBody}</p>
              </div>
            </div>
          )}
        </BezelCard>
      </section>
    </Reveal>
  );
}
