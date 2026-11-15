"use client";

import {
  Heartbeat,
  PhoneCall,
  Pill,
  SignOut,
  TextAa,
  UsersThree,
} from "@phosphor-icons/react";
import type { CircleRole } from "@/domain/types";

export type AppMode = "senior" | "caregiver";
export type TextScale = "standard" | "xl";

interface NavbarProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  textScale: TextScale;
  onToggleTextScale: () => void;
  onOpenSos: () => void;
  patientName: string;
  viewerRole?: CircleRole;
  memberName?: string;
  onLogout?: () => void;
}

const ROLE_TAG: Record<CircleRole, string> = {
  senior: "Senior",
  caretaker: "Caretaker",
  family: "Family",
};

export function Navbar({
  mode,
  onModeChange,
  textScale,
  onToggleTextScale,
  onOpenSos,
  patientName,
  viewerRole,
  memberName,
  onLogout,
}: NavbarProps) {
  const showHubSwitcher = viewerRole !== "senior";

  return (
    <header className="no-print sticky top-2 z-40 mx-auto w-full max-w-5xl px-3 sm:top-4 sm:px-4">
      <nav
        aria-label="Primary navigation"
        className="flex flex-wrap items-center justify-between gap-2.5 rounded-3xl bg-white/92 px-3 py-2.5 shadow-[0_14px_34px_-14px_rgba(20,29,25,0.12)] ring-1 ring-[#141D19]/[0.09] backdrop-blur-xl sm:px-4 md:flex-nowrap md:gap-3 md:rounded-full"
      >
        <div className="flex min-w-0 items-center gap-2.5 pl-0.5 sm:gap-3 sm:pl-1">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F6B54] text-white shadow-sm sm:h-10 sm:w-10">
            <Pill size={20} weight="light" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-display block text-xl leading-none tracking-tight text-[#141D19] sm:text-2xl">
                Tavya
              </span>
              {viewerRole ? (
                <span className="rounded-full bg-[#E6F3EE] px-2 py-0.5 text-[10px] font-semibold tracking-[0.06em] text-[#0F6B54] uppercase">
                  {ROLE_TAG[viewerRole]}
                </span>
              ) : null}
            </div>
            <p className="max-w-[165px] truncate text-[10px] font-medium tracking-[0.06em] text-[#46534C] uppercase sm:max-w-[220px] sm:text-[11px]">
              {memberName ? `${patientName} · ${memberName}` : patientName}
            </p>
          </div>
        </div>

        {showHubSwitcher ? (
          <div
            role="group"
            aria-label="Switch view mode"
            className="order-last grid w-full grid-cols-2 items-center rounded-full bg-[#F2EDE3] p-1 ring-1 ring-[#141D19]/[0.06] md:order-none md:flex md:w-auto"
          >
            <button
              type="button"
              onClick={() => onModeChange("senior")}
              aria-pressed={mode === "senior"}
              className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] sm:gap-2 sm:px-4 sm:text-sm ${
                mode === "senior"
                  ? "bg-[#0F6B54] text-white shadow-sm"
                  : "text-[#46534C] hover:text-[#141D19]"
              }`}
            >
              <Heartbeat size={18} weight="light" aria-hidden="true" />
              <span>Senior Day</span>
            </button>
            <button
              type="button"
              onClick={() => onModeChange("caregiver")}
              aria-pressed={mode === "caregiver"}
              className={`inline-flex min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] sm:gap-2 sm:px-4 sm:text-sm ${
                mode === "caregiver"
                  ? "bg-[#141D19] text-white shadow-sm"
                  : "text-[#46534C] hover:text-[#141D19]"
              }`}
            >
              <UsersThree size={18} weight="light" aria-hidden="true" />
              <span>
                {viewerRole === "family" ? "Family Hub" : "Caregiver Hub"}
              </span>
            </button>
          </div>
        ) : null}

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onToggleTextScale}
            aria-pressed={textScale === "xl"}
            aria-label={
              textScale === "xl"
                ? "Switch to standard text size"
                : "Switch to extra large text size"
            }
            className={`inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold ring-1 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] sm:px-3.5 sm:text-sm ${
              textScale === "xl"
                ? "bg-[#E6F3EE] text-[#0F6B54] ring-[#0F6B54]/30"
                : "bg-[#FDFBF7] text-[#141D19] ring-[#141D19]/12 hover:bg-[#F2EDE3]"
            }`}
          >
            <TextAa size={18} weight="light" aria-hidden="true" />
            <span className="hidden min-[380px]:inline">XL Text</span>
          </button>

          <button
            type="button"
            onClick={onOpenSos}
            className="group inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full bg-[#B42318] px-3.5 py-2 text-xs font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#911B12] active:scale-[0.98] sm:gap-2 sm:px-4 sm:text-sm"
          >
            <PhoneCall size={18} weight="light" aria-hidden="true" />
            <span>SOS</span>
          </button>

          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out of Care Circle"
              className="inline-flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full bg-[#FDFBF7] px-3 py-2 text-xs font-semibold text-[#141D19] ring-1 ring-[#141D19]/12 hover:bg-[#F2EDE3] sm:text-sm"
            >
              <SignOut size={17} weight="light" aria-hidden="true" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          ) : null}
        </div>
      </nav>
    </header>
  );
}
