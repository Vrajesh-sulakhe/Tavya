import { NextResponse } from "next/server";
import { updateMedicationSchema } from "@/domain/schemas";
import { formatDateKey } from "@/domain/schedule";
import { parseJsonBody } from "@/lib/api-utils";
import { buildDashboardPayload } from "@/lib/seed";
import { mutateStore, readStore } from "@/lib/store";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const parsed = await parseJsonBody(request, updateMedicationSchema);
  if (!parsed.success) return parsed.response;

  const existing = readStore().medications.find((m) => m.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Medication not found" }, { status: 404 });
  }

  const nextStore = mutateStore((draft) => ({
    ...draft,
    medications: draft.medications.map((med) =>
      med.id === id ? { ...med, ...parsed.data } : med
    ),
  }));

  return NextResponse.json(buildDashboardPayload(nextStore, formatDateKey()));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const existing = readStore().medications.find((m) => m.id === id);
  if (!existing) {
    return NextResponse.json({ error: "Medication not found" }, { status: 404 });
  }

  const nextStore = mutateStore((draft) => ({
    ...draft,
    medications: draft.medications.filter((med) => med.id !== id),
    doseLogs: draft.doseLogs.filter((log) => log.medicationId !== id),
  }));

  return NextResponse.json(buildDashboardPayload(nextStore, formatDateKey()));
}
