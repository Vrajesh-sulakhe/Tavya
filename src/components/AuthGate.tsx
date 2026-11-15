"use client";

import { useState, type FormEvent } from "react";
import {
  Eye,
  EyeSlash,
  Key,
  LockSimple,
  Pill,
  TextAa,
} from "@phosphor-icons/react";
import type { DashboardPayload, SessionInfo } from "@/domain/types";
import { ApiRequestError, requestJson } from "@/lib/client-api";
import { FirstRunSetupCard } from "./auth/FirstRunSetupCard";
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

const DEMO_QUICK_ROLES = [
  {
    code: "1111",
    label: "Senior · Lakshmi",
    className: "bg-[#E6F3EE] text-[#0F6B54] hover:bg-[#D1EAE0]",
    subClassName: "",
  },
  {
    code: "2222",
    label: "Caretaker · Ananya",
    className: "bg-[#141D19] text-white hover:bg-[#27352E]",
    subClassName: "opacity-90",
  },
  {
    code: "3333",
    label: "Family · Rohan",
    className:
      "bg-[#FDFBF7] text-[#141D19] ring-1 ring-[#141D19]/15 hover:bg-[#F2EDE3]",
    subClassName: "text-[#46534C]",
  },
] as const;

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

  async function submitPasscode(code: string) {
    setError("");
    setSubmitting(true);
    try {
      const json = await requestJson<{
        session?: SessionInfo;
        dashboard?: DashboardPayload;
      }>("/api/auth/login", {
        method: "POST",
        body: { passcode: code.trim() },
        fallbackError: "Unable to unlock Care Circle.",
      });
      if (!json.session || !json.dashboard) {
        setError("Unable to unlock Care Circle.");
        return;
      }
      onAuthenticated({ session: json.session, dashboard: json.dashboard });
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : "Network error while verifying passcode."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoginSubmit(e: FormEvent) {
    e.preventDefault();
    await submitPasscode(passcode);
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
                        showPasscode
                          ? "Hide passcode digits"
                          : "Show passcode digits"
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
                    {DEMO_QUICK_ROLES.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        disabled={submitting}
                        onClick={() => void submitPasscode(item.code)}
                        className={`min-h-[48px] rounded-2xl px-3 py-2 text-left text-xs font-semibold ${item.className}`}
                      >
                        <span className="block">{item.label}</span>
                        <span className={`font-mono-num text-[11px] ${item.subClassName}`}>
                          Passcode: {item.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </BezelCard>
        ) : (
          <FirstRunSetupCard
            onAuthenticated={onAuthenticated}
            onDemoSeeded={onDemoSeeded}
          />
        )}
      </main>
    </div>
  );
}
