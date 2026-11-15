import {
  createMemberRecord,
  generateRandomSecret,
  toPublicMember,
} from "@/domain/auth";
import {
  detectAllergyConflicts,
  detectInteractions,
} from "@/domain/interactions";
import {
  buildWeeklyMatrix,
  calculateAdherenceStats,
  formatDateKey,
  getRecentDateKeys,
  getRefillAlerts,
} from "@/domain/schedule";
import type {
  Appointment,
  CareCircle,
  CircleRole,
  DashboardPayload,
  DoseLog,
  Medication,
  SharingConsent,
  TavyaStoreData,
} from "@/domain/types";

export const DEFAULT_CONSENT: SharingConsent = {
  shareVitalsWithFamily: true,
  emailFamilyOnMissedDose: true,
};

export function createBlankCircle(): CareCircle {
  return {
    members: [],
    isDemo: false,
    sessionSecret: generateRandomSecret(),
  };
}

export function createDemoCircle(
  createdAt: string = new Date().toISOString()
): CareCircle {
  return {
    members: [
      createMemberRecord({
        id: "member-senior-1",
        name: "Lakshmi Devi",
        role: "senior",
        email: "lakshmi@tavya-care.demo",
        passcode: "1111",
        createdAt,
      }),
      createMemberRecord({
        id: "member-caretaker-1",
        name: "Ananya Sharma",
        role: "caretaker",
        email: "ananya@tavya-care.demo",
        passcode: "2222",
        createdAt,
      }),
      createMemberRecord({
        id: "member-family-1",
        name: "Rohan Sharma",
        role: "family",
        email: "rohan@tavya-care.demo",
        passcode: "3333",
        createdAt,
      }),
    ],
    isDemo: true,
    sessionSecret: generateRandomSecret(),
  };
}

export function createBlankData(): TavyaStoreData {
  return {
    profile: {
      name: "Your Loved One",
      age: 70,
      caregiverName: "Primary Caregiver",
      caregiverPhone: "",
      caregiverRelation: "Family",
      doctorName: "Attending Physician",
      doctorPhone: "",
      allergies: [],
      conditions: [],
    },
    medications: [],
    doseLogs: [],
    vitalsLogs: [],
    alerts: [],
    careNotes: [],
    appointments: [],
    emailLog: [],
    consent: { ...DEFAULT_CONSENT },
    circle: createBlankCircle(),
  };
}

export function createSeedData(
  todayKey: string = formatDateKey()
): TavyaStoreData {
  const medications: Medication[] = [
    {
      id: "med-amlodipine",
      name: "Amlodipine",
      dosage: "5 mg",
      instructions: "1 small sky-blue tablet after breakfast",
      purpose: "Blood Pressure",
      slots: ["morning"],
      mealTiming: "after_food",
      appearance: "sky_tablet",
      pillsRemaining: 4,
      refillThresholdDays: 5,
      active: true,
    },
    {
      id: "med-metformin",
      name: "Metformin",
      dosage: "500 mg",
      instructions: "1 white round tablet right after breakfast and dinner",
      purpose: "Blood Sugar",
      slots: ["morning", "night"],
      mealTiming: "after_food",
      appearance: "white_round",
      pillsRemaining: 26,
      refillThresholdDays: 5,
      active: true,
    },
    {
      id: "med-vitd",
      name: "Calcium + Vitamin D3",
      dosage: "500 mg",
      instructions: "1 warm amber capsule after lunch",
      purpose: "Bone Strength",
      slots: ["afternoon"],
      mealTiming: "after_food",
      appearance: "amber_capsule",
      pillsRemaining: 18,
      refillThresholdDays: 5,
      active: true,
    },
    {
      id: "med-telmisartan",
      name: "Telmisartan",
      dosage: "40 mg",
      instructions: "1 rose-coated tablet in the evening with a full glass of water",
      purpose: "Heart & Blood Pressure",
      slots: ["evening"],
      mealTiming: "with_water",
      appearance: "rose_coated",
      pillsRemaining: 16,
      refillThresholdDays: 5,
      active: true,
    },
    {
      id: "med-atorvastatin",
      name: "Atorvastatin",
      dosage: "10 mg",
      instructions: "1 sage oval tablet at bedtime (avoid grapefruit juice)",
      purpose: "Cholesterol",
      slots: ["night"],
      mealTiming: "anytime",
      appearance: "sage_oval",
      pillsRemaining: 22,
      refillThresholdDays: 5,
      active: true,
    },
  ];

  const recentKeys = getRecentDateKeys(todayKey, 7);
  const pastKeys = recentKeys.slice(0, -1);
  const doseLogs: DoseLog[] = [];

  pastKeys.forEach((dateKey, dayIndex) => {
    for (const med of medications) {
      for (const slot of med.slots) {
        const missedSample = dayIndex === 2 && med.id === "med-telmisartan";
        doseLogs.push({
          id: `seed-${dateKey}-${med.id}-${slot}`,
          medicationId: med.id,
          dateKey,
          slot,
          status: missedSample ? "skipped" : "taken",
          updatedAt: `${dateKey}T09:00:00.000Z`,
        });
      }
    }
  });

  // Mark today's Amlodipine morning dose as taken so daily progress is visible immediately
  doseLogs.push({
    id: `seed-${todayKey}-med-amlodipine-morning`,
    medicationId: "med-amlodipine",
    dateKey: todayKey,
    slot: "morning",
    status: "taken",
    updatedAt: `${todayKey}T08:15:00.000Z`,
  });

  const tomorrowDate = new Date(`${todayKey}T09:30:00.000Z`);
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
  const nextWeekDate = new Date(`${todayKey}T11:00:00.000Z`);
  nextWeekDate.setUTCDate(nextWeekDate.getUTCDate() + 4);

  const appointments: Appointment[] = [
    {
      id: "appt-seed-1",
      title: "Cardiology & HbA1c Follow-Up",
      doctor: "Dr. Arvind Mehta",
      location: "Apollo Clinic, Pune",
      startsAt: tomorrowDate.toISOString(),
      notes: "Bring morning BP log and current medication strip list.",
      createdAt: `${todayKey}T08:05:00.000Z`,
    },
    {
      id: "appt-seed-2",
      title: "Physiotherapy & Mobility Check",
      doctor: "Dr. Kavita Rao",
      location: "Home Visit",
      startsAt: nextWeekDate.toISOString(),
      notes: "Balance assessment and gentle morning walk guidance.",
      createdAt: `${todayKey}T08:06:00.000Z`,
    },
  ];

  return {
    profile: {
      name: "Lakshmi Devi",
      age: 72,
      caregiverName: "Ananya Sharma",
      caregiverPhone: "+91 98201 44120",
      caregiverRelation: "Daughter",
      doctorName: "Dr. Arvind Mehta",
      doctorPhone: "+91 98190 31004",
      allergies: ["Penicillin"],
      conditions: ["Hypertension", "Type 2 Diabetes", "Mild Hyperlipidemia"],
    },
    medications,
    doseLogs,
    vitalsLogs: [
      {
        id: "vital-seed-1",
        mood: "good",
        systolic: 126,
        diastolic: 78,
        bloodSugarMgDl: 112,
        note: "Morning walk completed; feeling steady.",
        recordedAt: `${todayKey}T08:20:00.000Z`,
      },
    ],
    alerts: [
      {
        id: "alert-seed-1",
        severity: "info",
        category: "refill",
        title: "Amlodipine refill window approaching",
        detail: "4 tablets left (4-day supply). Pharmacy reorder recommended this week.",
        createdAt: `${todayKey}T08:00:00.000Z`,
      },
    ],
    careNotes: [
      {
        id: "note-seed-1",
        category: "appointment",
        text: "Cardiology & HbA1c follow-up with Dr. Arvind Mehta (bring morning BP log).",
        scheduledDate: recentKeys[recentKeys.length - 1],
        createdAt: `${todayKey}T08:05:00.000Z`,
      },
      {
        id: "note-seed-2",
        category: "note",
        text: "Pharmacy refill strip for Amlodipine ordered for tomorrow morning delivery.",
        createdAt: `${todayKey}T08:10:00.000Z`,
      },
    ],
    appointments,
    emailLog: [],
    consent: { ...DEFAULT_CONSENT },
    circle: createDemoCircle(`${todayKey}T08:00:00.000Z`),
  };
}

export interface BuildPayloadOptions {
  todayKey?: string;
  viewerRole?: CircleRole;
  persistence?: "durable" | "ephemeral";
  emailDelivery?: "live" | "preview";
}

export function buildDashboardPayload(
  data: TavyaStoreData,
  optionsOrDateKey: string | BuildPayloadOptions = {}
): DashboardPayload {
  const options: BuildPayloadOptions =
    typeof optionsOrDateKey === "string"
      ? { todayKey: optionsOrDateKey }
      : optionsOrDateKey;

  const todayKey = options.todayKey ?? formatDateKey();
  const viewerRole: CircleRole = options.viewerRole ?? "caretaker";
  const persistence = options.persistence ?? "ephemeral";
  const emailDelivery = options.emailDelivery ?? "preview";

  const {
    circle,
    appointments,
    emailLog,
    consent,
    careNotes,
    vitalsLogs,
    ...rest
  } = data;

  const resolvedConsent: SharingConsent = consent ?? { ...DEFAULT_CONSENT };
  const redactVitals =
    viewerRole === "family" && !resolvedConsent.shareVitalsWithFamily;

  const activeMedNames = rest.medications
    .filter((m) => m.active)
    .map((m) => m.name);

  const sortedAppointments = [...(appointments ?? [])].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt)
  );

  return {
    ...rest,
    vitalsLogs: redactVitals ? [] : vitalsLogs,
    careNotes: careNotes ?? [],
    appointments: sortedAppointments,
    emailLog: emailLog ?? [],
    consent: resolvedConsent,
    members: (circle?.members ?? []).map(toPublicMember),
    viewerRole,
    persistence,
    emailDelivery,
    todayKey,
    adherence: calculateAdherenceStats(rest.medications, rest.doseLogs, todayKey),
    refillAlerts: getRefillAlerts(rest.medications),
    interactions: detectInteractions(activeMedNames),
    allergyConflicts: detectAllergyConflicts(
      activeMedNames,
      rest.profile.allergies
    ),
    weeklyMatrix: buildWeeklyMatrix(rest.medications, rest.doseLogs, todayKey),
  };
}
