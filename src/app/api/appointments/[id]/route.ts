import { NextResponse } from "next/server";
import { updateAppointmentSchema } from "@/domain/schemas";
import { parseJsonBody, requireSession } from "@/lib/api-utils";
import { getDashboardSnapshot, mutateStore } from "@/lib/store";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request, ["caretaker", "family"]);
  if (!auth.success) return auth.response;

  const parsed = await parseJsonBody(request, updateAppointmentSchema);
  if (!parsed.success) return parsed.response;

  const { id } = await context.params;
  const exists = (auth.store.appointments ?? []).some((a) => a.id === id);
  if (!exists) {
    return NextResponse.json(
      { error: "Appointment not found." },
      { status: 404 }
    );
  }

  await mutateStore((draft) => ({
    ...draft,
    appointments: (draft.appointments ?? []).map((appt) =>
      appt.id === id
        ? {
            ...appt,
            ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
            ...(parsed.data.doctor !== undefined ? { doctor: parsed.data.doctor } : {}),
            ...(parsed.data.location !== undefined
              ? { location: parsed.data.location }
              : {}),
            ...(parsed.data.startsAt !== undefined
              ? { startsAt: new Date(parsed.data.startsAt).toISOString() }
              : {}),
            ...(parsed.data.notes !== undefined
              ? { notes: parsed.data.notes.trim() || undefined }
              : {}),
          }
        : appt
    ),
  }));

  const dashboard = await getDashboardSnapshot(auth.session.role);
  return NextResponse.json({ ok: true, dashboard });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request, ["caretaker", "family"]);
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const exists = (auth.store.appointments ?? []).some((a) => a.id === id);
  if (!exists) {
    return NextResponse.json(
      { error: "Appointment not found." },
      { status: 404 }
    );
  }

  await mutateStore((draft) => ({
    ...draft,
    appointments: (draft.appointments ?? []).filter((appt) => appt.id !== id),
  }));

  const dashboard = await getDashboardSnapshot(auth.session.role);
  return NextResponse.json({ ok: true, dashboard });
}
