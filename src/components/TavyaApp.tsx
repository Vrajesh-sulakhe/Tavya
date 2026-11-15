"use client";

import { useEffect, useRef, useState } from "react";
import type {
  CareNoteCategory,
  DashboardPayload,
  DoseSlot,
  DoseStatus,
  MoodState,
  ParsedPrescriptionItem,
  PatientProfile,
  PrescriptionAnalysisResult,
  TavyaStoreData,
} from "@/domain/types";
import type { PrescriptionImageInput } from "./PrescriptionAnalyzer";
import type { NewMedicationPayload } from "./AddMedicationModal";
import { CaregiverView } from "./CaregiverView";
import { Navbar, type AppMode, type TextScale } from "./Navbar";
import { SeniorView } from "./SeniorView";
import { SosModal } from "./SosModal";

const STORAGE_KEY = "tavya:store:v1";

function toStorePayload(dashboard: DashboardPayload): TavyaStoreData {
  return {
    profile: dashboard.profile,
    medications: dashboard.medications,
    doseLogs: dashboard.doseLogs,
    vitalsLogs: dashboard.vitalsLogs,
    alerts: dashboard.alerts,
    careNotes: dashboard.careNotes ?? [],
  };
}

function saveToBrowserStorage(dashboard: DashboardPayload): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(toStorePayload(dashboard))
    );
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

interface TavyaAppProps {
  initialData: DashboardPayload;
}

export function TavyaApp({ initialData }: TavyaAppProps) {
  const [data, setData] = useState<DashboardPayload>(initialData);
  const [mode, setMode] = useState<AppMode>("senior");
  const [textScale, setTextScale] = useState<TextScale>("standard");
  const [sosOpen, setSosOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const hasLocalMutationRef = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.textScale = textScale;
  }, [textScale]);

  // Restore browser-saved data on mount so serverless cold starts preserve user schedules.
  useEffect(() => {
    let active = true;
    async function syncSavedState() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as TavyaStoreData;
        const res = await fetch("/api/dashboard", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(parsed),
        });
        if (res.ok && active && !hasLocalMutationRef.current) {
          const synced = (await res.json()) as DashboardPayload;
          setData(synced);
        }
      } catch {
        // Ignore malformed local storage
      }
    }
    void syncSavedState();
    return () => {
      active = false;
    };
  }, []);

  function applyDashboardUpdate(next: DashboardPayload, message: string) {
    hasLocalMutationRef.current = true;
    setData(next);
    saveToBrowserStorage(next);
    setAnnouncement(message);
  }

  async function handleDoseAction(
    medicationId: string,
    slot: DoseSlot,
    status: DoseStatus
  ) {
    const res = await fetch("/api/doses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        medicationId,
        slot,
        status,
        dateKey: data.todayKey,
      }),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as DashboardPayload;
    const med = updated.medications.find((m) => m.id === medicationId);
    applyDashboardUpdate(
      updated,
      `${med?.name ?? "Medication"} ${slot} dose marked ${status}.`
    );
  }

  async function handleLogVitals(payload: {
    mood: MoodState;
    systolic?: number;
    diastolic?: number;
    bloodSugarMgDl?: number;
    note?: string;
  }) {
    const res = await fetch("/api/vitals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as DashboardPayload;
    applyDashboardUpdate(updated, `Wellness check-in (${payload.mood}) shared.`);
  }

  async function handleCreateMedication(payload: NewMedicationPayload) {
    const res = await fetch("/api/medications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error ?? "Failed to create medication");
    }
    const json = (await res.json()) as { dashboard: DashboardPayload };
    applyDashboardUpdate(json.dashboard, `Added ${payload.name} to schedule.`);
  }

  async function handleUpdateMedication(
    id: string,
    payload: Partial<NewMedicationPayload> & { active?: boolean }
  ) {
    const res = await fetch(`/api/medications/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error ?? "Failed to update medication");
    }
    const updated = (await res.json()) as DashboardPayload;
    applyDashboardUpdate(updated, "Medication updated.");
  }

  async function handleDeleteMedication(id: string) {
    const res = await fetch(`/api/medications/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    const updated = (await res.json()) as DashboardPayload;
    applyDashboardUpdate(updated, "Medication removed from schedule.");
  }

  async function handleToggleMedicationActive(id: string, active: boolean) {
    await handleUpdateMedication(id, { active });
  }

  async function handleUpdateProfile(profile: PatientProfile) {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error ?? "Failed to update profile");
    }
    const updated = (await res.json()) as DashboardPayload;
    applyDashboardUpdate(updated, `Updated care profile for ${profile.name}.`);
  }

  async function handleAnalyzePrescription(
    text: string,
    image?: PrescriptionImageInput
  ): Promise<PrescriptionAnalysisResult> {
    const res = await fetch("/api/ai/analyze-prescription", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text,
        imageBase64: image?.base64,
        imageMimeType: image?.mimeType,
      }),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error ?? "Prescription analysis failed");
    }
    return (await res.json()) as PrescriptionAnalysisResult;
  }

  async function handleCreateNote(payload: {
    category: CareNoteCategory;
    text: string;
    scheduledDate?: string;
  }) {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      throw new Error(err.error ?? "Failed to save care note");
    }
    const updated = (await res.json()) as DashboardPayload;
    applyDashboardUpdate(updated, "Saved care note.");
  }

  async function handleDeleteNote(id: string) {
    const res = await fetch(`/api/notes?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    const updated = (await res.json()) as DashboardPayload;
    applyDashboardUpdate(updated, "Removed care note.");
  }

  async function handleTriggerSos(
    channel: "call" | "whatsapp" | "sms" | "card" = "card"
  ) {
    const res = await fetch("/api/sos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as DashboardPayload;
    applyDashboardUpdate(updated, "Emergency SOS alert logged for caregiver.");
  }

  async function handleAddParsedItems(items: ParsedPrescriptionItem[]) {
    let latest = data;
    let addedCount = 0;
    for (const item of items) {
      const res = await fetch("/api/medications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          dosage: item.dosage,
          instructions: item.plainInstruction,
          purpose: item.purpose,
          slots: item.slots,
          mealTiming: item.mealTiming,
          appearance: "sage_oval",
          pillsRemaining: 30,
          refillThresholdDays: 5,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { dashboard: DashboardPayload };
        latest = json.dashboard;
        addedCount += 1;
      }
    }
    if (addedCount > 0) {
      applyDashboardUpdate(
        latest,
        `Added ${addedCount} medicine${addedCount === 1 ? "" : "s"} from prescription.`
      );
    }
  }

  async function handleResetDemo() {
    const res = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as DashboardPayload;
    applyDashboardUpdate(updated, "Loaded sample care schedule.");
  }

  async function handleClearSchedule() {
    const res = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "clear" }),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as DashboardPayload;
    applyDashboardUpdate(
      updated,
      "Cleared medication schedule for fresh custom setup."
    );
  }

  return (
    <div className="min-h-[100dvh] pb-16">
      <Navbar
        mode={mode}
        onModeChange={setMode}
        textScale={textScale}
        onToggleTextScale={() =>
          setTextScale((prev) => (prev === "standard" ? "xl" : "standard"))
        }
        onOpenSos={() => {
          setSosOpen(true);
          void handleTriggerSos("card");
        }}
        patientName={
          data.profile.name.trim().toLowerCase() === "your loved one"
            ? "Personalized Care"
            : `${data.profile.name}, ${data.profile.age}`
        }
      />

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <main id="main-content">
        {mode === "senior" ? (
          <SeniorView
            data={data}
            textScale={textScale}
            onDoseAction={handleDoseAction}
            onLogVitals={handleLogVitals}
            onOpenCaregiver={() => setMode("caregiver")}
            onOpenSos={() => {
              setSosOpen(true);
              void handleTriggerSos("card");
            }}
          />
        ) : (
          <CaregiverView
            data={data}
            onDoseAction={handleDoseAction}
            onCreateMedication={handleCreateMedication}
            onUpdateMedication={handleUpdateMedication}
            onDeleteMedication={handleDeleteMedication}
            onToggleMedicationActive={handleToggleMedicationActive}
            onUpdateProfile={handleUpdateProfile}
            onAnalyzePrescription={handleAnalyzePrescription}
            onAddParsedItems={handleAddParsedItems}
            onCreateNote={handleCreateNote}
            onDeleteNote={handleDeleteNote}
            onResetDemo={handleResetDemo}
            onClearSchedule={handleClearSchedule}
          />
        )}
      </main>

      <footer className="no-print mx-auto mt-12 max-w-5xl px-4 text-center text-xs text-[#617068]">
        Tavya Elderly Care &amp; Medication Companion · Informational support tool
        only; always verify medication changes with a licensed physician.
      </footer>

      <SosModal
        open={sosOpen}
        onClose={() => setSosOpen(false)}
        profile={data.profile}
        medications={data.medications}
        onTriggerSos={handleTriggerSos}
      />
    </div>
  );
}
