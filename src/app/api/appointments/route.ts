import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAppointmentSchema } from "@/domain/schemas";
import type { Appointment } from "@/domain/types";
import { parseJsonBody, requireSession } from "@/lib/api-utils";
import { getDashboardSnapshot, mutateStore } from "@/lib/store";

export async function POST(request: Request) {
  const auth = await requireSession(request, ["caretaker", "family"]);
  if (!auth.success) return auth.response;

  const parsed = await parseJsonBody(request, createAppointmentSchema);
  if (!parsed.success) return parsed.response;

  const newAppointment: Appointment = {
    id: `appt-${randomUUID().slice(0, 8)}`,
    title: parsed.data.title,
    doctor: parsed.data.doctor,
    location: parsed.data.location,
    startsAt: new Date(parsed.data.startsAt).toISOString(),
    notes: parsed.data.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  await mutateStore((draft) => ({
    ...draft,
    appointments: [...(draft.appointments ?? []), newAppointment].slice(0, 50),
  }));

  const dashboard = await getDashboardSnapshot(auth.session.role);
  return NextResponse.json(
    { appointment: newAppointment, dashboard },
    { status: 201 }
  );
}
