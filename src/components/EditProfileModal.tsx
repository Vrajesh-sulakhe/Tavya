"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "@phosphor-icons/react";
import type { PatientProfile } from "@/domain/types";

interface EditProfileModalProps {
  open: boolean;
  profile: PatientProfile;
  onClose: () => void;
  onSave: (profile: PatientProfile) => Promise<void>;
}

function splitCommaList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function EditProfileModal({
  open,
  profile,
  onClose,
  onSave,
}: EditProfileModalProps) {
  const nameRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(String(profile.age));
  const [caregiverName, setCaregiverName] = useState(profile.caregiverName);
  const [caregiverRelation, setCaregiverRelation] = useState(
    profile.caregiverRelation
  );
  const [caregiverPhone, setCaregiverPhone] = useState(profile.caregiverPhone);
  const [doctorName, setDoctorName] = useState(profile.doctorName);
  const [doctorPhone, setDoctorPhone] = useState(profile.doctorPhone);
  const [allergiesText, setAllergiesText] = useState(
    profile.allergies.join(", ")
  );
  const [conditionsText, setConditionsText] = useState(
    profile.conditions.join(", ")
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        age: Number(age) || 70,
        caregiverName: caregiverName.trim(),
        caregiverRelation: caregiverRelation.trim(),
        caregiverPhone: caregiverPhone.trim(),
        doctorName: doctorName.trim(),
        doctorPhone: doctorPhone.trim(),
        allergies: splitCommaList(allergiesText),
        conditions: splitCommaList(conditionsText),
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save care profile."
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
      aria-labelledby="edit-profile-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-[2rem] bg-[#F2EDE3] p-1.5 shadow-2xl">
        <div className="max-h-[90dvh] overflow-y-auto rounded-[calc(2rem-0.375rem)] bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <h2
              id="edit-profile-title"
              className="font-display text-3xl text-[#141D19]"
            >
              Edit Senior &amp; Care Profile
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close edit profile dialog"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#FDFBF7] text-[#141D19] ring-1 ring-[#141D19]/10"
            >
              <X size={20} weight="light" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-2">
                <span className="text-xs font-semibold text-[#46534C]">
                  Senior&apos;s Name *
                </span>
                <input
                  ref={nameRef}
                  required
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  Age *
                </span>
                <input
                  type="number"
                  required
                  min={1}
                  max={125}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="font-mono-num mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  Caregiver Name *
                </span>
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={caregiverName}
                  onChange={(e) => setCaregiverName(e.target.value)}
                  className="mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  Relation *
                </span>
                <input
                  required
                  minLength={2}
                  maxLength={40}
                  value={caregiverRelation}
                  onChange={(e) => setCaregiverRelation(e.target.value)}
                  className="mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  Caregiver Phone *
                </span>
                <input
                  required
                  minLength={5}
                  maxLength={30}
                  value={caregiverPhone}
                  onChange={(e) => setCaregiverPhone(e.target.value)}
                  className="font-mono-num mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  Doctor Name *
                </span>
                <input
                  required
                  minLength={2}
                  maxLength={80}
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  Doctor Phone *
                </span>
                <input
                  required
                  minLength={5}
                  maxLength={30}
                  value={doctorPhone}
                  onChange={(e) => setDoctorPhone(e.target.value)}
                  className="font-mono-num mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-[#46534C]">
                Known Allergies (comma-separated)
              </span>
              <input
                value={allergiesText}
                onChange={(e) => setAllergiesText(e.target.value)}
                placeholder="e.g. Penicillin, Sulfa drugs"
                className="mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-[#46534C]">
                Conditions (comma-separated)
              </span>
              <input
                value={conditionsText}
                onChange={(e) => setConditionsText(e.target.value)}
                placeholder="e.g. Hypertension, Type 2 Diabetes"
                className="mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm text-[#141D19] ring-1 ring-[#141D19]/15"
              />
            </label>

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
                {saving ? "Saving…" : "Save Profile"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
