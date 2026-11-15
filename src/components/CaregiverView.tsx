"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowCounterClockwise,
  BellRinging,
  CalendarCheck,
  CheckCircle,
  Copy,
  Eraser,
  NotePencil,
  PauseCircle,
  PencilSimple,
  PlayCircle,
  Plus,
  Printer,
  ShareNetwork,
  Trash,
  UserGear,
  Warning,
} from "@phosphor-icons/react";
import { SLOT_ORDER } from "@/domain/schedule";
import type {
  CareNoteCategory,
  DashboardPayload,
  DoseSlot,
  DoseStatus,
  MatrixCellState,
  Medication,
  ParsedPrescriptionItem,
  PatientProfile,
  PrescriptionAnalysisResult,
} from "@/domain/types";
import {
  AddMedicationModal,
  type NewMedicationPayload,
} from "./AddMedicationModal";
import { EditProfileModal } from "./EditProfileModal";
import {
  PrescriptionAnalyzer,
  type PrescriptionImageInput,
} from "./PrescriptionAnalyzer";
import { BezelCard } from "./ui/BezelCard";
import { PillVisual } from "./ui/PillVisual";
import { Reveal } from "./ui/Reveal";

interface CaregiverViewProps {
  data: DashboardPayload;
  onDoseAction: (
    medicationId: string,
    slot: DoseSlot,
    status: DoseStatus
  ) => Promise<void>;
  onCreateMedication: (payload: NewMedicationPayload) => Promise<void>;
  onUpdateMedication: (
    id: string,
    payload: Partial<NewMedicationPayload> & { active?: boolean }
  ) => Promise<void>;
  onDeleteMedication: (id: string) => Promise<void>;
  onToggleMedicationActive: (id: string, active: boolean) => Promise<void>;
  onUpdateProfile: (profile: PatientProfile) => Promise<void>;
  onAnalyzePrescription: (
    text: string,
    image?: PrescriptionImageInput
  ) => Promise<PrescriptionAnalysisResult>;
  onAddParsedItems: (items: ParsedPrescriptionItem[]) => Promise<void>;
  onCreateNote?: (payload: {
    category: CareNoteCategory;
    text: string;
    scheduledDate?: string;
  }) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
  onResetDemo: () => Promise<void>;
  onClearSchedule: () => Promise<void>;
}

const MATRIX_DOT_STYLE: Record<MatrixCellState, string> = {
  taken: "bg-[#0F6B54]",
  snoozed: "bg-[#F59E0B]",
  skipped: "bg-[#B42318]",
  pending: "bg-[#141D19]/15",
  none: "bg-transparent ring-1 ring-[#141D19]/10",
};

export function CaregiverView({
  data,
  onDoseAction,
  onCreateMedication,
  onUpdateMedication,
  onDeleteMedication,
  onToggleMedicationActive,
  onUpdateProfile,
  onAnalyzePrescription,
  onAddParsedItems,
  onCreateNote,
  onDeleteNote,
  onResetDemo,
  onClearSchedule,
}: CaregiverViewProps) {
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [noteCategory, setNoteCategory] = useState<CareNoteCategory>("note");
  const [noteText, setNoteText] = useState("");
  const [noteDate, setNoteDate] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const recentVitals = data.vitalsLogs.slice(0, 20);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset =
    circumference - (data.adherence.sevenDayPercent / 100) * circumference;

  const latestVital = recentVitals[0];
  const shareSummaryText = [
    `Tavya Care Update (${data.todayKey}) — ${data.profile.name} (${data.profile.age})`,
    `• Today's doses: ${data.adherence.todayTaken}/${data.adherence.todayTotal} (${data.adherence.todayPercent}%) | 7-day: ${data.adherence.sevenDayPercent}%`,
    latestVital
      ? `• Latest check-in (${latestVital.mood}): ${latestVital.systolic && latestVital.diastolic ? `BP ${latestVital.systolic}/${latestVital.diastolic} mmHg` : "BP —"}${latestVital.bloodSugarMgDl ? `, Sugar ${latestVital.bloodSugarMgDl} mg/dL` : ""}`
      : "• No wellness check-in logged today",
    data.refillAlerts.length > 0
      ? `• Refills needed: ${data.refillAlerts.map((r) => `${r.medicationName} (${r.pillsRemaining} left)`).join(", ")}`
      : "• Refills: All stocks healthy",
  ].join("\n");

  async function handleCopyShare() {
    try {
      await navigator.clipboard.writeText(shareSummaryText);
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      setCopiedShare(false);
    }
  }

  async function handleNoteSubmit(e: FormEvent) {
    e.preventDefault();
    if (!onCreateNote || noteText.trim().length < 2) return;
    setSavingNote(true);
    try {
      await onCreateNote({
        category: noteCategory,
        text: noteText.trim(),
        scheduledDate:
          noteCategory === "appointment" && noteDate ? noteDate : undefined,
      });
      setNoteText("");
      setNoteDate("");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleSaveMedication(
    payload: NewMedicationPayload,
    editingId?: string
  ) {
    if (editingId) {
      await onUpdateMedication(editingId, payload);
    } else {
      await onCreateMedication(payload);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-3 pt-5 pb-10 sm:space-y-10 sm:px-4 sm:py-12">
      <Reveal>
        <section aria-labelledby="caregiver-heading" className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full bg-[#E6F3EE] px-3.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-[#0F6B54] uppercase">
                Caregiver Hub · {data.profile.caregiverName}
              </span>
              <h1
                id="caregiver-heading"
                className="font-display mt-3 text-4xl leading-[1.08] text-[#141D19] sm:text-5xl"
              >
                {data.profile.name}&apos;s Care Overview
              </h1>
              <p className="mt-2 text-[#46534C]">
                Live adherence, refill readiness, wellness check-ins, and AI
                prescription safety screening.
              </p>
            </div>

            <div className="no-print grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => setProfileModalOpen(true)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#0F6B54] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B5341] sm:text-sm"
              >
                <UserGear size={18} weight="light" aria-hidden="true" />
                <span>Edit Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setShareOpen((prev) => !prev)}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0F6B54] ring-1 ring-[#0F6B54]/25 hover:bg-[#E6F3EE] sm:text-sm"
              >
                <ShareNetwork size={18} weight="light" aria-hidden="true" />
                <span>Share Update</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#141D19] ring-1 ring-[#141D19]/12 hover:bg-[#F2EDE3] sm:text-sm"
              >
                <Printer size={18} weight="light" aria-hidden="true" />
                <span>Doctor Summary</span>
              </button>
              <button
                type="button"
                onClick={onClearSchedule}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#46534C] ring-1 ring-[#141D19]/12 hover:bg-[#F2EDE3] sm:text-sm"
              >
                <Eraser size={18} weight="light" aria-hidden="true" />
                <span>Start Blank</span>
              </button>
              <button
                type="button"
                onClick={onResetDemo}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#46534C] ring-1 ring-[#141D19]/12 hover:bg-[#F2EDE3] sm:text-sm"
              >
                <ArrowCounterClockwise
                  size={18}
                  weight="light"
                  aria-hidden="true"
                />
                <span>Load Sample</span>
              </button>
            </div>
          </div>

          {shareOpen ? (
            <BezelCard innerClassName="p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <pre className="font-mono-num whitespace-pre-wrap text-xs text-[#141D19]">
                  {shareSummaryText}
                </pre>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopyShare}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#141D19] px-4 py-2 text-xs font-semibold text-white hover:bg-[#27352E]"
                  >
                    <Copy size={16} weight="light" aria-hidden="true" />
                    <span>{copiedShare ? "Copied!" : "Copy Summary"}</span>
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(shareSummaryText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#0F6B54] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B5341]"
                  >
                    <ShareNetwork size={16} weight="light" aria-hidden="true" />
                    <span>Send on WhatsApp</span>
                  </a>
                </div>
              </div>
            </BezelCard>
          ) : null}

          <div className="print-only rounded-2xl border border-[#141D19]/20 p-6">
            <h2 className="font-display text-2xl">
              Tavya Clinical Summary · {data.todayKey}
            </h2>
            <p className="mt-1 text-sm">
              Patient: {data.profile.name} ({data.profile.age} yrs) · Allergies:{" "}
              {data.profile.allergies.length > 0
                ? data.profile.allergies.join(", ")
                : "None reported"}{" "}
              · Conditions:{" "}
              {data.profile.conditions.length > 0
                ? data.profile.conditions.join(", ")
                : "None listed"}
            </p>
            <p className="mt-1 text-sm">
              7-Day Adherence: {data.adherence.sevenDayPercent}% · Today:{" "}
              {data.adherence.todayTaken}/{data.adherence.todayTotal} doses
            </p>
          </div>

          {/* Asymmetrical Bento Row */}
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
                  Recent Wellness &amp; Vitals ({data.vitalsLogs.length})
                </p>
                {recentVitals.length > 0 ? (
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
                  {data.allergyConflicts.length +
                    data.refillAlerts.length +
                    data.interactions.length +
                    data.alerts.length}{" "}
                  items
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {data.allergyConflicts.length === 0 &&
                data.refillAlerts.length === 0 &&
                data.interactions.length === 0 &&
                data.alerts.length === 0 ? (
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
                    <p className="mt-1 text-xs font-semibold">
                      {conflict.guidance}
                    </p>
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
                        {refill.pillsRemaining} pills remaining (~
                        {refill.daysLeft} day{refill.daysLeft === 1 ? "" : "s"}{" "}
                        left)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMedication(refill.medicationId, {
                          pillsRemaining: refill.pillsRemaining + 15,
                        })
                      }
                      className="no-print font-mono-num min-h-[36px] rounded-full bg-white px-3 py-1 text-xs font-bold text-[#141D19] ring-1 ring-[#141D19]/10 hover:bg-[#FDFBF7]"
                    >
                      +15 Refill
                    </button>
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
        </section>
      </Reveal>

      {/* AI Prescription Simplifier */}
      <Reveal delayMs={80}>
        <PrescriptionAnalyzer
          onAnalyzePrescription={onAnalyzePrescription}
          onAddParsedItems={onAddParsedItems}
        />
      </Reveal>

      {/* Medication Regimen Manager */}
      <Reveal delayMs={120}>
        <section aria-labelledby="med-manager-heading">
          <BezelCard innerClassName="p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2
                  id="med-manager-heading"
                  className="font-display text-3xl text-[#141D19]"
                >
                  Medication Regimen ({data.medications.length})
                </h2>
                <p className="text-sm text-[#46534C]">
                  Add, edit, refill, pause, or log medications for{" "}
                  {data.profile.name}.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingMed(null);
                  setMedModalOpen(true);
                }}
                className="no-print group inline-flex min-h-[48px] w-full items-center justify-between gap-3 rounded-full bg-[#141D19] py-2 pr-2 pl-5 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#27352E] active:scale-[0.98] sm:w-auto sm:self-start"
              >
                <span>Add Medication</span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                  <Plus size={16} weight="light" aria-hidden="true" />
                </span>
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {data.medications.length === 0 ? (
                <div className="rounded-2xl bg-[#FDFBF7] p-6 text-center ring-1 ring-[#141D19]/[0.07]">
                  <p className="text-sm font-semibold text-[#141D19]">
                    No medications scheduled yet.
                  </p>
                  <p className="mt-1 text-xs text-[#46534C]">
                    Click &ldquo;Add Medication&rdquo; above or paste a
                    prescription into the AI Assistant to build a custom
                    schedule.
                  </p>
                </div>
              ) : null}

              {data.medications.map((med) => (
                <div
                  key={med.id}
                  className={`flex flex-col justify-between gap-4 rounded-2xl p-4 ring-1 sm:flex-row sm:items-center ${
                    med.active
                      ? "bg-[#FDFBF7] ring-[#141D19]/[0.08]"
                      : "bg-[#F4F2ED]/60 opacity-70 ring-[#141D19]/[0.05]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <PillVisual appearance={med.appearance} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[#141D19]">
                          {med.name}{" "}
                          <span className="font-mono-num text-xs text-[#46534C]">
                            {med.dosage}
                          </span>
                        </p>
                        <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-[#0F6B54] ring-1 ring-[#0F6B54]/20">
                          {med.purpose}
                        </span>
                        {!med.active ? (
                          <span className="rounded-full bg-[#E5E7EB] px-2.5 py-0.5 text-xs font-semibold text-[#374151]">
                            Paused
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-[#46534C]">
                        {med.instructions}
                      </p>
                      <p className="font-mono-num mt-1 text-xs text-[#617068]">
                        Slots: {med.slots.join(", ")} · Stock:{" "}
                        {med.pillsRemaining} pills
                      </p>
                    </div>
                  </div>

                  <div className="no-print flex flex-wrap items-center gap-2">
                    {med.active && med.slots[0] ? (
                      <button
                        type="button"
                        onClick={() =>
                          onDoseAction(med.id, med.slots[0]!, "taken")
                        }
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#E6F3EE] px-4 py-2 text-xs font-semibold text-[#0F6B54] hover:bg-[#D1EAE0]"
                      >
                        <CheckCircle
                          size={16}
                          weight="light"
                          aria-hidden="true"
                        />
                        <span>Log {med.slots[0]}</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setEditingMed(med);
                        setMedModalOpen(true);
                      }}
                      aria-label={`Edit ${med.name}`}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-[#141D19] ring-1 ring-[#141D19]/12 hover:bg-[#F2EDE3]"
                    >
                      <PencilSimple
                        size={16}
                        weight="light"
                        aria-hidden="true"
                      />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onToggleMedicationActive(med.id, !med.active)
                      }
                      aria-label={
                        med.active
                          ? `Pause ${med.name}`
                          : `Resume ${med.name}`
                      }
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-[#46534C] ring-1 ring-[#141D19]/12 hover:bg-[#F2EDE3]"
                    >
                      {med.active ? (
                        <>
                          <PauseCircle
                            size={16}
                            weight="light"
                            aria-hidden="true"
                          />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle
                            size={16}
                            weight="light"
                            aria-hidden="true"
                          />
                          <span>Resume</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteMedication(med.id)}
                      aria-label={`Remove ${med.name}`}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white text-[#B42318] ring-1 ring-[#B42318]/20 hover:bg-[#FEE4E2]"
                    >
                      <Trash size={16} weight="light" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </BezelCard>
        </section>
      </Reveal>

      {/* Caregiver Shift Notes & Doctor Visits */}
      {onCreateNote ? (
        <Reveal delayMs={150}>
          <section aria-labelledby="care-notes-heading" className="no-print">
            <BezelCard innerClassName="p-5 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2
                    id="care-notes-heading"
                    className="font-display text-3xl text-[#141D19]"
                  >
                    Caregiver Shift Notes &amp; Doctor Visits
                  </h2>
                  <p className="text-sm text-[#46534C]">
                    Share handover notes across family caregivers or pin the
                    next doctor appointment onto Senior Day.
                  </p>
                </div>
                <div className="inline-flex rounded-full bg-[#F2EDE3] p-1 ring-1 ring-[#141D19]/[0.06]">
                  <button
                    type="button"
                    onClick={() => setNoteCategory("note")}
                    className={`min-h-[38px] rounded-full px-3.5 text-xs font-semibold transition-colors ${
                      noteCategory === "note"
                        ? "bg-[#141D19] text-white"
                        : "text-[#46534C]"
                    }`}
                  >
                    Shift Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteCategory("appointment")}
                    className={`min-h-[38px] rounded-full px-3.5 text-xs font-semibold transition-colors ${
                      noteCategory === "appointment"
                        ? "bg-[#0F6B54] text-white"
                        : "text-[#46534C]"
                    }`}
                  >
                    Doctor Visit
                  </button>
                </div>
              </div>

              <form
                onSubmit={handleNoteSubmit}
                className="mt-5 flex flex-col gap-2.5 sm:flex-row"
              >
                <input
                  type="text"
                  minLength={2}
                  maxLength={240}
                  required
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder={
                    noteCategory === "appointment"
                      ? "e.g. Cardiology check-up with Dr. Mehta at 10:30 AM"
                      : "e.g. Ordered 1 strip of Amlodipine; check knee swelling tonight"
                  }
                  aria-label="Caregiver note or appointment details"
                  className="flex-1 rounded-2xl bg-[#FDFBF7] px-4 py-3 text-sm text-[#141D19] ring-1 ring-[#141D19]/12"
                />
                {noteCategory === "appointment" ? (
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    aria-label="Appointment date"
                    className="font-mono-num rounded-2xl bg-[#FDFBF7] px-4 py-3 text-sm text-[#141D19] ring-1 ring-[#141D19]/12"
                  />
                ) : null}
                <button
                  type="submit"
                  disabled={savingNote || noteText.trim().length < 2}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0F6B54] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0B5341] disabled:opacity-60"
                >
                  <Plus size={16} weight="bold" aria-hidden="true" />
                  <span>{savingNote ? "Saving…" : "Pin Entry"}</span>
                </button>
              </form>

              <div className="mt-5 space-y-2.5">
                {(data.careNotes ?? []).length === 0 ? (
                  <p className="rounded-2xl bg-[#FDFBF7] px-4 py-4 text-sm text-[#617068]">
                    No caregiver notes or upcoming visits pinned yet.
                  </p>
                ) : (
                  (data.careNotes ?? []).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between gap-3 rounded-2xl bg-[#FDFBF7] p-3.5 ring-1 ring-[#141D19]/[0.07]"
                    >
                      <div className="flex items-start gap-2.5">
                        {entry.category === "appointment" ? (
                          <CalendarCheck
                            size={18}
                            weight="light"
                            className="mt-0.5 shrink-0 text-[#0F6B54]"
                            aria-hidden="true"
                          />
                        ) : (
                          <NotePencil
                            size={18}
                            weight="light"
                            className="mt-0.5 shrink-0 text-[#46534C]"
                            aria-hidden="true"
                          />
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                                entry.category === "appointment"
                                  ? "bg-[#E6F3EE] text-[#0F6B54]"
                                  : "bg-white text-[#46534C] ring-1 ring-[#141D19]/10"
                              }`}
                            >
                              {entry.category === "appointment"
                                ? "Doctor Visit"
                                : "Shift Note"}
                            </span>
                            {entry.scheduledDate ? (
                              <span className="font-mono-num text-xs font-semibold text-[#0F6B54]">
                                {entry.scheduledDate}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm text-[#141D19]">
                            {entry.text}
                          </p>
                        </div>
                      </div>

                      {onDeleteNote ? (
                        <button
                          type="button"
                          onClick={() => onDeleteNote(entry.id)}
                          aria-label="Delete care note"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#B42318] ring-1 ring-[#B42318]/15 hover:bg-[#FEE4E2]"
                        >
                          <Trash size={15} weight="light" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </BezelCard>
          </section>
        </Reveal>
      ) : null}

      {medModalOpen ? (
        <AddMedicationModal
          key={editingMed?.id ?? "new"}
          open={medModalOpen}
          initialMedication={editingMed}
          onClose={() => {
            setMedModalOpen(false);
            setEditingMed(null);
          }}
          onSubmit={handleSaveMedication}
        />
      ) : null}

      {profileModalOpen ? (
        <EditProfileModal
          open={profileModalOpen}
          profile={data.profile}
          onClose={() => setProfileModalOpen(false)}
          onSave={onUpdateProfile}
        />
      ) : null}
    </div>
  );
}
