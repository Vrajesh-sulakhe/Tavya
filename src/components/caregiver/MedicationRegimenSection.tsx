"use client";

import {
  CheckCircle,
  PauseCircle,
  PencilSimple,
  PlayCircle,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import type { DoseSlot, DoseStatus, Medication } from "@/domain/types";
import { BezelCard } from "../ui/BezelCard";
import { PillVisual } from "../ui/PillVisual";
import { Reveal } from "../ui/Reveal";

interface MedicationRegimenSectionProps {
  medications: Medication[];
  patientName: string;
  isCaretaker: boolean;
  onAddClick: () => void;
  onEditClick: (med: Medication) => void;
  onDoseAction: (
    medicationId: string,
    slot: DoseSlot,
    status: DoseStatus
  ) => Promise<void>;
  onToggleMedicationActive: (id: string, active: boolean) => Promise<void>;
  onDeleteMedication: (id: string) => Promise<void>;
}

export function MedicationRegimenSection({
  medications,
  patientName,
  isCaretaker,
  onAddClick,
  onEditClick,
  onDoseAction,
  onToggleMedicationActive,
  onDeleteMedication,
}: MedicationRegimenSectionProps) {
  return (
    <Reveal delayMs={120}>
      <section aria-labelledby="med-manager-heading">
        <BezelCard innerClassName="p-5 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="med-manager-heading"
                className="font-display text-3xl text-[#141D19]"
              >
                Medication Regimen ({medications.length})
              </h2>
              <p className="text-sm text-[#46534C]">
                {isCaretaker
                  ? `Add, edit, refill, pause, or log medications for ${patientName}.`
                  : `Read-only medication regimen for ${patientName}.`}
              </p>
            </div>

            {isCaretaker ? (
              <button
                type="button"
                onClick={onAddClick}
                className="no-print group inline-flex min-h-[48px] w-full items-center justify-between gap-3 rounded-full bg-[#141D19] py-2 pr-2 pl-5 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#27352E] active:scale-[0.98] sm:w-auto sm:self-start"
              >
                <span>Add Medication</span>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                  <Plus size={16} weight="light" aria-hidden="true" />
                </span>
              </button>
            ) : null}
          </div>

          <div className="mt-6 space-y-3">
            {medications.length === 0 ? (
              <div className="rounded-2xl bg-[#FDFBF7] p-6 text-center ring-1 ring-[#141D19]/[0.07]">
                <p className="text-sm font-semibold text-[#141D19]">
                  No medications scheduled yet.
                </p>
                <p className="mt-1 text-xs text-[#46534C]">
                  Click &ldquo;Add Medication&rdquo; above or paste a
                  prescription into the AI Assistant to build a custom schedule.
                </p>
              </div>
            ) : null}

            {medications.map((med) => (
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

                {isCaretaker ? (
                  <div className="no-print flex flex-wrap items-center gap-2">
                    {med.active && med.slots[0] ? (
                      <button
                        type="button"
                        onClick={() =>
                          void onDoseAction(med.id, med.slots[0]!, "taken")
                        }
                        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#E6F3EE] px-4 py-2 text-xs font-semibold text-[#0F6B54] hover:bg-[#D1EAE0]"
                      >
                        <CheckCircle size={16} weight="light" aria-hidden="true" />
                        <span>Log {med.slots[0]}</span>
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => onEditClick(med)}
                      aria-label={`Edit ${med.name}`}
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-[#141D19] ring-1 ring-[#141D19]/12 hover:bg-[#F2EDE3]"
                    >
                      <PencilSimple size={16} weight="light" aria-hidden="true" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void onToggleMedicationActive(med.id, !med.active)
                      }
                      aria-label={
                        med.active ? `Pause ${med.name}` : `Resume ${med.name}`
                      }
                      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-[#46534C] ring-1 ring-[#141D19]/12 hover:bg-[#F2EDE3]"
                    >
                      {med.active ? (
                        <>
                          <PauseCircle size={16} weight="light" aria-hidden="true" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <PlayCircle size={16} weight="light" aria-hidden="true" />
                          <span>Resume</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => void onDeleteMedication(med.id)}
                      aria-label={`Remove ${med.name}`}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white text-[#B42318] ring-1 ring-[#B42318]/20 hover:bg-[#FEE4E2]"
                    >
                      <Trash size={16} weight="light" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </BezelCard>
      </section>
    </Reveal>
  );
}
