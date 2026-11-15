"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Sparkle, UsersThree } from "@phosphor-icons/react";
import type { DashboardPayload, SessionInfo } from "@/domain/types";
import { ApiRequestError, requestJson } from "@/lib/client-api";
import { BezelCard } from "../ui/BezelCard";

interface FirstRunSetupCardProps {
  onAuthenticated: (result: {
    session: SessionInfo;
    dashboard: DashboardPayload;
  }) => void;
  onDemoSeeded: () => void;
}

export function FirstRunSetupCard({
  onAuthenticated,
  onDemoSeeded,
}: FirstRunSetupCardProps) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [seniorName, setSeniorName] = useState("");
  const [seniorAge, setSeniorAge] = useState("72");
  const [allergiesText, setAllergiesText] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [caretakerName, setCaretakerName] = useState("");
  const [caretakerEmail, setCaretakerEmail] = useState("");
  const [setupPasscode, setSetupPasscode] = useState("");
  const [seniorPasscode, setSeniorPasscode] = useState("");

  async function handleLoadSampleCircle() {
    setError("");
    setSubmitting(true);
    try {
      await requestJson("/api/auth/setup", {
        method: "POST",
        body: { demo: true },
        fallbackError: "Unable to load sample Care Circle.",
      });
      onDemoSeeded();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Network error while loading sample Care Circle."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetupSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const ageNum = Number.parseInt(seniorAge, 10);
    if (Number.isNaN(ageNum) || ageNum < 18 || ageNum > 120) {
      setError("Please enter a senior age between 18 and 120.");
      return;
    }

    setSubmitting(true);
    try {
      const allergies = allergiesText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const json = await requestJson<{
        session?: SessionInfo;
        dashboard?: DashboardPayload;
      }>("/api/auth/setup", {
        method: "POST",
        body: {
          seniorName: seniorName.trim(),
          seniorAge: ageNum,
          allergies,
          emergencyContactName: caretakerName.trim(),
          emergencyContactPhone: emergencyPhone.trim(),
          caretakerName: caretakerName.trim(),
          caretakerEmail: caretakerEmail.trim(),
          passcode: setupPasscode.trim(),
          seniorPasscode: seniorPasscode.trim() || undefined,
        },
        fallbackError:
          "Could not create Care Circle. Check fields and try again.",
      });

      if (!json.session || !json.dashboard) {
        setError("Could not create Care Circle. Check fields and try again.");
        return;
      }
      onAuthenticated({ session: json.session, dashboard: json.dashboard });
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Network error while saving Care Circle setup."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BezelCard innerClassName="p-6 sm:p-10">
      <div className="flex flex-col gap-4 border-b border-[#141D19]/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F3EE] px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-[#0F6B54] uppercase">
            <UsersThree size={14} weight="light" aria-hidden="true" />
            <span>First-Run Onboarding</span>
          </span>
          <h1 className="font-display mt-2.5 text-3xl text-[#141D19] sm:text-4xl">
            Create Your Private Care Circle
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[#46534C]">
            Set up your loved one&apos;s profile and passcode, or load our
            sample care circle for instant evaluation.
          </p>
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={handleLoadSampleCircle}
          className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#E6F3EE] px-5 py-2.5 text-sm font-semibold text-[#0F6B54] ring-1 ring-[#0F6B54]/25 hover:bg-[#D1EAE0] disabled:opacity-60"
        >
          <Sparkle size={18} weight="light" aria-hidden="true" />
          <span>Load Sample Circle</span>
        </button>
      </div>

      <form onSubmit={handleSetupSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-[#141D19]">
            Senior Full Name *
            <input
              type="text"
              required
              value={seniorName}
              onChange={(e) => setSeniorName(e.target.value)}
              placeholder="e.g. Lakshmi Devi"
              className="mt-1.5 min-h-[46px] w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm font-normal text-[#141D19] ring-1 ring-[#141D19]/12"
            />
          </label>

          <label className="block text-sm font-semibold text-[#141D19]">
            Senior Age *
            <input
              type="number"
              required
              min={18}
              max={120}
              value={seniorAge}
              onChange={(e) => setSeniorAge(e.target.value)}
              className="font-mono-num mt-1.5 min-h-[46px] w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm font-normal text-[#141D19] ring-1 ring-[#141D19]/12"
            />
          </label>

          <label className="block text-sm font-semibold text-[#141D19]">
            Emergency Contact Phone *
            <input
              type="tel"
              required
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="+91 98201 44120"
              className="font-mono-num mt-1.5 min-h-[46px] w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm font-normal text-[#141D19] ring-1 ring-[#141D19]/12"
            />
          </label>

          <label className="block text-sm font-semibold text-[#141D19]">
            Known Allergies (comma-separated)
            <input
              type="text"
              value={allergiesText}
              onChange={(e) => setAllergiesText(e.target.value)}
              placeholder="e.g. Penicillin, Sulfa"
              className="mt-1.5 min-h-[46px] w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm font-normal text-[#141D19] ring-1 ring-[#141D19]/12"
            />
          </label>

          <label className="block text-sm font-semibold text-[#141D19]">
            Primary Caretaker Name *
            <input
              type="text"
              required
              value={caretakerName}
              onChange={(e) => setCaretakerName(e.target.value)}
              placeholder="e.g. Ananya Sharma"
              className="mt-1.5 min-h-[46px] w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm font-normal text-[#141D19] ring-1 ring-[#141D19]/12"
            />
          </label>

          <label className="block text-sm font-semibold text-[#141D19]">
            Caretaker Email (for alerts) *
            <input
              type="email"
              required
              value={caretakerEmail}
              onChange={(e) => setCaretakerEmail(e.target.value)}
              placeholder="ananya@example.com"
              className="mt-1.5 min-h-[46px] w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm font-normal text-[#141D19] ring-1 ring-[#141D19]/12"
            />
          </label>

          <label className="block text-sm font-semibold text-[#141D19]">
            Caretaker Passcode (4–8 digits) *
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              minLength={4}
              maxLength={8}
              required
              value={setupPasscode}
              onChange={(e) => setSetupPasscode(e.target.value)}
              placeholder="e.g. 2468"
              className="font-mono-num mt-1.5 min-h-[46px] w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm font-normal text-[#141D19] ring-1 ring-[#141D19]/12"
            />
          </label>

          <label className="block text-sm font-semibold text-[#141D19]">
            Senior Passcode (optional, 4–8 digits)
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              minLength={4}
              maxLength={8}
              value={seniorPasscode}
              onChange={(e) => setSeniorPasscode(e.target.value)}
              placeholder="e.g. 1357"
              className="font-mono-num mt-1.5 min-h-[46px] w-full rounded-2xl bg-[#FDFBF7] px-4 py-2.5 text-sm font-normal text-[#141D19] ring-1 ring-[#141D19]/12"
            />
          </label>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-2xl bg-[#FEE4E2] px-4 py-3 text-sm font-semibold text-[#7A1B14]"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#141D19] px-7 py-3 text-sm font-semibold text-white hover:bg-[#27352E] disabled:opacity-60"
        >
          <span>
            {submitting ? "Creating Care Circle…" : "Create & Sign In"}
          </span>
          <ArrowRight size={17} weight="light" aria-hidden="true" />
        </button>
      </form>
    </BezelCard>
  );
}
