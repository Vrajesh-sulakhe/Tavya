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
  SessionInfo,
  SharingConsent,
  TavyaStoreData,
} from "@/domain/types";
import type { NewMedicationPayload } from "./AddMedicationModal";
import { AuthGate, type AuthStatusSnapshot } from "./AuthGate";
import type {
  CreateAppointmentInput,
  CreateMemberInput,
} from "./CareCirclePanels";
import { CaregiverView } from "./CaregiverView";
import { Navbar, type AppMode, type TextScale } from "./Navbar";
import type { PrescriptionImageInput } from "./PrescriptionAnalyzer";
import { SeniorView } from "./SeniorView";
import { SosModal } from "./SosModal";

const STORAGE_KEY = "tavya:store:v2";

function toStorePayload(dashboard: DashboardPayload): TavyaStoreData {
  return {
    profile: dashboard.profile,
    medications: dashboard.medications,
    doseLogs: dashboard.doseLogs,
    vitalsLogs: dashboard.vitalsLogs,
    alerts: dashboard.alerts,
    careNotes: dashboard.careNotes ?? [],
    appointments: dashboard.appointments ?? [],
    consent: dashboard.consent,
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
  initialData: DashboardPayload | null;
  initialSession: SessionInfo | null;
  initialAuthStatus: AuthStatusSnapshot;
}

export function TavyaApp({
  initialData,
  initialSession,
  initialAuthStatus,
}: TavyaAppProps) {
  const [session, setSession] = useState<SessionInfo | null>(initialSession);
  const [data, setData] = useState<DashboardPayload | null>(initialData);
  const [authStatus, setAuthStatus] =
    useState<AuthStatusSnapshot>(initialAuthStatus);
  const [mode, setMode] = useState<AppMode>(
    initialSession?.role === "senior" ? "senior" : "caregiver"
  );
  const [textScale, setTextScale] = useState<TextScale>("standard");
  const [sosOpen, setSosOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const hasLocalMutationRef = useRef(false);

  useEffect(() => {
    document.documentElement.dataset.textScale = textScale;
  }, [textScale]);

  // Restore browser-saved data only when ephemeral local storage is active for a caretaker session.
  useEffect(() => {
    if (!session || session.role !== "caretaker" || !data) return;
    if (data.persistence !== "ephemeral") return;

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
    // Only evaluate once per authenticated caretaker session id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.memberId]);

  // Proactive background reminder check every 5 minutes while Senior/Caretaker is active.
  useEffect(() => {
    if (!session || (session.role !== "caretaker" && session.role !== "senior")) {
      return;
    }

    let cancelled = false;
    async function runSweep() {
      try {
        const res = await fetch("/api/reminders/run", { method: "POST" });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as {
          processedCount?: number;
          dashboard?: DashboardPayload;
        };
        if (json.dashboard && (json.processedCount ?? 0) > 0 && !cancelled) {
          setData(json.dashboard);
        }
      } catch {
        // Silent retry on next interval
      }
    }

    void runSweep();
    const timer = window.setInterval(() => {
      void runSweep();
    }, 5 * 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [session]);

  function applyDashboardUpdate(next: DashboardPayload, message: string) {
    hasLocalMutationRef.current = true;
    setData(next);
    if (next.viewerRole === "caretaker" && next.persistence === "ephemeral") {
      saveToBrowserStorage(next);
    }
    setAnnouncement(message);
  }

  function handleUnauthorized(status: number): boolean {
    if (status === 401) {
      setSession(null);
      setData(null);
      return true;
    }
    return false;
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    setData(null);
    setSosOpen(false);
    setAnnouncement("Signed out of Care Circle.");
  }

  if (!session || !data) {
    return (
      <AuthGate
        authStatus={authStatus}
        textScale={textScale}
        onToggleTextScale={() =>
          setTextScale((prev) => (prev === "standard" ? "xl" : "standard"))
        }
        onDemoSeeded={() => setAuthStatus({ configured: true, isDemo: true })}
        onAuthenticated={({ session: nextSession, dashboard }) => {
          hasLocalMutationRef.current = false;
          setSession(nextSession);
          setData(dashboard);
          setMode(nextSession.role === "senior" ? "senior" : "caregiver");
          setAuthStatus((prev) => ({ ...prev, configured: true }));
          setAnnouncement(
            `Signed in as ${nextSession.name} (${nextSession.role}).`
          );
        }}
      />
    );
  }

  const activeData = data;
  const activeMode: AppMode =
    activeData.viewerRole === "senior" ? "senior" : mode;

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
        dateKey: activeData.todayKey,
      }),
    });
    if (handleUnauthorized(res.status) || !res.ok) return;
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
    if (handleUnauthorized(res.status) || !res.ok) return;
    const updated = (await res.json()) as DashboardPayload;
    applyDashboardUpdate(updated, `Wellness check-in (${payload.mood}) shared.`);
  }

  async function handleUpdateConsent(next: Partial<SharingConsent>) {
    const res = await fetch("/api/consent", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    if (handleUnauthorized(res.status) || !res.ok) return;
    const json = (await res.json()) as { dashboard: DashboardPayload };
    applyDashboardUpdate(json.dashboard, "Updated privacy & sharing preferences.");
  }

  async function handleCreateMedication(payload: NewMedicationPayload) {
    const res = await fetch("/api/medications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (handleUnauthorized(res.status)) return;
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
    if (handleUnauthorized(res.status)) return;
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
    if (handleUnauthorized(res.status) || !res.ok) return;
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
    if (handleUnauthorized(res.status)) return;
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
    if (handleUnauthorized(res.status)) {
      throw new Error("Session expired. Please unlock with your passcode.");
    }
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
    if (handleUnauthorized(res.status)) return;
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
    if (handleUnauthorized(res.status) || !res.ok) return;
    const updated = (await res.json()) as DashboardPayload;
    applyDashboardUpdate(updated, "Removed care note.");
  }

  async function handleCreateAppointment(payload: CreateAppointmentInput) {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (handleUnauthorized(res.status)) return;
    if (!res.ok) {
      const err = (await res.json()) as {
        error?: string;
        issues?: Array<{ message: string }>;
      };
      throw new Error(
        err.issues?.[0]?.message ?? err.error ?? "Failed to schedule visit"
      );
    }
    const json = (await res.json()) as { dashboard: DashboardPayload };
    applyDashboardUpdate(json.dashboard, `Scheduled ${payload.title}.`);
  }

  async function handleDeleteAppointment(id: string) {
    const res = await fetch(`/api/appointments/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (handleUnauthorized(res.status) || !res.ok) return;
    const json = (await res.json()) as { dashboard: DashboardPayload };
    applyDashboardUpdate(json.dashboard, "Removed scheduled appointment.");
  }

  async function handleAddMember(payload: CreateMemberInput) {
    const res = await fetch("/api/circle/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (handleUnauthorized(res.status)) return;
    if (!res.ok) {
      const err = (await res.json()) as {
        error?: string;
        issues?: Array<{ message: string }>;
      };
      throw new Error(
        err.issues?.[0]?.message ?? err.error ?? "Failed to add circle member"
      );
    }
    const json = (await res.json()) as { dashboard: DashboardPayload };
    applyDashboardUpdate(
      json.dashboard,
      `Added ${payload.name} (${payload.role}) to Care Circle.`
    );
  }

  async function handleRemoveMember(id: string) {
    const res = await fetch("/api/circle/members", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (handleUnauthorized(res.status) || !res.ok) return;
    const json = (await res.json()) as { dashboard: DashboardPayload };
    applyDashboardUpdate(json.dashboard, "Removed member from Care Circle.");
  }

  async function handleRunReminders(): Promise<string> {
    const res = await fetch("/api/reminders/run", { method: "POST" });
    if (handleUnauthorized(res.status)) {
      return "Session expired. Please sign in again.";
    }
    if (!res.ok) {
      return "Unable to check reminders right now.";
    }
    const json = (await res.json()) as {
      processedCount: number;
      sentCount: number;
      previewCount: number;
      dashboard?: DashboardPayload;
    };
    if (json.dashboard) {
      applyDashboardUpdate(
        json.dashboard,
        json.processedCount > 0
          ? `Processed ${json.processedCount} due reminder(s).`
          : "All reminder windows already up to date."
      );
    }
    if (json.processedCount === 0) {
      return "All current dose slots and upcoming appointments have already been notified.";
    }
    return `Processed ${json.processedCount} reminder(s): ${json.sentCount} sent, ${json.previewCount} recorded in preview outbox.`;
  }

  async function handleTriggerSos(
    channel: "call" | "whatsapp" | "sms" | "card" = "card"
  ) {
    const res = await fetch("/api/sos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    if (handleUnauthorized(res.status) || !res.ok) return;
    const updated = (await res.json()) as DashboardPayload;
    applyDashboardUpdate(updated, "Emergency SOS alert logged for caregiver.");
  }

  async function handleAddParsedItems(items: ParsedPrescriptionItem[]) {
    let latest = activeData;
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
      if (handleUnauthorized(res.status)) return;
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
    if (handleUnauthorized(res.status) || !res.ok) return;
    const updated = (await res.json()) as DashboardPayload;
    setAuthStatus({ configured: true, isDemo: true });
    applyDashboardUpdate(updated, "Loaded sample care schedule.");
  }

  async function handleClearSchedule() {
    const res = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "clear" }),
    });
    if (handleUnauthorized(res.status) || !res.ok) return;
    const updated = (await res.json()) as DashboardPayload;
    applyDashboardUpdate(
      updated,
      "Cleared medication schedule for fresh custom setup."
    );
  }

  return (
    <div className="min-h-[100dvh] pb-16">
      <Navbar
        mode={activeMode}
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
          activeData.profile.name.trim().toLowerCase() === "your loved one"
            ? "Personalized Care"
            : `${activeData.profile.name}, ${activeData.profile.age}`
        }
        viewerRole={activeData.viewerRole}
        memberName={session.name}
        onLogout={() => void handleLogout()}
      />

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <main id="main-content">
        {activeMode === "senior" ? (
          <SeniorView
            data={activeData}
            textScale={textScale}
            onDoseAction={handleDoseAction}
            onLogVitals={handleLogVitals}
            onUpdateConsent={
              activeData.viewerRole === "senior" ||
              activeData.viewerRole === "caretaker"
                ? handleUpdateConsent
                : undefined
            }
            onOpenCaregiver={() => setMode("caregiver")}
            onOpenSos={() => {
              setSosOpen(true);
              void handleTriggerSos("card");
            }}
          />
        ) : (
          <CaregiverView
            data={activeData}
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
            onCreateAppointment={handleCreateAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            onAddMember={handleAddMember}
            onRemoveMember={handleRemoveMember}
            onRunReminders={handleRunReminders}
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
        profile={activeData.profile}
        medications={activeData.medications}
        onTriggerSos={handleTriggerSos}
      />
    </div>
  );
}
