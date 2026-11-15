"use client";

import { useState, type FormEvent } from "react";
import { CalendarCheck, Plus, Trash } from "@phosphor-icons/react";
import type { Appointment } from "@/domain/types";
import { BezelCard } from "../ui/BezelCard";
import { Reveal } from "../ui/Reveal";

export interface CreateAppointmentInput {
  title: string;
  doctor: string;
  location: string;
  startsAt: string;
  notes?: string;
}

interface AppointmentsPanelProps {
  appointments: Appointment[];
  canManageAppointments: boolean;
  onCreateAppointment?: (payload: CreateAppointmentInput) => Promise<void>;
  onDeleteAppointment?: (id: string) => Promise<void>;
}

export function AppointmentsPanel({
  appointments,
  canManageAppointments,
  onCreateAppointment,
  onDeleteAppointment,
}: AppointmentsPanelProps) {
  const [apptTitle, setApptTitle] = useState("");
  const [apptDoctor, setApptDoctor] = useState("");
  const [apptLocation, setApptLocation] = useState("");
  const [apptStartsAt, setApptStartsAt] = useState("");
  const [apptNotes, setApptNotes] = useState("");
  const [apptError, setApptError] = useState("");
  const [savingAppt, setSavingAppt] = useState(false);

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

  return (
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
                  Medical Appointments ({appointments.length})
                </h2>
              </div>
              <p className="mt-1 text-sm text-[#46534C]">
                Track upcoming doctor consultations. Appointments within 24 hours
                trigger proactive email reminders across the Care Circle.
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
            {appointments.length === 0 ? (
              <p className="rounded-2xl bg-[#FDFBF7] px-4 py-4 text-sm text-[#617068]">
                No doctor appointments scheduled yet.
              </p>
            ) : (
              appointments.map((appt) => {
                const formatted = new Date(appt.startsAt).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                });
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
                        <p className="mt-1 text-xs text-[#617068]">{appt.notes}</p>
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
  );
}
