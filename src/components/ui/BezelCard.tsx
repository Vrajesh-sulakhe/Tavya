import type { ReactNode } from "react";

interface BezelCardProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  tone?: "default" | "accent" | "warning" | "critical";
}

const OUTER_TONES: Record<NonNullable<BezelCardProps["tone"]>, string> = {
  default: "bg-[#F2EDE3]/80 ring-1 ring-[#141D19]/[0.07]",
  accent: "bg-[#E2EFE9]/90 ring-1 ring-[#0F6B54]/15",
  warning: "bg-[#FBF0D9]/90 ring-1 ring-[#B45309]/15",
  critical: "bg-[#FCE4E2]/90 ring-1 ring-[#B42318]/18",
};

export function BezelCard({
  children,
  className = "",
  innerClassName = "",
  tone = "default",
}: BezelCardProps) {
  return (
    <div
      className={`rounded-[2rem] p-1.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${OUTER_TONES[tone]} ${className}`}
    >
      <div
        className={`rounded-[calc(2rem-0.375rem)] bg-white shadow-[0_14px_34px_-14px_rgba(20,29,25,0.08),inset_0_1px_0_rgba(255,255,255,0.95)] ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
