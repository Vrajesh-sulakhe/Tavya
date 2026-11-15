import type {
  AdherenceStats,
  DoseLog,
  DoseSlot,
  DoseStatus,
  Medication,
  RefillAlert,
  ScheduledDoseItem,
} from "./types";

export const SLOT_ORDER: readonly DoseSlot[] = [
  "morning",
  "afternoon",
  "evening",
  "night",
];

export const SLOT_META: Record<
  DoseSlot,
  { label: string; windowLabel: string; startHour: number; endHour: number }
> = {
  morning: {
    label: "Morning",
    windowLabel: "7:00 – 10:00 AM",
    startHour: 5,
    endHour: 11,
  },
  afternoon: {
    label: "Afternoon",
    windowLabel: "12:00 – 2:30 PM",
    startHour: 11,
    endHour: 16,
  },
  evening: {
    label: "Evening",
    windowLabel: "5:00 – 7:00 PM",
    startHour: 16,
    endHour: 20,
  },
  night: {
    label: "Night",
    windowLabel: "8:30 – 10:30 PM",
    startHour: 20,
    endHour: 24,
  },
};

export function formatDateKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getRecentDateKeys(todayKey: string, days: number): string[] {
  const base = new Date(`${todayKey}T00:00:00.000Z`);
  const keys: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - offset);
    keys.push(formatDateKey(d));
  }
  return keys;
}

function resolveLogForSlot(
  logs: DoseLog[],
  medicationId: string,
  dateKey: string,
  slot: DoseSlot
): DoseLog | undefined {
  let latest: DoseLog | undefined;
  for (const log of logs) {
    if (
      log.medicationId === medicationId &&
      log.dateKey === dateKey &&
      log.slot === slot
    ) {
      if (!latest || log.updatedAt >= latest.updatedAt) {
        latest = log;
      }
    }
  }
  return latest;
}

export function groupMedicationsBySlot(
  medications: Medication[],
  doseLogs: DoseLog[],
  dateKey: string
): Record<DoseSlot, ScheduledDoseItem[]> {
  const grouped: Record<DoseSlot, ScheduledDoseItem[]> = {
    morning: [],
    afternoon: [],
    evening: [],
    night: [],
  };

  for (const med of medications) {
    if (!med.active) continue;
    for (const slot of med.slots) {
      const log = resolveLogForSlot(doseLogs, med.id, dateKey, slot);
      const status: DoseStatus = log?.status ?? "pending";
      grouped[slot].push({
        medication: med,
        slot,
        status,
        updatedAt: log?.updatedAt,
      });
    }
  }

  return grouped;
}

export function getSlotForHour(hour: number): DoseSlot {
  if (hour < 11) return "morning";
  if (hour < 16) return "afternoon";
  if (hour < 20) return "evening";
  return "night";
}

export function getNextDueMedication(
  medications: Medication[],
  doseLogs: DoseLog[],
  dateKey: string,
  currentHour: number = new Date().getHours()
): ScheduledDoseItem | null {
  const grouped = groupMedicationsBySlot(medications, doseLogs, dateKey);
  const currentSlot = getSlotForHour(currentHour);
  const startIdx = SLOT_ORDER.indexOf(currentSlot);

  const orderedSlots = [
    ...SLOT_ORDER.slice(startIdx),
    ...SLOT_ORDER.slice(0, startIdx),
  ];

  for (const slot of orderedSlots) {
    const dueItem = grouped[slot].find(
      (item) => item.status === "pending" || item.status === "snoozed"
    );
    if (dueItem) return dueItem;
  }

  return null;
}

export function calculateAdherenceStats(
  medications: Medication[],
  doseLogs: DoseLog[],
  todayKey: string
): AdherenceStats {
  const activeMeds = medications.filter((m) => m.active);
  const todayTotal = activeMeds.reduce((sum, m) => sum + m.slots.length, 0);

  if (todayTotal === 0) {
    return {
      todayTaken: 0,
      todayTotal: 0,
      todayPercent: 100,
      sevenDayPercent: 100,
    };
  }

  const todayGrouped = groupMedicationsBySlot(activeMeds, doseLogs, todayKey);
  let todayTaken = 0;
  for (const slot of SLOT_ORDER) {
    for (const item of todayGrouped[slot]) {
      if (item.status === "taken") {
        todayTaken += 1;
      }
    }
  }

  const todayPercent = Math.round((todayTaken / todayTotal) * 100);

  const weekKeys = getRecentDateKeys(todayKey, 7);
  let weekTaken = 0;
  const weekTotal = todayTotal * weekKeys.length;

  for (const key of weekKeys) {
    const dayGrouped = groupMedicationsBySlot(activeMeds, doseLogs, key);
    for (const slot of SLOT_ORDER) {
      for (const item of dayGrouped[slot]) {
        if (item.status === "taken") {
          weekTaken += 1;
        }
      }
    }
  }

  const sevenDayPercent = Math.min(
    100,
    Math.round((weekTaken / weekTotal) * 100)
  );

  return {
    todayTaken,
    todayTotal,
    todayPercent,
    sevenDayPercent,
  };
}

export function getRefillAlerts(medications: Medication[]): RefillAlert[] {
  const alerts: RefillAlert[] = [];

  for (const med of medications) {
    if (!med.active) continue;
    const dailyDoses = Math.max(1, med.slots.length);
    const daysLeft = Math.floor(med.pillsRemaining / dailyDoses);
    if (daysLeft <= med.refillThresholdDays) {
      alerts.push({
        medicationId: med.id,
        medicationName: med.name,
        pillsRemaining: med.pillsRemaining,
        daysLeft,
        urgent: daysLeft <= 2,
      });
    }
  }

  return alerts.sort((a, b) => a.daysLeft - b.daysLeft);
}
