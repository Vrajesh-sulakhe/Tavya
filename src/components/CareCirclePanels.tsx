"use client";

import { useState, type FormEvent } from "react";
import { Plus, ShieldCheck, Trash, UsersThree } from "@phosphor-icons/react";
import type { CircleRole, DashboardPayload } from "@/domain/types";
import {
  AppointmentsPanel,
  type CreateAppointmentInput,
} from "./circle/AppointmentsPanel";
import { EmailRemindersOutboxPanel } from "./circle/EmailRemindersOutboxPanel";
import { BezelCard } from "./ui/BezelCard";
import { Reveal } from "./ui/Reveal";

export type { CreateAppointmentInput };

export interface CreateMemberInput {
  name: string;
  role: CircleRole;
  email: string;
  passcode: string;
}

interface CareCirclePanelsProps {
  data: DashboardPayload;
  onCreateAppointment?: (payload: CreateAppointmentInput) => Promise<void>;
  onDeleteAppointment?: (id: string) => Promise<void>;
  onAddMember?: (payload: CreateMemberInput) => Promise<void>;
  onRemoveMember?: (id: string) => Promise<void>;
  onRunReminders?: () => Promise<string>;
}

const ROLE_LABELS: Record<CircleRole, string> = {
  senior: "Senior",
  caretaker: "Caretaker",
  family: "Family",
};

export function CareCirclePanels({
  data,
  onCreateAppointment,
  onDeleteAppointment,
  onAddMember,
  onRemoveMember,
  onRunReminders,
}: CareCirclePanelsProps) {
  const isCaretaker = data.viewerRole === "caretaker";
  const canManageAppointments =
    data.viewerRole === "caretaker" || data.viewerRole === "family";

  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState<CircleRole>("family");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPasscode, setMemberPasscode] = useState("");
  const [memberError, setMemberError] = useState("");
  const [savingMember, setSavingMember] = useState(false);

  async function handleMemberSubmit(e: FormEvent) {
    e.preventDefault();
    if (!onAddMember) return;
    setMemberError("");
    setSavingMember(true);
    try {
      await onAddMember({
        name: memberName.trim(),
        role: memberRole,
        email: memberEmail.trim(),
        passcode: memberPasscode.trim(),
      });
      setMemberName("");
      setMemberEmail("");
      setMemberPasscode("");
    } catch (err) {
      setMemberError(
        err instanceof Error ? err.message : "Could not add circle member."
      );
    } finally {
      setSavingMember(false);
    }
  }

  return (
    <div className="space-y-8">
      <AppointmentsPanel
        appointments={data.appointments}
        canManageAppointments={canManageAppointments}
        onCreateAppointment={onCreateAppointment}
        onDeleteAppointment={onDeleteAppointment}
      />

      <EmailRemindersOutboxPanel
        emailDelivery={data.emailDelivery}
        persistence={data.persistence}
        emailLog={data.emailLog}
        isCaretaker={isCaretaker}
        onRunReminders={onRunReminders}
      />

      <Reveal delayMs={200}>
        <section aria-labelledby="care-circle-heading" className="no-print">
          <BezelCard innerClassName="p-5 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <UsersThree
                    size={22}
                    weight="light"
                    className="text-[#0F6B54]"
                    aria-hidden="true"
                  />
                  <h2
                    id="care-circle-heading"
                    className="font-display text-3xl text-[#141D19]"
                  >
                    Care Circle Members ({data.members.length})
                  </h2>
                </div>
                <p className="mt-1 text-sm text-[#46534C]">
                  Each authorized member signs in with a scrypt-hashed numeric
                  passcode tailored to their role.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-[#E6F3EE] px-3.5 py-1.5 text-xs font-semibold text-[#0F6B54]">
                <ShieldCheck size={16} weight="light" aria-hidden="true" />
                <span>
                  Senior Privacy:{" "}
                  {data.consent.shareVitalsWithFamily
                    ? "Vitals Shared"
                    : "Vitals Private"}{" "}
                  · Missed-Dose Emails{" "}
                  {data.consent.emailFamilyOnMissedDose ? "On" : "Paused"}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-[#FDFBF7] p-4 ring-1 ring-[#141D19]/[0.07]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-[#141D19]">
                        {member.name}
                      </span>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#0F6B54] ring-1 ring-[#0F6B54]/20">
                        {ROLE_LABELS[member.role]}
                      </span>
                    </div>
                    <p className="font-mono-num mt-0.5 truncate text-xs text-[#617068]">
                      {member.email ?? "No email set"} · Passcode ••••
                    </p>
                  </div>

                  {isCaretaker && onRemoveMember ? (
                    <button
                      type="button"
                      onClick={() => void onRemoveMember(member.id)}
                      aria-label={`Remove ${member.name}`}
                      className="inline-flex min-h-[38px] min-w-[38px] shrink-0 items-center justify-center rounded-full bg-white text-[#B42318] ring-1 ring-[#B42318]/20 hover:bg-[#FEE4E2]"
                    >
                      <Trash size={14} weight="light" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            {isCaretaker && onAddMember ? (
              <form
                onSubmit={handleMemberSubmit}
                className="mt-5 grid gap-3 rounded-2xl bg-[#FDFBF7] p-4 ring-1 ring-[#141D19]/[0.07] sm:grid-cols-2 lg:grid-cols-5"
              >
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Member Name"
                  aria-label="New member name"
                  className="min-h-[44px] rounded-xl bg-white px-3.5 py-2 text-sm text-[#141D19] ring-1 ring-[#141D19]/12"
                />
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as CircleRole)}
                  aria-label="New member role"
                  className="min-h-[44px] rounded-xl bg-white px-3.5 py-2 text-sm text-[#141D19] ring-1 ring-[#141D19]/12"
                >
                  <option value="family">Family Member</option>
                  <option value="caretaker">Caretaker</option>
                  <option value="senior">Senior</option>
                </select>
                <input
                  type="email"
                  required
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="Email for reminders"
                  aria-label="New member email"
                  className="min-h-[44px] rounded-xl bg-white px-3.5 py-2 text-sm text-[#141D19] ring-1 ring-[#141D19]/12"
                />
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]{4,8}"
                  minLength={4}
                  maxLength={8}
                  required
                  value={memberPasscode}
                  onChange={(e) => setMemberPasscode(e.target.value)}
                  placeholder="4–8 digit passcode"
                  aria-label="New member passcode"
                  className="font-mono-num min-h-[44px] rounded-xl bg-white px-3.5 py-2 text-sm text-[#141D19] ring-1 ring-[#141D19]/12"
                />
                <button
                  type="submit"
                  disabled={savingMember}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#141D19] px-5 py-2 text-sm font-semibold text-white hover:bg-[#27352E] disabled:opacity-60"
                >
                  <Plus size={16} weight="bold" aria-hidden="true" />
                  <span>{savingMember ? "Adding…" : "Add Member"}</span>
                </button>
                {memberError ? (
                  <p
                    role="alert"
                    className="text-xs font-semibold text-[#B42318] sm:col-span-2 lg:col-span-5"
                  >
                    {memberError}
                  </p>
                ) : null}
              </form>
            ) : null}
          </BezelCard>
        </section>
      </Reveal>
    </div>
  );
}
