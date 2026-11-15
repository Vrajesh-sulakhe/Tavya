import { NextResponse } from "next/server";
import { updateMedicationSchema } from "@/domain/schemas";
import { parseJsonBody, requireSession } from "@/lib/api-utils";
import { getDashboardSnapshot, mutateStore } from "@/lib/store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireSession(request, ["caretaker"]);
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const parsed = await parseJsonBody(request, updateMedicationSchema);
  if (!parsed.success) return parsed.response;

  const existing = auth.store.medications.find((m) => m.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Medication not found" }, { status: 404 });
  }

  await mutateStore((draft) => ({
    ...draft,
    medications: draft.medications.map((med) =>
      med.id === id ? { ...med, ...parsed.data } : med
    ),
  }));

  return NextResponse.json(await getDashboardSnapshot(auth.session.role));
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireSession(request, ["caretaker"]);
  if (!auth.success) return auth.response;

  const { id } = await context.params;
  const existing = auth.store.medications.find((m) => m.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Medication not found" }, { status: 404 });
  }

  await mutateStore((draft) => ({
    ...draft,
    medications: draft.medications.filter((med) => med.id !== id),
    doseLogs: draft.doseLogs.filter((log) => log.medicationId !== id),
  }));

  return NextResponse.json(await getDashboardSnapshot(auth.session.role));
}
