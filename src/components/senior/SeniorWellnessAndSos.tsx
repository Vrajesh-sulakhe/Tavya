"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, FirstAidKit, Heartbeat } from "@phosphor-icons/react";
import {
  SENIOR_LANGUAGES,
  type SeniorLanguage,
} from "@/domain/senior-i18n";
import type { MoodState } from "@/domain/types";
import { BezelCard } from "../ui/BezelCard";
import { Reveal } from "../ui/Reveal";

interface SeniorWellnessAndSosProps {
  caregiverName: string;
  lang: SeniorLanguage;
  onLogVitals: (payload: {
    mood: MoodState;
    systolic?: number;
    diastolic?: number;
    bloodSugarMgDl?: number;
    note?: string;
  }) => Promise<void>;
  onOpenSos: () => void;
}

export function SeniorWellnessAndSos({
  caregiverName,
  lang,
  onLogVitals,
  onOpenSos,
}: SeniorWellnessAndSosProps) {
  const [selectedMood, setSelectedMood] = useState<MoodState>("good");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [vitalsSaved, setVitalsSaved] = useState(false);

  const t = SENIOR_LANGUAGES[lang];

  async function handleVitalsSubmit(e: FormEvent) {
    e.preventDefault();
    setVitalsSaved(false);
    await onLogVitals({
      mood: selectedMood,
      systolic: systolic ? Number(systolic) : undefined,
      diastolic: diastolic ? Number(diastolic) : undefined,
      bloodSugarMgDl: bloodSugar ? Number(bloodSugar) : undefined,
    });
    setVitalsSaved(true);
    setSystolic("");
    setDiastolic("");
    setBloodSugar("");
  }

  return (
    <Reveal delayMs={140}>
      <section
        aria-labelledby="wellness-checkin-heading"
        className="grid grid-cols-1 gap-6 md:grid-cols-12"
      >
        <BezelCard className="md:col-span-8" innerClassName="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E6F3EE] text-[#0F6B54]">
              <Heartbeat size={24} weight="light" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="wellness-checkin-heading"
                className="font-display text-3xl text-[#141D19]"
              >
                {t.wellnessTitle}
              </h2>
              <p className="text-sm text-[#46534C]">
                Updates {caregiverName} automatically—especially if you feel
                dizzy.
              </p>
            </div>
          </div>

          <form onSubmit={handleVitalsSubmit} className="mt-6 space-y-5">
            <div
              role="radiogroup"
              aria-label="Current wellness feeling"
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              {(["good", "tired", "dizzy", "nausea"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selectedMood === value}
                  onClick={() => setSelectedMood(value)}
                  className={`min-h-[52px] rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    selectedMood === value
                      ? value === "dizzy"
                        ? "bg-[#FEE4E2] text-[#B42318] ring-[#B42318]/40"
                        : "bg-[#E6F3EE] text-[#0F6B54] ring-[#0F6B54]/40"
                      : "bg-[#FDFBF7] text-[#141D19] ring-[#141D19]/10 hover:bg-[#F2EDE3]"
                  }`}
                >
                  {t.moods[value]}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  {t.bpTop}
                </span>
                <input
                  type="number"
                  min={60}
                  max={260}
                  inputMode="numeric"
                  placeholder="e.g. 126"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  className="font-mono-num mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-3 text-[#141D19] ring-1 ring-[#141D19]/12"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  {t.bpBottom}
                </span>
                <input
                  type="number"
                  min={40}
                  max={160}
                  inputMode="numeric"
                  placeholder="e.g. 78"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  className="font-mono-num mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-3 text-[#141D19] ring-1 ring-[#141D19]/12"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-[#46534C]">
                  {t.bloodSugar}
                </span>
                <input
                  type="number"
                  min={30}
                  max={600}
                  inputMode="numeric"
                  placeholder="e.g. 112"
                  value={bloodSugar}
                  onChange={(e) => setBloodSugar(e.target.value)}
                  className="font-mono-num mt-1 w-full rounded-2xl bg-[#FDFBF7] px-4 py-3 text-[#141D19] ring-1 ring-[#141D19]/12"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="submit"
                className="group inline-flex min-h-[52px] items-center gap-3 rounded-full bg-[#141D19] py-2 pr-2.5 pl-6 text-sm font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#27352E] active:scale-[0.98]"
              >
                <span>{t.saveCheckin}</span>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight size={18} weight="light" aria-hidden="true" />
                </span>
              </button>

              {vitalsSaved ? (
                <span className="text-sm font-semibold text-[#0F6B54]" role="status">
                  {t.savedCheckin}
                </span>
              ) : null}
            </div>
          </form>
        </BezelCard>

        <BezelCard
          tone="critical"
          className="md:col-span-4"
          innerClassName="flex h-full flex-col justify-between p-6 sm:p-8"
        >
          <div>
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEE4E2] text-[#B42318]">
              <FirstAidKit size={24} weight="light" aria-hidden="true" />
            </span>
            <h3 className="font-display mt-4 text-3xl text-[#141D19]">
              {t.sosTitle}
            </h3>
            <p className="mt-2 text-sm text-[#46534C]">
              One tap opens {caregiverName}&apos;s direct phone link and your
              medical allergy card.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenSos}
            className="group mt-6 inline-flex min-h-[56px] w-full items-center justify-between rounded-full bg-[#B42318] py-2.5 pr-2.5 pl-6 text-base font-semibold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#911B12] active:scale-[0.98]"
          >
            <span>{t.sosButton}</span>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105">
              <ArrowUpRight size={20} weight="light" aria-hidden="true" />
            </span>
          </button>
        </BezelCard>
      </section>
    </Reveal>
  );
}
