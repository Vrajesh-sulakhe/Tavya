import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createMedicationSchema } from "@/domain/schemas";
import { formatDateKey } from "@/domain/schedule";
import type { Medication } from "@/domain/types";
import { parseJsonBody } from "@/lib/api-utils";
import { buildDashboardPayload } from "@/lib/seed";
import { mutateStore } from "@/lib/store";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createMedicationSchema);
  if (!parsed.success) return parsed.response;

  const newMedication: Medication = {
    id: `med-${randomUUID().slice(0, 8)}`,
    ...parsed.data,
    active: true,
  };

  const nextStore = mutateStore((draft) => ({
    ...draft,
    medications: [newMedication, ...draft.medications],
  }));

  return NextResponse.json(
    {
      medication: newMedication,
      dashboard: buildDashboardPayload(nextStore, formatDateKey()),
    },
    { status: 201 }
  );
}
