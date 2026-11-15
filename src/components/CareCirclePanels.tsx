"use client";

import { useState, type FormEvent } from "react";
import {
  CalendarCheck,
  Database,
  EnvelopeSimple,
  PaperPlaneTilt,
  Plus,
  ShieldCheck,
  Trash,
  UsersThree,
} from "@phosphor-icons/react";
import type { CircleRole, DashboardPayload } from "@/domain/types";
import { BezelCard } from "./ui/BezelCard";
import { Reveal } from "./ui/Reveal";

export interface CreateAppointmentInput {
  title: string;
  doctor: string;
  location: string;
  startsAt: string;
  notes?: string;
}

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

const EMAIL_STATUS_BADGE: Record<string, string> = {
  sent: "bg-[#E6F3EE] text-[#0F6B54]",
  preview: "bg-[#FEF3C7] text-[#92400E]",
  failed: "bg-[#FEE4E2] text-[#7A1B14]",
  skipped: "bg-[#F2EDE3] text-[#46534C]",
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

  // Doctor Appointment form state
  const [apptTitle, setApptTitle] = useState("");
  const [apptDoctor, setApptDoctor] = useState("");
  const [apptLocation, setApptLocation] = useState("");
  const [apptStartsAt, setApptStartsAt] = useState("");
  const [apptNotes, setApptNotes] = useState("");
  const [apptError, setApptError] = useState("");
  const [savingAppt, setSavingAppt] = useState(false);

  // Member Invite form state
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState<CircleRole>("family");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPasscode, setMemberPasscode] = useState("");
  const [memberError, setMemberError] = useState("");
  const [savingMember, setSavingMember] = useState(false);

  // Reminder run state
  const [runningReminders, setRunningReminders] = useState(false);
  const [reminderStatus, setReminderStatus] = useState("");

  async function handleApptSubmit(e: FormEvent) {
    e.preventDefault();
    if (!onCreateAppointment) return;
    setApptError("");
    setSavingAppt(true);
    try {
      await onCreateAppointment({
        title: apptTitle.trim(),
        doctor: apptDoctor.trim(),
        location: apptLocation.trim(),
        startsAt: apptStartsAt,
        notes: apptNotes.trim() || undefined,
      });
      setApptTitle("");
      setApptDoctor("");
      setApptLocation("");
      setApptStartsAt("");
      setApptNotes("");
    } catch (err) {
      setApptError(
        err instanceof Error ? err.message : "Could not schedule appointment."
      );
    } finally {
      setSavingAppt(false);
    }
  }

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

  async function handleTriggerReminders() {
    if (!onRunReminders) return;
    setRunningReminders(true);
    try {
      const msg = await onRunReminders();
      setReminderStatus(msg);
    } finally {
      setRunningReminders(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Structured Doctor Appointments */}
      <Reveal delayMs={160}>
        <section aria-labelledby="appointments-heading">
          <BezelCard innerClassName="p-5 sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CalendarCheck
                    size={22}
                    weight="light"
                    className="text-[#0F6B54]"
                    aria-hidden="true"
                  />
                  <h2
                    id="appointments-heading"
                    className="font-display text-3xl text-[#141D19]"
                  >
                    Medical Appointments ({data.appointments.length})
                  </h2>
                </div>
                <p className="mt-1 text-sm text-[#46534C]">
                  Track upcoming doctor consultations. Appointments within 24
                  hours trigger proactive email reminders across the Care Circle.
                </p>
              </div>
            </div>

            {canManageAppointments && onCreateAppointment ? (
              <form
                onSubmit={handleApptSubmit}
                className="no-print mt-5 grid gap-3 rounded-2xl bg-[#FDFBF7] p-4 ring-1 ring-[#141D19]/[0.07] sm:grid-cols-2 lg:grid-cols-4"
              >
                <input
                  type="text"
                  required
                  value={apptTitle}
                  onChange={(e) => setApptTitle(e.target.value)}
                  placeholder="Visit reason (e.g. Cardiology Review)"
                  aria-label="Appointment reason"
                  className="min-h-[44px] rounded-xl bg-white px-3.5 py-2 text-sm text-[#141D19] ring-1 ring-[#141D19]/12"
                />
                <input
                  type="text"
                  required
                  value={apptDoctor}
                  onChange={(e) => setApptDoctor(e.target.value)}
                  placeholder="Doctor / Clinic"
                  aria-label="Doctor or clinic"
                  className="min-h-[44px] rounded-xl bg-white px-3.5 py-2 text-sm text-[#141D19] ring-1 ring-[#141D19]/12"
                />
                <input
                  type="text"
                  required
                  value={apptLocation}
                  onChange={(e) => setApptLocation(e.target.value)}
                  placeholder="Location"
                  aria-label="Clinic location"
                  className="min-h-[44px] rounded-xl bg-white px-3.5 py-2 text-sm text-[#141D19] ring-1 ring-[#141D19]/12"
                />
                <input
                  type="datetime-local"
                  required
                  value={apptStartsAt}
                  onChange={(e) => setApptStartsAt(e.target.value)}
                  aria-label="Appointment date and time"
                  className="font-mono-num min-h-[44px] rounded-xl bg-white px-3.5 py-2 text-sm text-[#141D19] ring-1 ring-[#141D19]/12"
                />
                <input
                  type="text"
                  value={apptNotes}
                  onChange={(e) => setApptNotes(e.target.value)}
                  placeholder="Preparation notes (optional)"
                  aria-label="Appointment preparation notes"
                  className="min-h-[44px] rounded-xl bg-white px-3.5 py-2 text-sm text-[#141D19] ring-1 ring-[#141D19]/12 sm:col-span-2 lg:col-span-3"
                />
                <button
                  type="submit"
                  disabled={savingAppt}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#0F6B54] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0B5341] disabled:opacity-60"
                >
                  <Plus size={16} weight="bold" aria-hidden="true" />
                  <span>{savingAppt ? "Saving…" : "Add Visit"}</span>
                </button>
                {apptError ? (
                  <p
                    role="alert"
                    className="text-xs font-semibold text-[#B42318] sm:col-span-2 lg:col-span-4"
                  >
                    {apptError}
                  </p>
                ) : null}
              </form>
            ) : null}

            <div className="mt-5 space-y-2.5">
              {data.appointments.length === 0 ? (
                <p className="rounded-2xl bg-[#FDFBF7] px-4 py-4 text-sm text-[#617068]">
                  No doctor appointments scheduled yet.
                </p>
              ) : (
                data.appointments.map((appt) => {
                  const formatted = new Date(appt.startsAt).toLocaleString(
                    "en-IN",
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }
                  );
                  return (
                    <div
                      key={appt.id}
                      className="flex flex-col justify-between gap-3 rounded-2xl bg-[#FDFBF7] p-4 ring-1 ring-[#141D19]/[0.07] sm:flex-row sm:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-[#141D19]">
                            {appt.title}
                          </span>
                          <span className="font-mono-num rounded-full bg-[#E6F3EE] px-2.5 py-0.5 text-xs font-semibold text-[#0F6B54]">
                            {formatted}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-[#46534C]">
                          {appt.doctor}
                          {appt.location ? ` · ${appt.location}` : ""}
                        </p>
                        {appt.notes ? (
                          <p className="mt-1 text-xs text-[#617068]">
                            {appt.notes}
                          </p>
                        ) : null}
                      </div>

                      {canManageAppointments && onDeleteAppointment ? (
                        <button
                          type="button"
                          onClick={() => void onDeleteAppointment(appt.id)}
                          aria-label={`Delete ${appt.title}`}
                          className="no-print inline-flex min-h-[40px] min-w-[40px] shrink-0 items-center justify-center self-start rounded-full bg-white text-[#B42318] ring-1 ring-[#B42318]/20 hover:bg-[#FEE4E2] sm:self-center"
                        >
                          <Trash size={15} weight="light" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </BezelCard>
        </section>
      </Reveal>

      {/* Proactive Email Reminders & Outbox + Storage Status */}
      <Reveal delayMs={180}>
        <section aria-labelledby="email-outbox-heading" className="no-print">
          <BezelCard innerClassName="p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <EnvelopeSimple
                    size={22}
                    weight="light"
                    className="text-[#0F6B54]"
                    aria-hidden="true"
                  />
                  <h2
                    id="email-outbox-heading"
                    className="font-display text-3xl text-[#141D19]"
                  >
                    Email Reminders &amp; Outbox
                  </h2>
                </div>
                <p className="mt-1 text-sm text-[#46534C]">
                  Automated checks email circle members for upcoming doses,
                  missed dose windows, and appointments within 24 hours.
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDFBF7] px-3 py-1 text-[#141D19] ring-1 ring-[#141D19]/10">
                    <EnvelopeSimple size={14} weight="light" aria-hidden="true" />
                    <span>
                      Delivery:{" "}
                      {data.emailDelivery === "live"
                        ? "Resend Live API"
                        : "Outbox Preview"}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDFBF7] px-3 py-1 text-[#141D19] ring-1 ring-[#141D19]/10">
                    <Database size={14} weight="light" aria-hidden="true" />
                    <span>
                      Storage:{" "}
                      {data.persistence === "durable"
                        ? "Upstash Redis Durable"
                        : "Local Ephemeral Disk"}
                    </span>
                  </span>
                </div>
              </div>

              {isCaretaker && onRunReminders ? (
                <button
                  type="button"
                  disabled={runningReminders}
                  onClick={handleTriggerReminders}
                  className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-full bg-[#141D19] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#27352E] disabled:opacity-60"
                >
                  <PaperPlaneTilt size={16} weight="light" aria-hidden="true" />
                  <span>
                    {runningReminders
                      ? "Checking Due Reminders…"
                      : "Send Due Reminders Now"}
                  </span>
                </button>
              ) : null}
            </div>

            {reminderStatus ? (
              <p
                role="status"
                className="mt-4 rounded-2xl bg-[#E6F3EE] px-4 py-2.5 text-sm font-medium text-[#0F6B54]"
              >
                {reminderStatus}
              </p>
            ) : null}

            <div className="mt-5 space-y-2.5">
              {data.emailLog.length === 0 ? (
                <p className="rounded-2xl bg-[#FDFBF7] px-4 py-4 text-sm text-[#617068]">
                  No reminder emails queued yet for today&apos;s window. Use
                  &ldquo;Send Due Reminders Now&rdquo; to evaluate active slots
                  and upcoming appointments.
                </p>
              ) : (
                data.emailLog.slice(0, 12).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col justify-between gap-2 rounded-2xl bg-[#FDFBF7] p-3.5 ring-1 ring-[#141D19]/[0.07] sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                            EMAIL_STATUS_BADGE[entry.status] ??
                            "bg-[#F2EDE3] text-[#46534C]"
                          }`}
                        >
                          {entry.status}
                        </span>
                        <span className="text-sm font-semibold text-[#141D19]">
                          {entry.subject}
                        </span>
                      </div>
                      <p className="font-mono-num mt-1 text-xs text-[#46534C]">
                        To: {entry.recipients.join(", ")}
                        {entry.detail ? ` · ${entry.detail}` : ""}
                      </p>
                    </div>
                    <span className="font-mono-num shrink-0 text-[11px] text-[#617068]">
                      {entry.createdAt.slice(0, 16).replace("T", " ")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </BezelCard>
        </section>
      </Reveal>

      {/* Care Circle Members & Senior Consent Visibility */}
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
