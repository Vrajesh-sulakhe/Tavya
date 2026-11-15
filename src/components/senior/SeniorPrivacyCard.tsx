"use client";

import { ShieldCheck } from "@phosphor-icons/react";
import type { SharingConsent } from "@/domain/types";
import { BezelCard } from "../ui/BezelCard";
import { Reveal } from "../ui/Reveal";

interface SeniorPrivacyCardProps {
  consent: SharingConsent;
  onUpdateConsent: (next: Partial<SharingConsent>) => Promise<void>;
}

export function SeniorPrivacyCard({
  consent,
  onUpdateConsent,
}: SeniorPrivacyCardProps) {
  return (
    <Reveal delayMs={180}>
      <section aria-labelledby="senior-privacy-heading">
        <BezelCard innerClassName="p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E6F3EE] text-[#0F6B54]">
                <ShieldCheck size={22} weight="light" aria-hidden="true" />
              </span>
              <div>
                <h2
                  id="senior-privacy-heading"
                  className="font-display text-2xl text-[#141D19] sm:text-3xl"
                >
                  My Sharing &amp; Privacy Choices
                </h2>
                <p className="mt-1 text-sm text-[#46534C]">
                  Stay in control of what extended family members can view and
                  when automatic missed-dose email alerts go out.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              role="switch"
              aria-checked={consent.shareVitalsWithFamily}
              onClick={() =>
                void onUpdateConsent({
                  shareVitalsWithFamily: !consent.shareVitalsWithFamily,
                })
              }
              className="flex min-h-[58px] items-center justify-between gap-4 rounded-2xl bg-[#FDFBF7] px-4 py-3 text-left ring-1 ring-[#141D19]/10 hover:bg-[#F2EDE3]"
            >
              <div>
                <span className="block text-sm font-semibold text-[#141D19]">
                  Share daily mood &amp; vitals with family
                </span>
                <span className="text-xs text-[#46534C]">
                  {consent.shareVitalsWithFamily
                    ? "Currently visible in Family Hub"
                    : "Kept private to you & primary caretaker"}
                </span>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  consent.shareVitalsWithFamily
                    ? "bg-[#0F6B54] text-white"
                    : "bg-[#E5E7EB] text-[#374151]"
                }`}
              >
                {consent.shareVitalsWithFamily ? "Shared" : "Private"}
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={consent.emailFamilyOnMissedDose}
              onClick={() =>
                void onUpdateConsent({
                  emailFamilyOnMissedDose: !consent.emailFamilyOnMissedDose,
                })
              }
              className="flex min-h-[58px] items-center justify-between gap-4 rounded-2xl bg-[#FDFBF7] px-4 py-3 text-left ring-1 ring-[#141D19]/10 hover:bg-[#F2EDE3]"
            >
              <div>
                <span className="block text-sm font-semibold text-[#141D19]">
                  Notify family by email if a dose is missed
                </span>
                <span className="text-xs text-[#46534C]">
                  {consent.emailFamilyOnMissedDose
                    ? "Automatic family check-in alerts active"
                    : "Primary caretaker notified only"}
                </span>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  consent.emailFamilyOnMissedDose
                    ? "bg-[#0F6B54] text-white"
                    : "bg-[#E5E7EB] text-[#374151]"
                }`}
              >
                {consent.emailFamilyOnMissedDose ? "Active" : "Paused"}
              </span>
            </button>
          </div>
        </BezelCard>
      </section>
    </Reveal>
  );
}
