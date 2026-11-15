export type DoseSlot = "morning" | "afternoon" | "evening" | "night";

export type MealTiming = "before_food" | "after_food" | "with_water" | "anytime";

export type PillAppearance =
  | "white_round"
  | "amber_capsule"
  | "sage_oval"
  | "sky_tablet"
  | "rose_coated";

export type DoseStatus = "pending" | "taken" | "snoozed" | "skipped";

export type MoodState = "good" | "tired" | "dizzy" | "nausea";

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  purpose: string;
  slots: DoseSlot[];
  mealTiming: MealTiming;
  appearance: PillAppearance;
  pillsRemaining: number;
  refillThresholdDays: number;
  active: boolean;
}

export interface DoseLog {
  id: string;
  medicationId: string;
  dateKey: string;
  slot: DoseSlot;
  status: DoseStatus;
  updatedAt: string;
}

export interface VitalsLog {
  id: string;
  mood: MoodState;
  systolic?: number;
  diastolic?: number;
  bloodSugarMgDl?: number;
  note?: string;
  recordedAt: string;
}

export interface CareAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  category: "refill" | "interaction" | "wellness" | "missed_dose" | "sos" | "appointment";
  title: string;
  detail: string;
  createdAt: string;
}

export type CareNoteCategory = "note" | "appointment";

export interface CareNote {
  id: string;
  category: CareNoteCategory;
  text: string;
  scheduledDate?: string;
  createdAt: string;
}

export interface AllergyConflict {
  id: string;
  allergy: string;
  medicationName: string;
  summary: string;
  guidance: string;
}

export type MatrixCellState = "taken" | "pending" | "snoozed" | "skipped" | "none";

export interface DailySlotSummary {
  dateKey: string;
  slots: Record<DoseSlot, MatrixCellState>;
}

export interface PatientProfile {
  name: string;
  age: number;
  caregiverName: string;
  caregiverPhone: string;
  caregiverRelation: string;
  doctorName: string;
  doctorPhone: string;
  allergies: string[];
  conditions: string[];
}

export interface InteractionWarning {
  id: string;
  severity: "caution" | "major";
  pairLabel: string;
  summary: string;
  guidance: string;
}

export interface ParsedPrescriptionItem {
  name: string;
  dosage: string;
  slots: DoseSlot[];
  mealTiming: MealTiming;
  plainInstruction: string;
  purpose: string;
}

export interface PrescriptionAnalysisResult {
  source: "gemini" | "clinical-rules";
  items: ParsedPrescriptionItem[];
  interactions: InteractionWarning[];
  summary: string;
  disclaimer: string;
}

export interface ScheduledDoseItem {
  medication: Medication;
  slot: DoseSlot;
  status: DoseStatus;
  updatedAt?: string;
}

export interface AdherenceStats {
  todayTaken: number;
  todayTotal: number;
  todayPercent: number;
  sevenDayPercent: number;
}

export interface RefillAlert {
  medicationId: string;
  medicationName: string;
  pillsRemaining: number;
  daysLeft: number;
  urgent: boolean;
}

export type CircleRole = "senior" | "caretaker" | "family";

/** Server-only member record. Passcode hash and salt must never leave the server. */
export interface CircleMember {
  id: string;
  name: string;
  role: CircleRole;
  email?: string;
  passcodeHash: string;
  passcodeSalt: string;
  createdAt: string;
}

/** Client-safe projection of a circle member. */
export interface PublicMember {
  id: string;
  name: string;
  role: CircleRole;
  email?: string;
}

export interface CareCircle {
  members: CircleMember[];
  isDemo: boolean;
  /** Fallback HMAC secret used only when TAVYA_SESSION_SECRET is not configured. */
  sessionSecret: string;
}

/** Sharing preferences owned by the senior, keeping them in control of their data. */
export interface SharingConsent {
  shareVitalsWithFamily: boolean;
  emailFamilyOnMissedDose: boolean;
}

export interface Appointment {
  id: string;
  title: string;
  doctor?: string;
  location?: string;
  startsAt: string;
  notes?: string;
  createdAt: string;
}

export type ReminderKind = "upcoming_dose" | "missed_dose" | "appointment";

export interface EmailLogEntry {
  id: string;
  dedupeKey: string;
  kind: ReminderKind;
  subject: string;
  recipients: string[];
  status: "sent" | "preview" | "failed" | "skipped";
  detail?: string;
  createdAt: string;
}

export interface SessionInfo {
  memberId: string;
  name: string;
  role: CircleRole;
}

export interface TavyaStoreData {
  profile: PatientProfile;
  medications: Medication[];
  doseLogs: DoseLog[];
  vitalsLogs: VitalsLog[];
  alerts: CareAlert[];
  careNotes?: CareNote[];
  appointments?: Appointment[];
  emailLog?: EmailLogEntry[];
  consent?: SharingConsent;
  circle?: CareCircle;
}

export interface DashboardPayload
  extends Omit<TavyaStoreData, "circle" | "appointments" | "emailLog" | "consent"> {
  careNotes: CareNote[];
  appointments: Appointment[];
  emailLog: EmailLogEntry[];
  consent: SharingConsent;
  members: PublicMember[];
  viewerRole: CircleRole;
  persistence: "durable" | "ephemeral";
  emailDelivery: "live" | "preview";
  todayKey: string;
  adherence: AdherenceStats;
  refillAlerts: RefillAlert[];
  interactions: InteractionWarning[];
  allergyConflicts: AllergyConflict[];
  weeklyMatrix: DailySlotSummary[];
}
