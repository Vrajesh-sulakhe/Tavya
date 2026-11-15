"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "@phosphor-icons/react";
import { SLOT_ORDER } from "@/domain/schedule";
import type {
  DoseSlot,
  MealTiming,
  Medication,
  PillAppearance,
} from "@/domain/types";

export interface NewMedicationPayload {
  name: string;
  dosage: string;
  purpose: string;
  instructions: string;
  slots: DoseSlot[];
  mealTiming: MealTiming;
  appearance: PillAppearance;
  pillsRemaining: number;
  refillThresholdDays: number;
}

interface AddMedicationModalProps {
  open: boolean;
  initialMedication?: Medication | null;
  defaultSlots?: DoseSlot[];
  onClose: () => void;
  onSubmit: (
    payload: NewMedicationPayload,
    editingId?: string
  ) => Promise<void>;
}

export function AddMedicationModal({
  open,
  initialMedication = null,
  defaultSlots = ["morning"],
  onClose,
  onSubmit,
}: AddMedicationModalProps) {
  const nameRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(initialMedication?.name ?? "");
  const [dosage, setDosage] = useState(initialMedication?.dosage ?? "");
  const [purpose, setPurpose] = useState(
    initialMedication?.purpose ?? "Daily Care"
  );
  const [instructions, setInstructions] = useState(
    initialMedication?.instructions ?? ""
  );
  const [slots, setSlots] = useState<DoseSlot[]>(
    initialMedication?.slots ?? defaultSlots
  );
  const [mealTiming, setMealTiming] = useState<MealTiming>(
    initialMedication?.mealTiming ?? "after_food"
  );
  const [appearance, setAppearance] = useState<PillAppearance>(
    initialMedication?.appearance ?? "white_round"
  );
  const [pillsRemaining, setPillsRemaining] = useState(
    String(initialMedication?.pillsRemaining ?? 20)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    nameRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function toggleSlot(slot: DoseSlot) {
    setSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (slots.length === 0) {
      setError("Please select at least one daily time slot.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(
        {
          name,
          dosage,
          purpose,
          instructions:
            instructions.trim() ||
            `Take ${dosage} ${name} (${mealTiming.replace("_", " ")})`,
          slots,
          mealTiming,
          appearance,
          pillsRemaining: Number(pillsRemaining) || 0,
          refillThresholdDays: initialMedication?.refillThresholdDays ?? 5,
        },
        initialMedication?.id
      );
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save medication."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#141D19]/45 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-med-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-[2rem] bg-[#F2EDE3] p-1.5 shadow-2xl">
        <div className="max-h-[90dvh] overflow-y-auto rounded-[calc(2rem-0.375rem)] bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2
              id="add-med-title"
              className="font-display text-3xl text-[#141D19]"
            >
              {initialMedication ? "Edit Medication" : "Add Medication"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close medication dialog"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#FDFBF7] text-[#141D19] ring-1 ring-[#141D19]/10"
            >
              <X size={20} weight="light" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  Medicine Name *
                </span>
                <input
                  ref={nameRef}
                  required
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Lisinopril"
                  className="mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  Dosage *
                </span>
                <input
                  required
                  maxLength={40}
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g. 10 mg"
                  className="font-mono-num mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  Purpose
                </span>
                <input
                  required
                  maxLength={80}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  Pills Remaining
                </span>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={pillsRemaining}
                  onChange={(e) => setPillsRemaining(e.target.value)}
                  className="font-mono-num mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-[#46534C]">
                Plain-language instructions for senior
              </span>
              <input
                maxLength={220}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. 1 small white tablet after breakfast"
                className="mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
              />
            </label>

            <fieldset>
              <legend className="text-xs font-semibold text-[#46534C]">
                Daily Time Slots *
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {SLOT_ORDER.map((slot) => {
                  const active = slots.includes(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleSlot(slot)}
                      className={`min-h-[40px] rounded-full px-4 py-1.5 text-xs font-semibold capitalize ring-1 ${
                        active
                          ? "bg-[#0F6B54] text-white ring-[#0F6B54]"
                          : "bg-[#FDFBF7] text-[#46534C] ring-[#141D19]/12"
                      }`}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  Meal Timing
                </span>
                <select
                  value={mealTiming}
                  onChange={(e) => setMealTiming(e.target.value as MealTiming)}
                  className="mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
                >
                  <option value="after_food">After food</option>
                  <option value="before_food">Before food</option>
                  <option value="with_water">With full glass of water</option>
                  <option value="anytime">Anytime</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  Pill Visual Cue
                </span>
                <select
                  value={appearance}
                  onChange={(e) =>
                    setAppearance(e.target.value as PillAppearance)
                  }
                  className="mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
                >
                  <option value="white_round">White round tablet</option>
                  <option value="sky_tablet">Sky-blue tablet</option>
                  <option value="amber_capsule">Amber capsule</option>
                  <option value="sage_oval">Sage oval tablet</option>
                  <option value="rose_coated">Rose-coated tablet</option>
                </select>
              </label>
            </div>

            {error ? (
              <p className="text-sm font-semibold text-[#B42318]" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] rounded-full px-5 py-2 text-sm font-semibold text-[#46534C] hover:bg-[#F2EDE3]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] rounded-full bg-[#0F6B54] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0B5341] disabled:opacity-60"
              >
                {saving
                  ? "Saving…"
                  : initialMedication
                    ? "Save Changes"
                    : "Save Medication"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
