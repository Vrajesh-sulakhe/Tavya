import { z } from "zod";

export const doseSlotSchema = z.enum(["morning", "afternoon", "evening", "night"]);

export const mealTimingSchema = z.enum([
  "before_food",
  "after_food",
  "with_water",
  "anytime",
]);

export const pillAppearanceSchema = z.enum([
  "white_round",
  "amber_capsule",
  "sage_oval",
  "sky_tablet",
  "rose_coated",
]);

export const doseActionSchema = z.enum([
  "taken",
  "snoozed",
  "skipped",
  "pending",
]);

export const moodStateSchema = z.enum(["good", "tired", "dizzy", "nausea"]);

export const createMedicationSchema = z.object({
  name: z.string().trim().min(2, "Medication name must be at least 2 characters").max(80),
  dosage: z.string().trim().min(1, "Dosage is required").max(40),
  instructions: z.string().trim().min(3, "Plain instructions are required").max(220),
  purpose: z.string().trim().min(2, "Purpose is required").max(80),
  slots: z.array(doseSlotSchema).min(1, "Select at least one time slot").max(4),
  mealTiming: mealTimingSchema,
  appearance: pillAppearanceSchema.default("white_round"),
  pillsRemaining: z.number().int().min(0).max(500),
  refillThresholdDays: z.number().int().min(1).max(30).default(5),
});

export const updateMedicationSchema = createMedicationSchema.partial().extend({
  active: z.boolean().optional(),
});

export const logDoseSchema = z.object({
  medicationId: z.string().trim().min(1).max(80),
  slot: doseSlotSchema,
  status: doseActionSchema,
  dateKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid dateKey format (YYYY-MM-DD)")
    .optional(),
});

export const logVitalsSchema = z.object({
  mood: moodStateSchema,
  systolic: z.number().int().min(60).max(260).optional(),
  diastolic: z.number().int().min(40).max(160).optional(),
  bloodSugarMgDl: z.number().int().min(30).max(600).optional(),
  note: z.string().trim().max(240).optional(),
});

export const analyzePrescriptionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(5, "Please paste at least 5 characters of prescription text")
    .max(2000, "Prescription text cannot exceed 2,000 characters"),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  age: z.number().int().min(1).max(125),
  caregiverName: z.string().trim().min(2).max(80),
  caregiverPhone: z.string().trim().max(30),
  caregiverRelation: z.string().trim().min(2).max(40),
  doctorName: z.string().trim().min(2).max(80),
  doctorPhone: z.string().trim().max(30),
  allergies: z.array(z.string().trim().min(1).max(60)).max(20),
  conditions: z.array(z.string().trim().min(1).max(60)).max(20),
});

export const restoreStateSchema = z.object({
  profile: updateProfileSchema,
  medications: z
    .array(
      createMedicationSchema.extend({
        id: z.string().trim().min(1).max(80),
        active: z.boolean(),
      })
    )
    .max(50),
  doseLogs: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(120),
        medicationId: z.string().trim().min(1).max(80),
        dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        slot: doseSlotSchema,
        status: doseActionSchema,
        updatedAt: z.string().min(1).max(64),
      })
    )
    .max(1000),
  vitalsLogs: z
    .array(
      logVitalsSchema.extend({
        id: z.string().trim().min(1).max(80),
        recordedAt: z.string().min(1).max(64),
      })
    )
    .max(50),
  alerts: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        severity: z.enum(["info", "warning", "critical"]),
        category: z.enum(["refill", "interaction", "wellness", "missed_dose", "sos"]),
        title: z.string().trim().min(1).max(120),
        detail: z.string().trim().min(1).max(300),
        createdAt: z.string().min(1).max(64),
      })
    )
    .max(30),
});
