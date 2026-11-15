"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  PlusCircle,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import type {
  ParsedPrescriptionItem,
  PrescriptionAnalysisResult,
} from "@/domain/types";
import { BezelCard } from "./ui/BezelCard";

interface PrescriptionAnalyzerProps {
  onAnalyzePrescription: (
    text: string
  ) => Promise<PrescriptionAnalysisResult>;
  onAddParsedItems: (items: ParsedPrescriptionItem[]) => Promise<void>;
}

const SAMPLE_PRESCRIPTIONS = [
  {
    label: "Diabetes & Thyroid",
    text: "Tab Levothyroxine 50mcg OD before breakfast\nTab Metformin 500mg BD after meals\nTab Rosuvastatin 10mg HS",
  },
  {
    label: "NSAID + Aspirin Risk",
    text: "Tab Aspirin 75mg OD after breakfast\nTab Ibuprofen 400mg BD after food\nTab Atorvastatin 10mg HS",
  },
];

export function PrescriptionAnalyzer({
  onAnalyzePrescription,
  onAddParsedItems,
}: PrescriptionAnalyzerProps) {
  const [text, setText] = useState(SAMPLE_PRESCRIPTIONS[1]!.text);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PrescriptionAnalysisResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const analysis = await onAnalyzePrescription(text);
      setResult(analysis);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not analyze prescription."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAll() {
    if (!result || result.items.length === 0) return;
    setAdding(true);
    try {
      await onAddParsedItems(result.items);
      setResult(null);
    } finally {
      setAdding(false);
    }
  }

  return (
    <BezelCard innerClassName="p-5 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E6F3EE] text-[#0F6B54]">
            <Sparkle size={24} weight="light" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[#0F6B54] uppercase">
              AI Prescription &amp; Safety Assistant
            </p>
            <h2 className="font-display text-3xl text-[#141D19]">
              Simplify Doctor Notes &amp; Check Interactions
            </h2>
            <p className="mt-1 text-sm text-[#46534C]">
              Converts abbreviations like <code className="font-mono-num">OD</code>,{" "}
              <code className="font-mono-num">BD</code>,{" "}
              <code className="font-mono-num">HS</code> into senior-friendly
              schedules and screens for drug or food conflicts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {SAMPLE_PRESCRIPTIONS.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => setText(sample.text)}
              className="min-h-[40px] rounded-full bg-[#FDFBF7] px-3.5 py-1.5 text-xs font-semibold text-[#141D19] ring-1 ring-[#141D19]/12 transition-colors hover:bg-[#F2EDE3]"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="prescription-textarea"
            className="block text-sm font-semibold text-[#141D19]"
          >
            Prescription text
          </label>
          <textarea
            id="prescription-textarea"
            rows={4}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g., Tab Metformin 500mg BD after meals"
            className="font-mono-num mt-2 w-full rounded-2xl bg-[#FDFBF7] p-4 text-sm text-[#141D19] ring-1 ring-[#141D19]/15 focus:ring-2 focus:ring-[#0F6B54]"
          />
        </div>

        {error ? (
          <p className="text-sm font-semibold text-[#B42318]" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            disabled={loading || text.trim().length < 5}
            className="group inline-flex min-h-[48px] w-full items-center justify-between gap-3 rounded-full bg-[#0F6B54] py-2 pr-2 pl-6 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#0B5341] active:scale-[0.98] disabled:opacity-60 sm:w-auto"
          >
            <span>{loading ? "Analyzing…" : "Simplify & Check Safety"}</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
              <ArrowUpRight size={16} weight="light" aria-hidden="true" />
            </span>
          </button>

          <span className="text-xs text-[#617068]">
            Max 2,000 characters · Validated server-side
          </span>
        </div>
      </form>

      {result ? (
        <div className="mt-6 space-y-4 rounded-2xl bg-[#FDFBF7] p-5 ring-1 ring-[#141D19]/[0.08]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#141D19]">
              {result.summary}
            </p>
            <span className="font-mono-num rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[#46534C] ring-1 ring-[#141D19]/10 uppercase">
              Engine: {result.source}
            </span>
          </div>

          {result.interactions.length > 0 ? (
            <div className="space-y-2">
              {result.interactions.map((warning) => (
                <div
                  key={warning.id}
                  className={`rounded-2xl p-4 ring-1 ${
                    warning.severity === "major"
                      ? "bg-[#FEE4E2] text-[#7A1B14] ring-[#B42318]/25"
                      : "bg-[#FEF3C7] text-[#78350F] ring-[#B45309]/25"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <WarningCircle
                      size={20}
                      weight="light"
                      className="mt-0.5 shrink-0"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-bold">
                        [{warning.severity.toUpperCase()}] {warning.pairLabel}
                      </p>
                      <p className="mt-0.5 text-sm">{warning.summary}</p>
                      <p className="mt-1 text-xs font-semibold">
                        Action: {warning.guidance}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {result.items.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {result.items.map((item, idx) => (
                  <div
                    key={`${item.name}-${idx}`}
                    className="rounded-2xl bg-white p-4 ring-1 ring-[#141D19]/[0.08]"
                  >
                    <p className="font-semibold text-[#141D19]">
                      {item.name}{" "}
                      <span className="font-mono-num text-xs text-[#46534C]">
                        {item.dosage}
                      </span>
                    </p>
                    <p className="mt-1 text-xs font-medium text-[#0F6B54]">
                      {item.purpose} · {item.slots.join(", ")}
                    </p>
                    <p className="mt-2 text-sm text-[#46534C]">
                      {item.plainInstruction}
                    </p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={adding}
                onClick={handleAddAll}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-[#141D19] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#27352E] active:scale-[0.98]"
              >
                <PlusCircle size={18} weight="light" aria-hidden="true" />
                <span>
                  {adding
                    ? "Adding to schedule…"
                    : `Add ${result.items.length} Medicine${result.items.length === 1 ? "" : "s"} to Schedule`}
                </span>
              </button>
            </div>
          ) : null}

          <p className="text-xs text-[#617068]">{result.disclaimer}</p>
        </div>
      ) : null}
    </BezelCard>
  );
}
