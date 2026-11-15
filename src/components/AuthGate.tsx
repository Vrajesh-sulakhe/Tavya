"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Eye,
  EyeSlash,
  Key,
  LockSimple,
  Pill,
  Sparkle,
  TextAa,
  UsersThree,
} from "@phosphor-icons/react";
import type { DashboardPayload, SessionInfo } from "@/domain/types";
import type { TextScale } from "./Navbar";
import { BezelCard } from "./ui/BezelCard";

export interface AuthStatusSnapshot {
  configured: boolean;
  isDemo: boolean;
}

interface AuthGateProps {
  authStatus: AuthStatusSnapshot;
  textScale: TextScale;
  onToggleTextScale: () => void;
  onAuthenticated: (result: {
    session: SessionInfo;
    dashboard: DashboardPayload;
  }) => void;
  onDemoSeeded: () => void;
}

export function AuthGate({
  authStatus,
  textScale,
  onToggleTextScale,
  onAuthenticated,
  onDemoSeeded,
}: AuthGateProps) {
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // First-run Care Circle Setup fields
  const [seniorName, setSeniorName] = useState("");
  const [seniorAge, setSeniorAge] = useState("72");
  const [allergiesText, setAllergiesText] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [caretakerName, setCaretakerName] = useState("");
  const [caretakerEmail, setCaretakerEmail] = useState("");
  const [setupPasscode, setSetupPasscode] = useState("");
  const [seniorPasscode, setSeniorPasscode] = useState("");

  async function submitPasscode(code: string) {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ passcode: code.trim() }),
      });
      const json = (await res.json()) as {
        error?: string;
        session?: SessionInfo;
        dashboard?: DashboardPayload;
      };
      if (!res.ok || !json.session || !json.dashboard) {
        setError(json.error ?? "Unable to unlock Care Circle.");
        return;
      }
      onAuthenticated({ session: json.session, dashboard: json.dashboard });
    } catch {
      setError("Network error while verifying passcode.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    await submitPasscode(passcode);
  }

  async function handleLoadSampleCircle() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ demo: true }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? "Unable to load sample Care Circle.");
        return;
      }
      onDemoSeeded();
    } catch {
      setError("Network error while loading sample Care Circle.");
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

      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          seniorName: seniorName.trim(),
          seniorAge: ageNum,
          allergies,
          emergencyContactName: caretakerName.trim(),
          emergencyContactPhone: emergencyPhone.trim(),
          caretakerName: caretakerName.trim(),
          caretakerEmail: caretakerEmail.trim(),
          passcode: setupPasscode.trim(),
          seniorPasscode: seniorPasscode.trim() || undefined,
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        issues?: Array<{ message: string }>;
        session?: SessionInfo;
        dashboard?: DashboardPayload;
      };
      if (!res.ok || !json.session || !json.dashboard) {
        setError(
          json.issues?.[0]?.message ??
            json.error ??
            "Could not create Care Circle. Check fields and try again."
        );
        return;
      }
      onAuthenticated({ session: json.session, dashboard: json.dashboard });
    } catch {
      setError("Network error while saving Care Circle setup.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] px-3 py-6 sm:px-4 sm:py-10">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 pb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0F6B54] text-white shadow-sm">
            <Pill size={20} weight="light" aria-hidden="true" />
          </span>
          <div>
            <span className="font-display block text-2xl leading-none text-[#141D19]">
              Tavya
            </span>
            <p className="text-[11px] font-medium tracking-[0.08em] text-[#46534C] uppercase">
              Passcode Care Circle
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTextScale}
          aria-pressed={textScale === "xl"}
          aria-label={
            textScale === "xl"
              ? "Switch to standard text size"
              : "Switch to extra large text size"
          }
          className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ring-1 transition-colors sm:text-sm ${
            textScale === "xl"
              ? "bg-[#E6F3EE] text-[#0F6B54] ring-[#0F6B54]/30"
              : "bg-white text-[#141D19] ring-[#141D19]/12 hover:bg-[#F2EDE3]"
          }`}
        >
          <TextAa size={18} weight="light" aria-hidden="true" />
          <span>XL Text</span>
        </button>
      </header>

      <main id="main-content" className="mx-auto w-full max-w-4xl">
        {authStatus.configured ? (
          <BezelCard tone="accent" innerClassName="p-6 sm:p-10">
            <div className="mx-auto max-w-lg space-y-6">
              <div className="space-y-2 text-center">
                <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#E6F3EE] text-[#0F6B54]">
                  <LockSimple size={24} weight="light" aria-hidden="true" />
                </span>
                <h1 className="font-display text-3xl text-[#141D19] sm:text-4xl">
                  Enter Your Care Circle Passcode
                </h1>
                <p className="text-sm text-[#46534C]">
                  Signed passcode sessions keep schedules, vitals, and family
                  alerts private while tailoring Tavya for Senior, Caretaker, or
                  Family access.
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="circle-passcode-input"
                    className="block text-sm font-semibold text-[#141D19]"
                  >
                    4–8 Digit Passcode
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      id="circle-passcode-input"
                      type={showPasscode ? "text" : "password"}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{4,8}"
                      minLength={4}
                      maxLength={8}
                      required
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Enter digits (e.g. 1111)"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "auth-error-msg" : undefined}
                      className="font-mono-num min-h-[52px] w-full rounded-2xl bg-white px-4 py-3 text-lg tracking-[0.2em] text-[#141D19] ring-1 ring-[#141D19]/15 focus:ring-2 focus:ring-[#0F6B54] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscode((prev) => !prev)}
                      aria-label={
                        showPasscode ? "Hide passcode digits" : "Show passcode digits"
                      }
                      className="inline-flex min-h-[52px] min-w-[52px] items-center justify-center rounded-2xl bg-white text-[#46534C] ring-1 ring-[#141D19]/12 hover:bg-[#F2EDE3]"
                    >
                      {showPasscode ? (
                        <EyeSlash size={20} weight="light" aria-hidden="true" />
                      ) : (
                        <Eye size={20} weight="light" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                {error ? (
                  <p
                    id="auth-error-msg"
                    role="alert"
                    className="rounded-2xl bg-[#FEE4E2] px-4 py-3 text-sm font-semibold text-[#7A1B14]"
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting || passcode.trim().length < 4}
                  className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#0F6B54] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#0B5341] disabled:opacity-60"
                >
                  <Key size={19} weight="light" aria-hidden="true" />
                  <span>{submitting ? "Verifying…" : "Unlock Care Circle"}</span>
                </button>
              </form>

              {authStatus.isDemo ? (
                <div className="rounded-2xl bg-white p-4 ring-1 ring-[#141D19]/[0.08]">
                  <p className="text-xs font-semibold tracking-[0.14em] text-[#0F6B54] uppercase">
                    Sample Care Circle Passcodes
                  </p>
                  <p className="mt-1 text-xs text-[#46534C]">
                    Tap a role below to test role-based permissions immediately:
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void submitPasscode("1111")}
                      className="min-h-[48px] rounded-2xl bg-[#E6F3EE] px-3 py-2 text-left text-xs font-semibold text-[#0F6B54] hover:bg-[#D1EAE0]"
                    >
                      <span className="block">Senior · Lakshmi</span>
                      <span className="font-mono-num text-[11px]">
                        Passcode: 1111
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void submitPasscode("2222")}
                      className="min-h-[48px] rounded-2xl bg-[#141D19] px-3 py-2 text-left text-xs font-semibold text-white hover:bg-[#27352E]"
                    >
                      <span className="block">Caretaker · Ananya</span>
                      <span className="font-mono-num text-[11px] opacity-90">
                        Passcode: 2222
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => void submitPasscode("3333")}
                      className="min-h-[48px] rounded-2xl bg-[#FDFBF7] px-3 py-2 text-left text-xs font-semibold text-[#141D19] ring-1 ring-[#141D19]/15 hover:bg-[#F2EDE3]"
                    >
                      <span className="block">Family · Rohan</span>
                      <span className="font-mono-num text-[11px] text-[#46534C]">
                        Passcode: 3333
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </BezelCard>
        ) : (
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
        )}
      </main>
    </div>
  );
}
