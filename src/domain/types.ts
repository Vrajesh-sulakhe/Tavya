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
  category: "refill" | "interaction" | "wellness" | "missed_dose" | "sos";
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

export interface TavyaStoreData {
  profile: PatientProfile;
  medications: Medication[];
  doseLogs: DoseLog[];
  vitalsLogs: VitalsLog[];
  alerts: CareAlert[];
  careNotes?: CareNote[];
}

export interface DashboardPayload extends TavyaStoreData {
  careNotes: CareNote[];
  todayKey: string;
  adherence: AdherenceStats;
  refillAlerts: RefillAlert[];
  interactions: InteractionWarning[];
  allergyConflicts: AllergyConflict[];
  weeklyMatrix: DailySlotSummary[];
}
