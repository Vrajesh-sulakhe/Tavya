import type { PillAppearance } from "@/domain/types";

const PILL_STYLES: Record<
  PillAppearance,
  { bg: string; border: string; label: string; shape: "round" | "capsule" | "oval" }
> = {
  white_round: {
    bg: "bg-[#F7F6F2]",
    border: "border-[#141D19]/20",
    label: "White round tablet",
    shape: "round",
  },
  amber_capsule: {
    bg: "bg-[#F59E0B]/25",
    border: "border-[#B45309]/40",
    label: "Amber capsule",
    shape: "capsule",
  },
  sage_oval: {
    bg: "bg-[#0F6B54]/20",
    border: "border-[#0F6B54]/45",
    label: "Sage oval tablet",
    shape: "oval",
  },
  sky_tablet: {
    bg: "bg-[#0284C7]/20",
    border: "border-[#0369A1]/40",
    label: "Sky-blue tablet",
    shape: "round",
  },
  rose_coated: {
    bg: "bg-[#E11D48]/18",
    border: "border-[#BE123C]/35",
    label: "Rose-coated tablet",
    shape: "oval",
  },
};

export function PillVisual({ appearance }: { appearance: PillAppearance }) {
  const style = PILL_STYLES[appearance];
  const shapeClass =
    style.shape === "round"
      ? "h-7 w-7 rounded-full"
      : style.shape === "capsule"
        ? "h-5 w-9 rounded-full"
        : "h-6 w-8 rounded-full";

  return (
    <span
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FDFBF7] ring-1 ring-[#141D19]/[0.08]"
      title={style.label}
      aria-hidden="true"
    >
      <span
        className={`block border-2 ${style.bg} ${style.border} ${shapeClass}`}
      />
    </span>
  );
}
