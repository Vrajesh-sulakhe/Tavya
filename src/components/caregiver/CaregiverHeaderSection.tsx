"use client";

import { useMemo, useState } from "react";
import {
  ArrowCounterClockwise,
  Copy,
  Eraser,
  Printer,
  ShareNetwork,
  UserGear,
} from "@phosphor-icons/react";
import type {
  AdherenceStats,
  CircleRole,
  PatientProfile,
  RefillAlert,
  VitalsLog,
} from "@/domain/types";
import { BezelCard } from "../ui/BezelCard";

interface CaregiverHeaderSectionProps {
  viewerRole: CircleRole;
  profile: PatientProfile;
  todayKey: string;
  adherence: AdherenceStats;
  vitalsPrivateForFamily: boolean;
  latestVital: VitalsLog | undefined;
  refillAlerts: RefillAlert[];
  onEditProfile: () => void;
  onClearSchedule: () => Promise<void>;
  onResetDemo: () => Promise<void>;
}

export function CaregiverHeaderSection({
  viewerRole,
  profile,
  todayKey,
  adherence,
  vitalsPrivateForFamily,
  latestVital,
  refillAlerts,
  onEditProfile,
  onClearSchedule,
  onResetDemo,
}: CaregiverHeaderSectionProps) {
  const isCaretaker = viewerRole === "caretaker";
  const [shareOpen, setShareOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const shareSummaryText = useMemo(() => {
    const bpText =
      latestVital?.systolic && latestVital?.diastolic
        ? `BP ${latestVital.systolic}/${latestVital.diastolic} mmHg`
        : "BP —";
    const sugarText = latestVital?.bloodSugarMgDl
      ? `, Sugar ${latestVital.bloodSugarMgDl} mg/dL`
      : "";
    return [
      `Tavya Care Update (${todayKey}) — ${profile.name} (${profile.age})`,
      `• Today's doses: ${adherence.todayTaken}/${adherence.todayTotal} (${adherence.todayPercent}%) | 7-day: ${adherence.sevenDayPercent}%`,
      vitalsPrivateForFamily
        ? "• Daily mood & vitals kept private per Senior Sharing Preferences"
        : latestVital
          ? `• Latest check-in (${latestVital.mood}): ${bpText}${sugarText}`
          : "• No wellness check-in logged today",
      refillAlerts.length > 0
        ? `• Refills needed: ${refillAlerts.map((r) => `${r.medicationName} (${r.pillsRemaining} left)`).join(", ")}`
        : "• Refills: All stocks healthy",
    ].join("\n");
  }, [
    adherence.sevenDayPercent,
    adherence.todayPercent,
    adherence.todayTaken,
    adherence.todayTotal,
    latestVital,
    profile.age,
    profile.name,
    refillAlerts,
    todayKey,
    vitalsPrivateForFamily,
  ]);

  async function handleCopyShare() {
    try {
      await navigator.clipboard.writeText(shareSummaryText);
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      setCopiedShare(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-[#E6F3EE] px-3.5 py-1 text-[11px] font-semibold tracking-[0.18em] text-[#0F6B54] uppercase">
            {viewerRole === "family"
              ? `Family Hub · ${profile.caregiverName}`
              : `Caregiver Hub · ${profile.caregiverName}`}
          </span>
          <h1
            id="caregiver-heading"
            className="font-display mt-3 text-4xl leading-[1.08] text-[#141D19] sm:text-5xl"
          >
            {profile.name}&apos;s Care Overview
          </h1>
          <p className="mt-2 text-[#46534C]">
            {viewerRole === "family"
              ? "Family read & coordination view for adherence, doctor visits, and shift notes."
              : "Live adherence, refill readiness, wellness check-ins, and AI prescription safety screening."}
          </p>
        </div>

        <div className="no-print grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {isCaretaker ? (
            <button
              type="button"
              onClick={onEditProfile}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#0F6B54] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B5341] sm:text-sm"
            >
              <UserGear size={18} weight="light" aria-hidden="true" />
              <span>Edit Profile</span>
            </button>
          ) : null}
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
          {isCaretaker ? (
            <>
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
                <ArrowCounterClockwise size={18} weight="light" aria-hidden="true" />
                <span>Load Sample</span>
              </button>
            </>
          ) : null}
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
          Tavya Clinical Summary · {todayKey}
        </h2>
        <p className="mt-1 text-sm">
          Patient: {profile.name} ({profile.age} yrs) · Allergies:{" "}
          {profile.allergies.length > 0
            ? profile.allergies.join(", ")
            : "None reported"}{" "}
          · Conditions:{" "}
          {profile.conditions.length > 0
            ? profile.conditions.join(", ")
            : "None listed"}
        </p>
        <p className="mt-1 text-sm">
          7-Day Adherence: {adherence.sevenDayPercent}% · Today:{" "}
          {adherence.todayTaken}/{adherence.todayTotal} doses
        </p>
      </div>
    </>
  );
}
