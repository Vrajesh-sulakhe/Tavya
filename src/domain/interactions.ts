import type { AllergyConflict, InteractionWarning } from "./types";

interface PairRule {
  id: string;
  groupA: string[];
  groupB: string[];
  severity: "caution" | "major";
  pairLabel: string;
  summary: string;
  guidance: string;
}

interface SingleDrugRule {
  id: string;
  keywords: string[];
  severity: "caution" | "major";
  pairLabel: string;
  summary: string;
  guidance: string;
}

const PAIR_RULES: readonly PairRule[] = [
  {
    id: "aspirin-nsaid",
    groupA: ["aspirin", "ecosprin"],
    groupB: ["ibuprofen", "naproxen", "diclofenac", "aceclofenac", "brufen"],
    severity: "major",
    pairLabel: "Aspirin + NSAID Painkiller",
    summary:
      "Taking ibuprofen or other NSAIDs alongside low-dose aspirin increases stomach bleeding risk and can blunt aspirin's heart-protective effect.",
    guidance:
      "Confirm pain relief alternatives (like acetaminophen/paracetamol) with the prescribing doctor.",
  },
  {
    id: "warfarin-aspirin",
    groupA: ["warfarin", "acenocoumarol", "apixaban", "rivaroxaban"],
    groupB: ["aspirin", "ibuprofen", "naproxen", "diclofenac"],
    severity: "major",
    pairLabel: "Anticoagulant + Aspirin / NSAID",
    summary:
      "Combining blood thinners with aspirin or NSAIDs significantly elevates bleeding risk.",
    guidance:
      "Do not add over-the-counter pain relievers without physician clearance.",
  },
  {
    id: "ace-potassium",
    groupA: ["lisinopril", "enalapril", "ramipril", "losartan", "telmisartan"],
    groupB: ["potassium", "spironolactone", "eplerenone"],
    severity: "caution",
    pairLabel: "BP Medicine + Potassium",
    summary:
      "ACE inhibitors or ARBs taken with potassium supplements or potassium-sparing diuretics can raise blood potassium levels.",
    guidance:
      "Monitor serum potassium periodically and avoid potassium-based salt substitutes unless advised.",
  },
  {
    id: "metformin-steroid",
    groupA: ["metformin", "glimepiride", "gliclazide"],
    groupB: ["prednisone", "prednisolone", "dexamethasone"],
    severity: "caution",
    pairLabel: "Diabetes Medicine + Steroid",
    summary:
      "Corticosteroids can elevate blood glucose and reduce the effect of diabetes medications.",
    guidance:
      "Check blood sugar more frequently during steroid courses and share logs with the doctor.",
  },
];

const SINGLE_DRUG_RULES: readonly SingleDrugRule[] = [
  {
    id: "statin-grapefruit",
    keywords: ["atorvastatin", "simvastatin", "amlodipine"],
    severity: "caution",
    pairLabel: "Atorvastatin / Amlodipine + Grapefruit",
    summary:
      "Grapefruit and grapefruit juice can raise blood levels of certain statins and calcium-channel blockers.",
    guidance: "Avoid grapefruit juice; orange or apple juice is a safe substitute.",
  },
  {
    id: "levothyroxine-timing",
    keywords: ["levothyroxine", "thyronorm", "eltroxin"],
    severity: "caution",
    pairLabel: "Levothyroxine + Food / Calcium",
    summary:
      "Food, coffee, calcium, or iron tablets reduce thyroid medication absorption.",
    guidance:
      "Take on an empty stomach with plain water 30–60 minutes before breakfast, and space calcium/iron by 4 hours.",
  },
  {
    id: "metformin-food",
    keywords: ["metformin"],
    severity: "caution",
    pairLabel: "Metformin + Meals & Alcohol",
    summary:
      "Taking metformin without food may cause stomach upset; heavy alcohol raises lactic acidosis risk.",
    guidance: "Always take right after a meal and avoid alcohol.",
  },
];

function matchesAny(haystack: string, keywords: readonly string[]): boolean {
  return keywords.some((kw) => haystack.includes(kw));
}

export function detectInteractions(
  medicationNames: readonly string[]
): InteractionWarning[] {
  const normalized = medicationNames.map((n) => n.toLowerCase());
  const warnings = new Map<string, InteractionWarning>();

  for (const rule of PAIR_RULES) {
    const hasA = normalized.some((name) => matchesAny(name, rule.groupA));
    const hasB = normalized.some((name) => matchesAny(name, rule.groupB));
    if (hasA && hasB) {
      warnings.set(rule.id, {
        id: rule.id,
        severity: rule.severity,
        pairLabel: rule.pairLabel,
        summary: rule.summary,
        guidance: rule.guidance,
      });
    }
  }

  for (const rule of SINGLE_DRUG_RULES) {
    if (normalized.some((name) => matchesAny(name, rule.keywords))) {
      warnings.set(rule.id, {
        id: rule.id,
        severity: rule.severity,
        pairLabel: rule.pairLabel,
        summary: rule.summary,
        guidance: rule.guidance,
      });
    }
  }

  return Array.from(warnings.values()).sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "major" ? -1 : 1
  );
}

const ALLERGY_CLASS_MAP: ReadonlyArray<{
  allergyTerms: string[];
  medKeywords: string[];
  summary: string;
}> = [
  {
    allergyTerms: ["penicillin", "beta-lactam", "beta lactam"],
    medKeywords: [
      "amoxicillin",
      "ampicillin",
      "augmentin",
      "penicillin",
      "piperacillin",
      "cloxacillin",
    ],
    summary:
      "Penicillin-family antibiotics can trigger severe allergic reactions in penicillin-sensitive patients.",
  },
  {
    allergyTerms: ["sulfa", "sulfonamide"],
    medKeywords: [
      "sulfamethoxazole",
      "bactrim",
      "septran",
      "celecoxib",
      "furosemide",
      "hydrochlorothiazide",
      "glimepiride",
      "gliclazide",
    ],
    summary:
      "Medication contains or cross-reacts with sulfonamide compounds.",
  },
  {
    allergyTerms: ["aspirin", "salicylate", "nsaid"],
    medKeywords: [
      "aspirin",
      "ecosprin",
      "ibuprofen",
      "naproxen",
      "diclofenac",
      "aceclofenac",
    ],
    summary:
      "NSAIDs and aspirin share cross-reactive hypersensitivity pathways.",
  },
  {
    allergyTerms: ["statin"],
    medKeywords: ["atorvastatin", "rosuvastatin", "simvastatin", "pravastatin"],
    summary: "Medicine belongs to the statin lipid-lowering class.",
  },
];

export function detectAllergyConflicts(
  medicationNames: readonly string[],
  allergies: readonly string[]
): AllergyConflict[] {
  const conflicts = new Map<string, AllergyConflict>();

  for (const rawAllergy of allergies) {
    const allergyLower = rawAllergy.trim().toLowerCase();
    if (!allergyLower) continue;

    for (const rawMed of medicationNames) {
      const medLower = rawMed.trim().toLowerCase();
      if (!medLower) continue;

      const classMatch = ALLERGY_CLASS_MAP.find(
        (entry) =>
          matchesAny(allergyLower, entry.allergyTerms) &&
          matchesAny(medLower, entry.medKeywords)
      );

      const tokens = allergyLower
        .split(/[\s,/+-]+/)
        .filter((token) => token.length >= 4 && token !== "drug" && token !== "drugs");
      const directMatch = tokens.some((token) => medLower.includes(token));

      if (classMatch || directMatch) {
        const key = `${allergyLower}::${medLower}`;
        conflicts.set(key, {
          id: `allergy-${key.replace(/[^a-z0-9]+/g, "-")}`,
          allergy: rawAllergy,
          medicationName: rawMed,
          summary:
            classMatch?.summary ??
            `${rawMed} directly matches reported allergy "${rawAllergy}".`,
          guidance:
            "Hold administration and verify a safe alternative with the prescribing doctor immediately.",
        });
      }
    }
  }

  return Array.from(conflicts.values());
}
