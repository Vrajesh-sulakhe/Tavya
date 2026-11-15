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

export const analyzePrescriptionSchema = z
  .object({
    text: z
      .string()
      .trim()
      .max(2000, "Prescription text cannot exceed 2,000 characters")
      .optional()
      .default(""),
    imageBase64: z.string().max(4_500_000).optional(),
    imageMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
  })
  .refine(
    (data) => Boolean(data.imageBase64) === Boolean(data.imageMimeType),
    {
      message: "Both imageBase64 and imageMimeType must be provided together",
    }
  )
  .refine(
    (data) => data.text.trim().length >= 5 || Boolean(data.imageBase64),
    {
      message:
        "Please paste at least 5 characters of prescription text or upload a prescription photo",
    }
  );

export const createCareNoteSchema = z.object({
  category: z.enum(["note", "appointment"]),
  text: z.string().trim().min(2, "Note must be at least 2 characters").max(240),
  scheduledDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional(),
});

export const sosAlertSchema = z.object({
  channel: z.enum(["call", "whatsapp", "sms", "card"]).default("card"),
  note: z.string().trim().max(180).optional(),
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
        category: z.enum([
          "refill",
          "interaction",
          "wellness",
          "missed_dose",
          "sos",
          "appointment",
        ]),
        title: z.string().trim().min(1).max(120),
        detail: z.string().trim().min(1).max(300),
        createdAt: z.string().min(1).max(64),
      })
    )
    .max(30),
  careNotes: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        category: z.enum(["note", "appointment"]),
        text: z.string().trim().min(1).max(240),
        scheduledDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        createdAt: z.string().min(1).max(64),
      })
    )
    .max(40)
    .optional()
    .default([]),
  appointments: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        title: z.string().trim().min(1).max(120),
        doctor: z.string().trim().min(1).max(120),
        location: z.string().trim().min(1).max(160),
        startsAt: z
          .string()
          .trim()
          .min(10)
          .max(64)
          .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid appointment date."),
        notes: z.string().trim().max(240).optional(),
        createdAt: z.string().min(1).max(64),
      })
    )
    .max(50)
    .optional()
    .default([]),
  consent: z
    .object({
      shareVitalsWithFamily: z.boolean(),
      emailFamilyOnMissedDose: z.boolean(),
    })
    .optional(),
});

const passcodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4,8}$/, "Passcode must be 4 to 8 digits.");

export const circleRoleSchema = z.enum(["senior", "caretaker", "family"]);

export const setupCircleSchema = z.union([
  z.object({
    demo: z.literal(true),
  }),
  z.object({
    demo: z.literal(false).optional(),
    seniorName: z.string().trim().min(1, "Senior name is required.").max(80),
    seniorAge: z.number().int().min(18, "Age must be 18 or older.").max(120),
    allergies: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
    emergencyContactName: z.string().trim().min(1).max(80),
    emergencyContactPhone: z
      .string()
      .trim()
      .min(7, "Please enter a valid emergency contact phone.")
      .max(24),
    caretakerName: z.string().trim().min(1, "Caretaker name is required.").max(80),
    caretakerEmail: z
      .string()
      .trim()
      .email("Please enter a valid caretaker email.")
      .max(120),
    passcode: passcodeSchema,
    seniorPasscode: passcodeSchema.optional(),
  }),
]);

export const loginPasscodeSchema = z.object({
  passcode: passcodeSchema,
});

export const createMemberSchema = z.object({
  name: z.string().trim().min(1, "Member name is required.").max(80),
  role: circleRoleSchema,
  email: z.string().trim().email("Please enter a valid email address.").max(120),
  passcode: passcodeSchema,
});

export const removeMemberSchema = z.object({
  id: z.string().trim().min(1, "Member ID is required.").max(80),
});

const appointmentStartSchema = z
  .string()
  .trim()
  .min(10, "Please choose an appointment date and time.")
  .max(64)
  .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid appointment date and time.");

export const createAppointmentSchema = z.object({
  title: z.string().trim().min(1, "Appointment reason or title is required.").max(120),
  doctor: z.string().trim().min(1, "Doctor or clinic name is required.").max(120),
  location: z.string().trim().min(1, "Location is required.").max(160),
  startsAt: appointmentStartSchema,
  notes: z.string().trim().max(240).optional(),
});

export const updateAppointmentSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    doctor: z.string().trim().min(1).max(120).optional(),
    location: z.string().trim().min(1).max(160).optional(),
    startsAt: appointmentStartSchema.optional(),
    notes: z.string().trim().max(240).optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.doctor !== undefined ||
      value.location !== undefined ||
      value.startsAt !== undefined ||
      value.notes !== undefined,
    { message: "At least one appointment field must be updated." }
  );

export const updateConsentSchema = z
  .object({
    shareVitalsWithFamily: z.boolean().optional(),
    emailFamilyOnMissedDose: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.shareVitalsWithFamily !== undefined ||
      value.emailFamilyOnMissedDose !== undefined,
    { message: "At least one sharing preference must be provided." }
  );
