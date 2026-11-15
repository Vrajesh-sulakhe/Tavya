"use client";

import { useMemo, useState } from "react";
import type {
  CareNoteCategory,
  DashboardPayload,
  DoseSlot,
  DoseStatus,
  Medication,
  ParsedPrescriptionItem,
  PatientProfile,
  PrescriptionAnalysisResult,
} from "@/domain/types";
import {
  AddMedicationModal,
  type NewMedicationPayload,
} from "./AddMedicationModal";
import { AdherenceAndAlertsBento } from "./caregiver/AdherenceAndAlertsBento";
import { CaregiverHeaderSection } from "./caregiver/CaregiverHeaderSection";
import { MedicationRegimenSection } from "./caregiver/MedicationRegimenSection";
import { ShiftNotesSection } from "./caregiver/ShiftNotesSection";
import {
  CareCirclePanels,
  type CreateAppointmentInput,
  type CreateMemberInput,
} from "./CareCirclePanels";
import { EditProfileModal } from "./EditProfileModal";
import {
  PrescriptionAnalyzer,
  type PrescriptionImageInput,
} from "./PrescriptionAnalyzer";
import { Reveal } from "./ui/Reveal";

interface CaregiverViewProps {
  data: DashboardPayload;
  onDoseAction: (
    medicationId: string,
    slot: DoseSlot,
    status: DoseStatus
  ) => Promise<void>;
  onCreateMedication: (payload: NewMedicationPayload) => Promise<void>;
  onUpdateMedication: (
    id: string,
    payload: Partial<NewMedicationPayload> & { active?: boolean }
  ) => Promise<void>;
  onDeleteMedication: (id: string) => Promise<void>;
  onToggleMedicationActive: (id: string, active: boolean) => Promise<void>;
  onUpdateProfile: (profile: PatientProfile) => Promise<void>;
  onAnalyzePrescription: (
    text: string,
    image?: PrescriptionImageInput
  ) => Promise<PrescriptionAnalysisResult>;
  onAddParsedItems: (items: ParsedPrescriptionItem[]) => Promise<void>;
  onCreateNote?: (payload: {
    category: CareNoteCategory;
    text: string;
    scheduledDate?: string;
  }) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
  onCreateAppointment?: (payload: CreateAppointmentInput) => Promise<void>;
  onDeleteAppointment?: (id: string) => Promise<void>;
  onAddMember?: (payload: CreateMemberInput) => Promise<void>;
  onRemoveMember?: (id: string) => Promise<void>;
  onRunReminders?: () => Promise<string>;
  onResetDemo: () => Promise<void>;
  onClearSchedule: () => Promise<void>;
}

export function CaregiverView({
  data,
  onDoseAction,
  onCreateMedication,
  onUpdateMedication,
  onDeleteMedication,
  onToggleMedicationActive,
  onUpdateProfile,
  onAnalyzePrescription,
  onAddParsedItems,
  onCreateNote,
  onDeleteNote,
  onCreateAppointment,
  onDeleteAppointment,
  onAddMember,
  onRemoveMember,
  onRunReminders,
  onResetDemo,
  onClearSchedule,
}: CaregiverViewProps) {
  const isCaretaker = data.viewerRole === "caretaker";
  const vitalsPrivateForFamily =
    data.viewerRole === "family" && !data.consent.shareVitalsWithFamily;

  const [medModalOpen, setMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const recentVitals = useMemo(
    () => (vitalsPrivateForFamily ? [] : data.vitalsLogs.slice(0, 20)),
    [data.vitalsLogs, vitalsPrivateForFamily]
  );

  async function handleSaveMedication(
    payload: NewMedicationPayload,
    editingId?: string
  ) {
    if (editingId) {
      await onUpdateMedication(editingId, payload);
    } else {
      await onCreateMedication(payload);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-3 pt-5 pb-10 sm:space-y-10 sm:px-4 sm:py-12">
      <Reveal>
        <section aria-labelledby="caregiver-heading" className="space-y-6">
          <CaregiverHeaderSection
            viewerRole={data.viewerRole}
            profile={data.profile}
            todayKey={data.todayKey}
            adherence={data.adherence}
            vitalsPrivateForFamily={vitalsPrivateForFamily}
            latestVital={recentVitals[0]}
            refillAlerts={data.refillAlerts}
            onEditProfile={() => setProfileModalOpen(true)}
            onClearSchedule={onClearSchedule}
            onResetDemo={onResetDemo}
          />

          <AdherenceAndAlertsBento
            data={data}
            isCaretaker={isCaretaker}
            vitalsPrivateForFamily={vitalsPrivateForFamily}
            recentVitals={recentVitals}
            onRefillMedication={(id, pillsRemaining) =>
              onUpdateMedication(id, { pillsRemaining })
            }
          />
        </section>
      </Reveal>

      {isCaretaker ? (
        <Reveal delayMs={80}>
          <PrescriptionAnalyzer
            onAnalyzePrescription={onAnalyzePrescription}
            onAddParsedItems={onAddParsedItems}
          />
        </Reveal>
      ) : null}

      <MedicationRegimenSection
        medications={data.medications}
        patientName={data.profile.name}
        isCaretaker={isCaretaker}
        onAddClick={() => {
          setEditingMed(null);
          setMedModalOpen(true);
        }}
        onEditClick={(med) => {
          setEditingMed(med);
          setMedModalOpen(true);
        }}
        onDoseAction={onDoseAction}
        onToggleMedicationActive={onToggleMedicationActive}
        onDeleteMedication={onDeleteMedication}
      />

      {onCreateNote ? (
        <ShiftNotesSection
          careNotes={data.careNotes ?? []}
          onCreateNote={onCreateNote}
          onDeleteNote={onDeleteNote}
        />
      ) : null}

      <CareCirclePanels
        data={data}
        onCreateAppointment={onCreateAppointment}
        onDeleteAppointment={onDeleteAppointment}
        onAddMember={onAddMember}
        onRemoveMember={onRemoveMember}
        onRunReminders={onRunReminders}
      />

      {medModalOpen ? (
        <AddMedicationModal
          key={editingMed?.id ?? "new"}
          open={medModalOpen}
          initialMedication={editingMed}
          onClose={() => {
            setMedModalOpen(false);
            setEditingMed(null);
          }}
          onSubmit={handleSaveMedication}
        />
      ) : null}

      {profileModalOpen ? (
        <EditProfileModal
          open={profileModalOpen}
          profile={data.profile}
          onClose={() => setProfileModalOpen(false)}
          onSave={onUpdateProfile}
        />
      ) : null}
    </div>
  );
}
