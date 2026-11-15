import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createMedicationSchema } from "@/domain/schemas";
import type { Medication } from "@/domain/types";
import { parseJsonBody, requireSession } from "@/lib/api-utils";
import { getDashboardSnapshot, mutateStore } from "@/lib/store";

export async function POST(request: Request) {
  const auth = await requireSession(request, ["caretaker"]);
  if (!auth.success) return auth.response;

  const parsed = await parseJsonBody(request, createMedicationSchema);
  if (!parsed.success) return parsed.response;

  const newMedication: Medication = {
    id: `med-${randomUUID().slice(0, 8)}`,
    ...parsed.data,
    active: true,
  };

  await mutateStore((draft) => ({
    ...draft,
    medications: [newMedication, ...draft.medications],
  }));

  return NextResponse.json(
    {
      medication: newMedication,
      dashboard: await getDashboardSnapshot(auth.session.role),
    },
    { status: 201 }
  );
}
