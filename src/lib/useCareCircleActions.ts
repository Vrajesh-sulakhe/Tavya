import type { NewMedicationPayload } from "@/components/AddMedicationModal";
import type {
  CreateAppointmentInput,
  CreateMemberInput,
} from "@/components/CareCirclePanels";
import type { PrescriptionImageInput } from "@/components/PrescriptionAnalyzer";
import type {
  CareNoteCategory,
  DashboardPayload,
  DoseSlot,
  DoseStatus,
  MoodState,
  ParsedPrescriptionItem,
  PatientProfile,
  PrescriptionAnalysisResult,
  SharingConsent,
} from "@/domain/types";
import {
  ApiRequestError,
  requestJson,
  type RequestJsonOptions,
  unwrapDashboardPayload,
} from "./client-api";

type DashboardEnvelope = DashboardPayload | { dashboard: DashboardPayload };

interface CareCircleActionDeps {
  getTodayKey: () => string;
  applyDashboardUpdate: (next: DashboardPayload, message: string) => void;
  onUnauthorized: () => void;
  onDemoReset: () => void;
}

/**
 * Builds typed client action handlers backed by {@link requestJson} with shared
 * unauthorized-session handling and live-region announcement formatting.
 */
export function buildCareCircleActions(deps: CareCircleActionDeps) {
  async function mutate(
    url: string,
    options: RequestJsonOptions,
    announcement: string | ((updated: DashboardPayload) => string),
    rethrow = false
  ): Promise<DashboardPayload | null> {
    try {
      const res = await requestJson<DashboardEnvelope>(url, options);
      const updated = unwrapDashboardPayload(res);
      deps.applyDashboardUpdate(
        updated,
        typeof announcement === "function" ? announcement(updated) : announcement
      );
      return updated;
    } catch (err) {
      if (err instanceof ApiRequestError && err.isUnauthorized) {
        deps.onUnauthorized();
        return null;
      }
      if (rethrow) throw err;
      return null;
    }
  }

  async function voidMutate(
    url: string,
    options: RequestJsonOptions,
    announcement: string | ((updated: DashboardPayload) => string),
    rethrow = false
  ): Promise<void> {
    await mutate(url, options, announcement, rethrow);
  }

  return {
    handleDoseAction: (medicationId: string, slot: DoseSlot, status: DoseStatus) =>
      voidMutate(
        "/api/doses",
        {
          method: "POST",
          body: { medicationId, slot, status, dateKey: deps.getTodayKey() },
        },
        (u) =>
          `${u.medications.find((m) => m.id === medicationId)?.name ?? "Medication"} ${slot} dose marked ${status}.`
      ),

    handleLogVitals: (payload: {
      mood: MoodState;
      systolic?: number;
      diastolic?: number;
      bloodSugarMgDl?: number;
      note?: string;
    }) =>
      voidMutate(
        "/api/vitals",
        { method: "POST", body: payload },
        `Wellness check-in (${payload.mood}) shared.`
      ),

    handleUpdateConsent: (next: Partial<SharingConsent>) =>
      voidMutate(
        "/api/consent",
        { method: "PATCH", body: next },
        "Updated privacy & sharing preferences."
      ),

    handleCreateMedication: (payload: NewMedicationPayload) =>
      voidMutate(
        "/api/medications",
        {
          method: "POST",
          body: payload,
          fallbackError: "Failed to create medication",
        },
        `Added ${payload.name} to schedule.`,
        true
      ),

    handleUpdateMedication: (
      id: string,
      payload: Partial<NewMedicationPayload> & { active?: boolean }
    ) =>
      voidMutate(
        `/api/medications/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: payload,
          fallbackError: "Failed to update medication",
        },
        "Medication updated.",
        true
      ),

    handleDeleteMedication: (id: string) =>
      voidMutate(
        `/api/medications/${encodeURIComponent(id)}`,
        { method: "DELETE" },
        "Medication removed from schedule."
      ),

    handleUpdateProfile: (profile: PatientProfile) =>
      voidMutate(
        "/api/profile",
        {
          method: "PATCH",
          body: profile,
          fallbackError: "Failed to update profile",
        },
        `Updated care profile for ${profile.name}.`,
        true
      ),

    async handleAnalyzePrescription(
      text: string,
      image?: PrescriptionImageInput
    ): Promise<PrescriptionAnalysisResult> {
      try {
        return await requestJson<PrescriptionAnalysisResult>(
          "/api/ai/analyze-prescription",
          {
            method: "POST",
            body: {
              text,
              imageBase64: image?.base64,
              imageMimeType: image?.mimeType,
            },
            fallbackError: "Prescription analysis failed",
          }
        );
      } catch (err) {
        if (err instanceof ApiRequestError && err.isUnauthorized) {
          deps.onUnauthorized();
          throw new Error("Session expired. Please unlock with your passcode.");
        }
        throw err;
      }
    },

    async handleAddParsedItems(items: ParsedPrescriptionItem[]): Promise<void> {
      let latest: DashboardPayload | null = null;
      let addedCount = 0;
      for (const item of items) {
        try {
          const res = await requestJson<{ dashboard: DashboardPayload }>(
            "/api/medications",
            {
              method: "POST",
              body: {
                name: item.name,
                dosage: item.dosage,
                instructions: item.plainInstruction,
                purpose: item.purpose,
                slots: item.slots,
                mealTiming: item.mealTiming,
                appearance: "sage_oval",
                pillsRemaining: 30,
                refillThresholdDays: 5,
              },
            }
          );
          latest = res.dashboard;
          addedCount += 1;
        } catch (err) {
          if (err instanceof ApiRequestError && err.isUnauthorized) {
            deps.onUnauthorized();
            return;
          }
        }
      }
      if (latest && addedCount > 0) {
        deps.applyDashboardUpdate(
          latest,
          `Added ${addedCount} medicine${addedCount === 1 ? "" : "s"} from prescription.`
        );
      }
    },

    handleCreateNote: (payload: {
      category: CareNoteCategory;
      text: string;
      scheduledDate?: string;
    }) =>
      voidMutate(
        "/api/notes",
        {
          method: "POST",
          body: payload,
          fallbackError: "Failed to save care note",
        },
        "Saved care note.",
        true
      ),

    handleDeleteNote: (id: string) =>
      voidMutate(
        `/api/notes?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
        "Removed care note."
      ),

    handleCreateAppointment: (payload: CreateAppointmentInput) =>
      voidMutate(
        "/api/appointments",
        {
          method: "POST",
          body: payload,
          fallbackError: "Failed to schedule visit",
        },
        `Scheduled ${payload.title}.`,
        true
      ),

    handleDeleteAppointment: (id: string) =>
      voidMutate(
        `/api/appointments/${encodeURIComponent(id)}`,
        { method: "DELETE" },
        "Removed scheduled appointment."
      ),

    handleAddMember: (payload: CreateMemberInput) =>
      voidMutate(
        "/api/circle/members",
        {
          method: "POST",
          body: payload,
          fallbackError: "Failed to add circle member",
        },
        `Added ${payload.name} (${payload.role}) to Care Circle.`,
        true
      ),

    handleRemoveMember: (id: string) =>
      voidMutate(
        "/api/circle/members",
        { method: "DELETE", body: { id } },
        "Removed member from Care Circle."
      ),

    async handleRunReminders(): Promise<string> {
      try {
        const json = await requestJson<{
          processedCount: number;
          sentCount: number;
          previewCount: number;
          dashboard?: DashboardPayload;
        }>("/api/reminders/run", { method: "POST" });
        if (json.dashboard) {
          deps.applyDashboardUpdate(
            json.dashboard,
            json.processedCount > 0
              ? `Processed ${json.processedCount} due reminder(s).`
              : "All reminder windows already up to date."
          );
        }
        return json.processedCount === 0
          ? "All current dose slots and upcoming appointments have already been notified."
          : `Processed ${json.processedCount} reminder(s): ${json.sentCount} sent, ${json.previewCount} recorded in preview outbox.`;
      } catch (err) {
        if (err instanceof ApiRequestError && err.isUnauthorized) {
          deps.onUnauthorized();
          return "Session expired. Please sign in again.";
        }
        return "Unable to check reminders right now.";
      }
    },

    handleTriggerSos: (
      channel: "call" | "whatsapp" | "sms" | "card" = "card"
    ) =>
      voidMutate(
        "/api/sos",
        { method: "POST", body: { channel } },
        "Emergency SOS alert logged for caregiver."
      ),

    async handleResetDemo(): Promise<void> {
      const updated = await mutate(
        "/api/dashboard",
        { method: "POST", body: { action: "reset" } },
        "Loaded sample care schedule."
      );
      if (updated) deps.onDemoReset();
    },

    handleClearSchedule: () =>
      voidMutate(
        "/api/dashboard",
        { method: "POST", body: { action: "clear" } },
        "Cleared medication schedule for fresh custom setup."
      ),
  };
}
