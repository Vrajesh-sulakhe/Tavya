import { detectInteractions } from "./interactions";
import type {
  DoseSlot,
  MealTiming,
  ParsedPrescriptionItem,
  PrescriptionAnalysisResult,
} from "./types";

export const CLINICAL_DISCLAIMER =
  "Informational aid only — not a substitute for professional medical advice. Always verify dosages and drug interactions with a licensed physician or pharmacist.";

const KNOWN_PURPOSES: readonly { keyword: string; purpose: string }[] = [
  { keyword: "metformin", purpose: "Blood Sugar" },
  { keyword: "glimepiride", purpose: "Blood Sugar" },
  { keyword: "amlodipine", purpose: "Blood Pressure" },
  { keyword: "telmisartan", purpose: "Blood Pressure" },
  { keyword: "losartan", purpose: "Blood Pressure" },
  { keyword: "lisinopril", purpose: "Blood Pressure" },
  { keyword: "ramipril", purpose: "Blood Pressure" },
  { keyword: "atorvastatin", purpose: "Cholesterol" },
  { keyword: "rosuvastatin", purpose: "Cholesterol" },
  { keyword: "aspirin", purpose: "Heart Protection" },
  { keyword: "ecosprin", purpose: "Heart Protection" },
  { keyword: "clopidogrel", purpose: "Heart Protection" },
  { keyword: "levothyroxine", purpose: "Thyroid" },
  { keyword: "thyronorm", purpose: "Thyroid" },
  { keyword: "ibuprofen", purpose: "Pain Relief" },
  { keyword: "paracetamol", purpose: "Pain / Fever" },
  { keyword: "pantoprazole", purpose: "Stomach Protection" },
  { keyword: "omeprazole", purpose: "Stomach Protection" },
  { keyword: "vitamin", purpose: "Daily Supplement" },
];

function inferSlots(lineLower: string): DoseSlot[] {
  if (/\b(qid|four times|4 times)\b/.test(lineLower)) {
    return ["morning", "afternoon", "evening", "night"];
  }
  if (/\b(tid|tds|thrice|three times|3 times|1-1-1)\b/.test(lineLower)) {
    return ["morning", "afternoon", "night"];
  }
  if (/\b(bd|bid|twice|two times|2 times|1-0-1)\b/.test(lineLower)) {
    return ["morning", "night"];
  }
  if (/\b(hs|bedtime|night|at night|0-0-1)\b/.test(lineLower)) {
    return ["night"];
  }
  if (/\b(evening|5\s*pm|6\s*pm)\b/.test(lineLower)) {
    return ["evening"];
  }
  if (/\b(afternoon|noon|lunch|0-1-0)\b/.test(lineLower)) {
    return ["afternoon"];
  }
  return ["morning"];
}

function inferMealTiming(lineLower: string): MealTiming {
  if (
    /\b(before food|before meal|before breakfast|empty stomach|ac)\b/.test(
      lineLower
    )
  ) {
    return "before_food";
  }
  if (
    /\b(after food|after meal|after meals|after breakfast|after dinner|with food|with meal|pc)\b/.test(
      lineLower
    )
  ) {
    return "after_food";
  }
  if (/\bwith water\b/.test(lineLower)) {
    return "with_water";
  }
  return "anytime";
}

function mealTimingPhrase(timing: MealTiming): string {
  switch (timing) {
    case "before_food":
      return "before food on an empty stomach";
    case "after_food":
      return "after a meal";
    case "with_water":
      return "with a full glass of water";
    default:
      return "at the scheduled time";
  }
}

function inferPurpose(nameLower: string): string {
  const match = KNOWN_PURPOSES.find((p) => nameLower.includes(p.keyword));
  return match?.purpose ?? "Prescribed Care";
}

function parseSingleLine(rawLine: string): ParsedPrescriptionItem | null {
  const cleaned = rawLine
    .replace(/^[-*•\d.)\s]+/, "")
    .replace(/\b(tab\.?|tablet|cap\.?|capsule|syp\.?|syrup)\b/gi, "")
    .trim();

  if (cleaned.length < 2) return null;

  const dosageMatch = cleaned.match(
    /(\d+(?:,\d+)?(?:\.\d+)?\s*(?:mg|mcg|g|ml|iu))/i
  );
  const dosage = dosageMatch?.[1]?.replace(/\s+/g, " ") ?? "1 tablet";

  const rawNamePart = dosageMatch
    ? cleaned.slice(0, dosageMatch.index).trim()
    : cleaned.split(/\s+/).slice(0, 2).join(" ");

  const name = rawNamePart
    .replace(/[,:-]+$/, "")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  if (name.length < 2) return null;

  const lower = rawLine.toLowerCase();
  const slots = inferSlots(lower);
  const mealTiming = inferMealTiming(lower);
  const purpose = inferPurpose(name.toLowerCase());

  const slotText = slots.join(" & ");
  const plainInstruction = `Take ${dosage} of ${name} (${slotText}) ${mealTimingPhrase(mealTiming)}.`;

  return {
    name,
    dosage,
    slots,
    mealTiming,
    plainInstruction,
    purpose,
  };
}

export function parsePrescriptionText(text: string): PrescriptionAnalysisResult {
  const lines = text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: ParsedPrescriptionItem[] = [];
  for (const line of lines) {
    const parsed = parseSingleLine(line);
    if (parsed) items.push(parsed);
  }

  const interactions = detectInteractions(items.map((i) => i.name));

  const summary =
    items.length === 0
      ? "No structured medications detected. Try listing one medicine per line (e.g., 'Tab Metformin 500mg BD after meals')."
      : `Simplified ${items.length} medication${items.length === 1 ? "" : "s"} into plain daily time slots${
          interactions.length > 0
            ? ` and flagged ${interactions.length} safety note${interactions.length === 1 ? "" : "s"}.`
            : " with no known conflicts detected in our clinical rulebook."
        }`;

  return {
    source: "clinical-rules",
    items,
    interactions,
    summary,
    disclaimer: CLINICAL_DISCLAIMER,
  };
}
