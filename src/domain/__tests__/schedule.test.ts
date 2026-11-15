import { describe, expect, it } from "vitest";
import {
  buildWeeklyMatrix,
  calculateAdherenceStats,
  formatDateKey,
  getNextDueMedication,
  getRefillAlerts,
  getSlotWindowState,
  groupMedicationsBySlot,
} from "../schedule";
import type { DoseLog, Medication } from "../types";

const sampleMeds: Medication[] = [
  {
    id: "med-1",
    name: "Amlodipine",
    dosage: "5 mg",
    instructions: "1 small blue tablet after breakfast",
    purpose: "Blood Pressure",
    slots: ["morning"],
    mealTiming: "after_food",
    appearance: "sky_tablet",
    pillsRemaining: 4,
    refillThresholdDays: 5,
    active: true,
  },
  {
    id: "med-2",
    name: "Metformin",
    dosage: "500 mg",
    instructions: "1 white tablet with breakfast and dinner",
    purpose: "Blood Sugar",
    slots: ["morning", "night"],
    mealTiming: "after_food",
    appearance: "white_round",
    pillsRemaining: 24,
    refillThresholdDays: 5,
    active: true,
  },
  {
    id: "med-inactive",
    name: "Old Cough Syrup",
    dosage: "10 ml",
    instructions: "Stopped",
    purpose: "Cough",
    slots: ["evening"],
    mealTiming: "anytime",
    appearance: "amber_capsule",
    pillsRemaining: 10,
    refillThresholdDays: 5,
    active: false,
  },
];

describe("schedule domain", () => {
  it("groups active medications into slots with default pending status", () => {
    const logs: DoseLog[] = [
      {
        id: "log-1",
        medicationId: "med-1",
        dateKey: "2026-11-15",
        slot: "morning",
        status: "taken",
        updatedAt: "2026-11-15T08:15:00.000Z",
      },
    ];

    const grouped = groupMedicationsBySlot(sampleMeds, logs, "2026-11-15");

    expect(grouped.morning).toHaveLength(2);
    expect(grouped.morning[0]?.status).toBe("taken");
    expect(grouped.morning[1]?.status).toBe("pending");
    expect(grouped.evening).toHaveLength(0);
    expect(grouped.night).toHaveLength(1);
  });

  it("identifies the next due medication based on current hour and pending status", () => {
    const logs: DoseLog[] = [
      {
        id: "log-1",
        medicationId: "med-1",
        dateKey: "2026-11-15",
        slot: "morning",
        status: "taken",
        updatedAt: "2026-11-15T08:15:00.000Z",
      },
    ];

    const next = getNextDueMedication(sampleMeds, logs, "2026-11-15", 9);
    expect(next?.medication.id).toBe("med-2");
    expect(next?.slot).toBe("morning");
  });

  it("computes today and 7-day adherence percentages accurately", () => {
    const todayKey = "2026-11-15";
    const logs: DoseLog[] = [
      {
        id: "l1",
        medicationId: "med-1",
        dateKey: todayKey,
        slot: "morning",
        status: "taken",
        updatedAt: "2026-11-15T08:00:00.000Z",
      },
      {
        id: "l2",
        medicationId: "med-2",
        dateKey: "2026-11-14",
        slot: "morning",
        status: "taken",
        updatedAt: "2026-11-14T08:00:00.000Z",
      },
    ];

    const stats = calculateAdherenceStats(sampleMeds, logs, todayKey);
    expect(stats.todayTaken).toBe(1);
    expect(stats.todayTotal).toBe(3);
    expect(stats.todayPercent).toBe(33);
    expect(stats.sevenDayPercent).toBeGreaterThan(0);
    expect(stats.sevenDayPercent).toBeLessThanOrEqual(100);
  });

  it("flags low-refill medications based on daily slot consumption", () => {
    const alerts = getRefillAlerts(sampleMeds);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.medicationId).toBe("med-1");
    expect(alerts[0]?.daysLeft).toBe(4);
    expect(alerts[0]?.urgent).toBe(false);

    const urgentAlerts = getRefillAlerts([
      { ...sampleMeds[0]!, pillsRemaining: 2 },
    ]);
    expect(urgentAlerts[0]?.daysLeft).toBe(2);
    expect(urgentAlerts[0]?.urgent).toBe(true);
  });

  it("formats YYYY-MM-DD date keys cleanly", () => {
    expect(formatDateKey(new Date("2026-11-15T10:00:00Z"))).toMatch(
      /^\d{4}-\d{2}-\d{2}$/
    );
  });

  it("determines slot window state accurately for morning/afternoon/evening/night", () => {
    expect(getSlotWindowState("morning", 8)).toBe("active");
    expect(getSlotWindowState("morning", 14)).toBe("passed");
    expect(getSlotWindowState("afternoon", 9)).toBe("upcoming");
    expect(getSlotWindowState("evening", 18)).toBe("active");
    expect(getSlotWindowState("night", 21)).toBe("active");
    expect(getSlotWindowState("night", 15)).toBe("upcoming");
  });

  it("builds a 7-day by 4-slot weekly adherence matrix", () => {
    const todayKey = "2026-11-15";
    const logs: DoseLog[] = [
      {
        id: "l1",
        medicationId: "med-1",
        dateKey: todayKey,
        slot: "morning",
        status: "taken",
        updatedAt: "2026-11-15T08:00:00.000Z",
      },
      {
        id: "l2",
        medicationId: "med-2",
        dateKey: todayKey,
        slot: "morning",
        status: "taken",
        updatedAt: "2026-11-15T08:05:00.000Z",
      },
    ];

    const matrix = buildWeeklyMatrix(sampleMeds, logs, todayKey);
    expect(matrix).toHaveLength(7);
    const todayRow = matrix[matrix.length - 1]!;
    expect(todayRow.dateKey).toBe(todayKey);
    expect(todayRow.slots.morning).toBe("taken");
    expect(todayRow.slots.afternoon).toBe("none");
    expect(todayRow.slots.night).toBe("pending");
  });
});
