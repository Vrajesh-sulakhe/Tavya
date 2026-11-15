"use client";

import {
  ArrowCounterClockwise,
  CheckCircle,
  Clock,
  MoonStars,
  Sun,
  SunHorizon,
  Warning,
} from "@phosphor-icons/react";
import {
  SLOT_META,
  SLOT_ORDER,
  getSlotWindowState,
} from "@/domain/schedule";
import {
  SENIOR_LANGUAGES,
  type SeniorLanguage,
} from "@/domain/senior-i18n";
import type {
  DoseSlot,
  DoseStatus,
  ScheduledDoseItem,
} from "@/domain/types";
import { BezelCard } from "../ui/BezelCard";
import { PillVisual } from "../ui/PillVisual";
import { Reveal } from "../ui/Reveal";

interface SeniorSlotScheduleProps {
  grouped: Record<DoseSlot, ScheduledDoseItem[]>;
  todayPercent: number;
  localHour: number;
  lang: SeniorLanguage;
  busyKey: string | null;
  snoozedUntil: Record<string, number>;
  nowMs: number;
  onDoseClick: (medicationId: string, slot: DoseSlot, status: DoseStatus) => void;
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

function getStatusBadgeStyle(status: DoseStatus): string {
  if (status === "taken") return "bg-[#E6F3EE] text-[#0F6B54]";
  if (status === "snoozed") return "bg-[#FEF3C7] text-[#92400E]";
  return "bg-white text-[#46534C] ring-1 ring-[#141D19]/10";
}

export function SeniorSlotSchedule({
  grouped,
  todayPercent,
  localHour,
  lang,
  busyKey,
  snoozedUntil,
  nowMs,
  onDoseClick,
}: SeniorSlotScheduleProps) {
  const t = SENIOR_LANGUAGES[lang];

  return (
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
            {todayPercent}% {t.completeLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2">
          {SLOT_ORDER.map((slot) => {
            const items = grouped[slot];
            const meta = SLOT_META[slot];
            const windowState = getSlotWindowState(slot, localHour);
            const hasOverdueItem =
              windowState === "passed" &&
              items.some((i) => i.status === "pending" || i.status === "snoozed");

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
                      const statusLabel =
                        status === "snoozed" && minsLeft
                          ? `${t.snoozedStatus} · ${minsLeft}m`
                          : status === "taken"
                            ? t.takenStatus
                            : status === "snoozed"
                              ? t.snoozedStatus
                              : t.pendingStatus;

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
                                  {medication.purpose} · {t.meals[medication.mealTiming]}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusBadgeStyle(status)}`}
                            >
                              {statusLabel}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {status !== "taken" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => onDoseClick(medication.id, slot, "taken")}
                                  className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-[#0F6B54] px-4 py-2 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#0B5341] active:scale-[0.98]"
                                >
                                  <CheckCircle size={18} weight="light" aria-hidden="true" />
                                  <span>{t.takenBtn}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => onDoseClick(medication.id, slot, "snoozed")}
                                  className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#46534C] ring-1 ring-[#141D19]/12 transition-colors hover:bg-[#FEF3C7] hover:text-[#92400E]"
                                >
                                  <Clock size={18} weight="light" aria-hidden="true" />
                                  <span>{t.snoozeBtn}</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => onDoseClick(medication.id, slot, "pending")}
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
  );
}
