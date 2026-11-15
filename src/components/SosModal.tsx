"use client";

import { useEffect, useRef } from "react";
import {
  ChatCircleText,
  PhoneCall,
  ShieldWarning,
  X,
} from "@phosphor-icons/react";
import type { Medication, PatientProfile } from "@/domain/types";

interface SosModalProps {
  open: boolean;
  onClose: () => void;
  profile: PatientProfile;
  medications: Medication[];
  onTriggerSos?: (
    channel: "call" | "whatsapp" | "sms" | "card"
  ) => Promise<void> | void;
}

export function SosModal({
  open,
  onClose,
  profile,
  medications,
  onTriggerSos,
}: SosModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const activeMeds = medications.filter((m) => m.active);
  const cleanCaregiverDigits = profile.caregiverPhone.replace(/[^\d]/g, "");
  const emergencyText = [
    `URGENT from ${profile.name} (${profile.age} yrs) via Tavya:`,
    `I need assistance right now.`,
    `Allergies: ${profile.allergies.length > 0 ? profile.allergies.join(", ") : "None"}`,
    `Active meds: ${activeMeds.length > 0 ? activeMeds.map((m) => `${m.name} ${m.dosage}`).join(", ") : "None listed"}`,
  ].join("\n");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#141D19]/50 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sos-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-[2rem] bg-[#FCE4E2] p-1.5 shadow-2xl">
        <div className="rounded-[calc(2rem-0.375rem)] bg-white p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FEE4E2] text-[#B42318]">
                <ShieldWarning size={26} weight="light" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#B42318] uppercase">
                  Emergency Assistance
                </p>
                <h2
                  id="sos-dialog-title"
                  className="font-display text-3xl text-[#141D19]"
                >
                  Caregiver &amp; Medical Card
                </h2>
              </div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close emergency dialog"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#FDFBF7] text-[#141D19] ring-1 ring-[#141D19]/10 hover:bg-[#F2EDE3]"
            >
              <X size={20} weight="light" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {profile.caregiverPhone.trim() ? (
              <div className="space-y-2">
                <a
                  href={`tel:${profile.caregiverPhone.replace(/\s+/g, "")}`}
                  onClick={() => {
                    void onTriggerSos?.("call");
                  }}
                  className="group flex min-h-[56px] w-full items-center justify-between rounded-full bg-[#B42318] px-6 py-3 text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#911B12] active:scale-[0.98]"
                >
                  <span className="text-left">
                    <span className="block text-xs uppercase tracking-[0.14em] text-white/80">
                      Primary Caregiver ({profile.caregiverRelation})
                    </span>
                    <span className="text-lg font-semibold">
                      Call {profile.caregiverName} · {profile.caregiverPhone}
                    </span>
                  </span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105">
                    <PhoneCall size={20} weight="light" aria-hidden="true" />
                  </span>
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://wa.me/${cleanCaregiverDigits}?text=${encodeURIComponent(emergencyText)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      void onTriggerSos?.("whatsapp");
                    }}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#E6F3EE] px-4 py-2 text-xs font-semibold text-[#0F6B54] hover:bg-[#D1EAE0]"
                  >
                    <ChatCircleText size={16} weight="light" aria-hidden="true" />
                    <span>WhatsApp Alert</span>
                  </a>
                  <a
                    href={`sms:${profile.caregiverPhone.replace(/\s+/g, "")}?&body=${encodeURIComponent(emergencyText)}`}
                    onClick={() => {
                      void onTriggerSos?.("sms");
                    }}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#FDFBF7] px-4 py-2 text-xs font-semibold text-[#141D19] ring-1 ring-[#141D19]/12 hover:bg-[#F2EDE3]"
                  >
                    <ChatCircleText size={16} weight="light" aria-hidden="true" />
                    <span>Send SMS Alert</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#FEE4E2] px-5 py-3.5 text-sm text-[#7A1B14]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Primary Caregiver ({profile.caregiverRelation})
                </p>
                <p className="mt-1 font-semibold">
                  {profile.caregiverName} · Add phone number in Caregiver Hub
                </p>
              </div>
            )}

            {profile.doctorPhone.trim() ? (
              <a
                href={`tel:${profile.doctorPhone.replace(/\s+/g, "")}`}
                className="flex min-h-[52px] w-full items-center justify-between rounded-full bg-[#FDFBF7] px-6 py-3 text-[#141D19] ring-1 ring-[#141D19]/12 transition-colors hover:bg-[#F2EDE3]"
              >
                <span>
                  <span className="block text-xs font-medium text-[#46534C]">
                    Attending Physician
                  </span>
                  <span className="font-semibold">
                    {profile.doctorName} · {profile.doctorPhone}
                  </span>
                </span>
                <PhoneCall size={20} weight="light" aria-hidden="true" />
              </a>
            ) : (
              <div className="rounded-2xl bg-[#FDFBF7] px-5 py-3.5 text-sm text-[#46534C] ring-1 ring-[#141D19]/10">
                <p className="text-xs font-medium">Attending Physician</p>
                <p className="mt-0.5 font-semibold text-[#141D19]">
                  {profile.doctorName} · No phone number added yet
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl bg-[#FDFBF7] p-4 ring-1 ring-[#141D19]/[0.07]">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#46534C] uppercase">
              First-Responder Snapshot · {profile.name} ({profile.age} yrs)
            </p>
            <p className="mt-2 text-sm text-[#141D19]">
              <strong>Allergies:</strong>{" "}
              {profile.allergies.length > 0
                ? profile.allergies.join(", ")
                : "None reported"}
            </p>
            <p className="mt-1 text-sm text-[#141D19]">
              <strong>Conditions:</strong>{" "}
              {profile.conditions.length > 0
                ? profile.conditions.join(", ")
                : "None listed"}
            </p>
            <p className="mt-2 text-xs font-semibold text-[#46534C]">
              Active Medications ({activeMeds.length}):
            </p>
            {activeMeds.length > 0 ? (
              <ul className="mt-1 space-y-1 text-sm text-[#141D19]">
                {activeMeds.map((med) => (
                  <li key={med.id}>
                    • {med.name}{" "}
                    <span className="font-mono-num text-xs text-[#46534C]">
                      ({med.dosage})
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-[#617068]">
                No medications added yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
