"use client";

import { useEffect, useRef, useState } from "react";
import type {
  DashboardPayload,
  SessionInfo,
  TavyaStoreData,
} from "@/domain/types";
import { requestJson } from "@/lib/client-api";
import { buildCareCircleActions } from "@/lib/useCareCircleActions";
import { AuthGate, type AuthStatusSnapshot } from "./AuthGate";
import { CaregiverView } from "./CaregiverView";
import { Navbar, type AppMode, type TextScale } from "./Navbar";
import { SeniorView } from "./SeniorView";
import { SosModal } from "./SosModal";

const STORAGE_KEY = "tavya:store:v2";

function saveToBrowserStorage(dashboard: DashboardPayload): void {
  const payload: TavyaStoreData = {
    profile: dashboard.profile,
    medications: dashboard.medications,
    doseLogs: dashboard.doseLogs,
    vitalsLogs: dashboard.vitalsLogs,
    alerts: dashboard.alerts,
    careNotes: dashboard.careNotes ?? [],
    appointments: dashboard.appointments ?? [],
    consent: dashboard.consent,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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
  const [authStatus, setAuthStatus] = useState(initialAuthStatus);
  const [mode, setMode] = useState<AppMode>(
    initialSession?.role === "senior" ? "senior" : "caregiver"
  );
  const [textScale, setTextScale] = useState<TextScale>("standard");
  const [sosOpen, setSosOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const syncedMemberIdRef = useRef<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.textScale = textScale;
  }, [textScale]);

  useEffect(() => {
    if (!session) {
      syncedMemberIdRef.current = null;
      return;
    }
    if (session.role !== "caretaker" || !data) return;
    if (data.persistence !== "ephemeral") return;
    if (syncedMemberIdRef.current === session.memberId) return;
    syncedMemberIdRef.current = session.memberId;

    let active = true;
    const baselineData = data;
    void (async () => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const synced = await requestJson<DashboardPayload>("/api/dashboard", {
          method: "PUT",
          body: JSON.parse(raw) as TavyaStoreData,
        });
        if (active) {
          setData((current) => (current === baselineData ? synced : current));
        }
      } catch {
        // Ignore malformed local storage or offline state
      }
    })();
    return () => {
      active = false;
    };
  }, [session, data]);

  useEffect(() => {
    if (!session || (session.role !== "caretaker" && session.role !== "senior")) {
      return;
    }
    let cancelled = false;
    async function runSweep() {
      try {
        const json = await requestJson<{
          processedCount?: number;
          dashboard?: DashboardPayload;
        }>("/api/reminders/run", { method: "POST" });
        if (json.dashboard && (json.processedCount ?? 0) > 0 && !cancelled) {
          setData(json.dashboard);
        }
      } catch {
        // Silent retry on next interval
      }
    }
    void runSweep();
    const timer = window.setInterval(() => void runSweep(), 5 * 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [session]);

  function applyDashboardUpdate(next: DashboardPayload, message: string) {
    setData(next);
    if (next.viewerRole === "caretaker" && next.persistence === "ephemeral") {
      saveToBrowserStorage(next);
    }
    setAnnouncement(message);
  }

  function clearAuthenticatedState() {
    setSession(null);
    setData(null);
  }

  async function handleLogout() {
    await requestJson("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    clearAuthenticatedState();
    setSosOpen(false);
    setAnnouncement("Signed out of Care Circle.");
  }

  if (!session || !data) {
    return (
      <AuthGate
        authStatus={authStatus}
        textScale={textScale}
        onToggleTextScale={() =>
          setTextScale((p) => (p === "standard" ? "xl" : "standard"))
        }
        onDemoSeeded={() => setAuthStatus({ configured: true, isDemo: true })}
        onAuthenticated={({ session: nextSession, dashboard }) => {
          setSession(nextSession);
          setData(dashboard);
          setMode(nextSession.role === "senior" ? "senior" : "caregiver");
          setAuthStatus((prev) => ({ ...prev, configured: true }));
          setAnnouncement(`Signed in as ${nextSession.name} (${nextSession.role}).`);
        }}
      />
    );
  }

  const activeData = data;
  const activeMode: AppMode = activeData.viewerRole === "senior" ? "senior" : mode;
  const actions = buildCareCircleActions({
    getTodayKey: () => activeData.todayKey,
    applyDashboardUpdate,
    onUnauthorized: clearAuthenticatedState,
    onDemoReset: () => setAuthStatus({ configured: true, isDemo: true }),
  });

  function handleOpenSos() {
    setSosOpen(true);
    void actions.handleTriggerSos("card");
  }

  return (
    <div className="min-h-[100dvh] pb-16">
      <Navbar
        mode={activeMode}
        onModeChange={setMode}
        textScale={textScale}
        onToggleTextScale={() =>
          setTextScale((p) => (p === "standard" ? "xl" : "standard"))
        }
        onOpenSos={handleOpenSos}
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
            onDoseAction={actions.handleDoseAction}
            onLogVitals={actions.handleLogVitals}
            onUpdateConsent={
              activeData.viewerRole === "senior" || activeData.viewerRole === "caretaker"
                ? actions.handleUpdateConsent
                : undefined
            }
            onOpenCaregiver={() => setMode("caregiver")}
            onOpenSos={handleOpenSos}
          />
        ) : (
          <CaregiverView
            data={activeData}
            onDoseAction={actions.handleDoseAction}
            onCreateMedication={actions.handleCreateMedication}
            onUpdateMedication={actions.handleUpdateMedication}
            onDeleteMedication={actions.handleDeleteMedication}
            onToggleMedicationActive={(id, active) =>
              actions.handleUpdateMedication(id, { active })
            }
            onUpdateProfile={actions.handleUpdateProfile}
            onAnalyzePrescription={actions.handleAnalyzePrescription}
            onAddParsedItems={actions.handleAddParsedItems}
            onCreateNote={actions.handleCreateNote}
            onDeleteNote={actions.handleDeleteNote}
            onCreateAppointment={actions.handleCreateAppointment}
            onDeleteAppointment={actions.handleDeleteAppointment}
            onAddMember={actions.handleAddMember}
            onRemoveMember={actions.handleRemoveMember}
            onRunReminders={actions.handleRunReminders}
            onResetDemo={actions.handleResetDemo}
            onClearSchedule={actions.handleClearSchedule}
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
        onTriggerSos={actions.handleTriggerSos}
      />
    </div>
  );
}
