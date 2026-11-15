"use client";

import { BellRinging, Warning } from "@phosphor-icons/react";
import { SLOT_ORDER } from "@/domain/schedule";
import type {
  DashboardPayload,
  MatrixCellState,
  VitalsLog,
} from "@/domain/types";
import { BezelCard } from "../ui/BezelCard";

interface AdherenceAndAlertsBentoProps {
  data: DashboardPayload;
  isCaretaker: boolean;
  vitalsPrivateForFamily: boolean;
  recentVitals: VitalsLog[];
  onRefillMedication: (id: string, pillsRemaining: number) => Promise<void>;
}

const MATRIX_DOT_STYLE: Record<MatrixCellState, string> = {
  taken: "bg-[#0F6B54]",
  snoozed: "bg-[#F59E0B]",
  skipped: "bg-[#B42318]",
  pending: "bg-[#141D19]/15",
  none: "bg-transparent ring-1 ring-[#141D19]/10",
};

export function AdherenceAndAlertsBento({
  data,
  isCaretaker,
  vitalsPrivateForFamily,
  recentVitals,
  onRefillMedication,
}: AdherenceAndAlertsBentoProps) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset =
    circumference - (data.adherence.sevenDayPercent / 100) * circumference;

  const totalAlertItems =
    data.allergyConflicts.length +
    data.refillAlerts.length +
    data.interactions.length +
    data.alerts.length;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
      <BezelCard
        tone="accent"
        className="md:col-span-5"
        innerClassName="flex h-full flex-col justify-between p-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[#0F6B54] uppercase">
              7-Day Adherence
            </p>
            <p className="font-display mt-1 text-5xl text-[#141D19]">
              <span className="font-mono-num">
                {data.adherence.sevenDayPercent}%
              </span>
            </p>
            <p className="mt-1 text-sm text-[#46534C]">
              Today:{" "}
              <strong className="font-mono-num text-[#141D19]">
                {data.adherence.todayTaken}/{data.adherence.todayTotal}
              </strong>{" "}
              doses taken
            </p>
          </div>

          <svg
            width="92"
            height="92"
            viewBox="0 0 92 92"
            aria-label={`7-day adherence ${data.adherence.sevenDayPercent} percent`}
          >
            <circle
              cx="46"
              cy="46"
              r={radius}
              fill="none"
              stroke="#E6F3EE"
              strokeWidth="8"
            />
            <circle
              cx="46"
              cy="46"
              r={radius}
              fill="none"
              stroke="#0F6B54"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              transform="rotate(-90 46 46)"
            />
          </svg>
        </div>

        <div className="mt-4 rounded-2xl bg-[#FDFBF7] p-3.5 ring-1 ring-[#141D19]/[0.07]">
          <div className="flex items-center justify-between text-[11px] font-semibold tracking-[0.14em] text-[#46534C] uppercase">
            <span>7-Day Slot Heatmap</span>
            <span className="font-mono-num">M · A · E · N</span>
          </div>
          <div className="mt-2.5 grid grid-cols-7 gap-1.5">
            {data.weeklyMatrix.map((day) => (
              <div
                key={day.dateKey}
                className="flex flex-col items-center gap-1 rounded-xl bg-white py-1.5 ring-1 ring-[#141D19]/[0.06]"
                title={`${day.dateKey}: M=${day.slots.morning}, A=${day.slots.afternoon}, E=${day.slots.evening}, N=${day.slots.night}`}
              >
                <span className="font-mono-num text-[10px] font-semibold text-[#617068]">
                  {day.dateKey.slice(8)}
                </span>
                {SLOT_ORDER.map((slot) => (
                  <span
                    key={slot}
                    className={`h-2 w-2 rounded-full ${MATRIX_DOT_STYLE[day.slots[slot]]}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-[#FDFBF7] p-4 ring-1 ring-[#141D19]/[0.07]">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#46534C] uppercase">
            Recent Wellness &amp; Vitals (
            {vitalsPrivateForFamily ? "Private" : data.vitalsLogs.length})
          </p>
          {vitalsPrivateForFamily ? (
            <p className="mt-1.5 text-sm text-[#617068]">
              {data.profile.name} has kept daily mood &amp; vitals check-ins
              private in Senior Sharing Settings.
            </p>
          ) : recentVitals.length > 0 ? (
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto pr-1">
              {recentVitals.map((v) => (
                <li
                  key={v.id}
                  className="rounded-xl bg-white px-3 py-2 text-xs ring-1 ring-[#141D19]/[0.06]"
                >
                  <div className="flex items-center justify-between font-semibold text-[#141D19]">
                    <span className="capitalize">Mood: {v.mood}</span>
                    <span className="font-mono-num text-[11px] text-[#617068]">
                      {v.recordedAt.slice(0, 10)}
                    </span>
                  </div>
                  <p className="font-mono-num mt-0.5 text-[11px] text-[#46534C]">
                    {v.systolic && v.diastolic
                      ? `BP ${v.systolic}/${v.diastolic} mmHg`
                      : "BP —"}{" "}
                    ·{" "}
                    {v.bloodSugarMgDl
                      ? `Sugar ${v.bloodSugarMgDl} mg/dL`
                      : "Sugar —"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-[#617068]">No check-ins yet.</p>
          )}
        </div>
      </BezelCard>

      <BezelCard className="md:col-span-7" innerClassName="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRinging
              size={20}
              weight="light"
              className="text-[#0F6B54]"
              aria-hidden="true"
            />
            <h2 className="font-display text-2xl text-[#141D19]">
              Refills, Interactions &amp; Care Alerts
            </h2>
          </div>
          <span className="font-mono-num rounded-full bg-[#FDFBF7] px-3 py-1 text-xs font-semibold text-[#46534C] ring-1 ring-[#141D19]/10">
            {totalAlertItems} items
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {totalAlertItems === 0 ? (
            <p className="rounded-2xl bg-[#FDFBF7] p-4 text-sm text-[#617068]">
              No active refill, allergy, or safety alerts right now.
            </p>
          ) : null}

          {data.allergyConflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="rounded-2xl bg-[#FEE4E2] p-3.5 text-[#7A1B14] ring-1 ring-[#B42318]/25"
            >
              <p className="text-sm font-bold">
                Allergy Conflict: {conflict.medicationName} vs &ldquo;
                {conflict.allergy}&rdquo;
              </p>
              <p className="mt-0.5 text-xs">{conflict.summary}</p>
              <p className="mt-1 text-xs font-semibold">{conflict.guidance}</p>
            </div>
          ))}

          {data.refillAlerts.map((refill) => (
            <div
              key={refill.medicationId}
              className={`flex items-center justify-between gap-3 rounded-2xl p-3.5 ring-1 ${
                refill.urgent
                  ? "bg-[#FEE4E2] text-[#7A1B14] ring-[#B42318]/20"
                  : "bg-[#FEF3C7] text-[#78350F] ring-[#B45309]/20"
              }`}
            >
              <div>
                <p className="text-sm font-bold">
                  Refill Needed: {refill.medicationName}
                </p>
                <p className="text-xs">
                  {refill.pillsRemaining} pills remaining (~{refill.daysLeft}{" "}
                  day{refill.daysLeft === 1 ? "" : "s"} left)
                </p>
              </div>
              {isCaretaker ? (
                <button
                  type="button"
                  onClick={() =>
                    void onRefillMedication(
                      refill.medicationId,
                      refill.pillsRemaining + 15
                    )
                  }
                  className="no-print font-mono-num min-h-[36px] rounded-full bg-white px-3 py-1 text-xs font-bold text-[#141D19] ring-1 ring-[#141D19]/10 hover:bg-[#FDFBF7]"
                >
                  +15 Refill
                </button>
              ) : null}
            </div>
          ))}

          {data.interactions.map((warn) => (
            <div
              key={warn.id}
              className="flex items-start gap-2.5 rounded-2xl bg-[#FDFBF7] p-3.5 ring-1 ring-[#141D19]/[0.08]"
            >
              <Warning
                size={18}
                weight="light"
                className="mt-0.5 shrink-0 text-[#B45309]"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-[#141D19]">
                  {warn.pairLabel}
                </p>
                <p className="text-xs text-[#46534C]">{warn.guidance}</p>
              </div>
            </div>
          ))}

          {data.alerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl p-3.5 ring-1 ${
                alert.severity === "critical"
                  ? "bg-[#FEE4E2] text-[#7A1B14] ring-[#B42318]/25"
                  : "bg-[#FDFBF7] text-[#141D19] ring-[#141D19]/[0.08]"
              }`}
            >
              <p className="text-sm font-semibold">{alert.title}</p>
              <p className="text-xs opacity-90">{alert.detail}</p>
            </div>
          ))}
        </div>
      </BezelCard>
    </div>
  );
}
