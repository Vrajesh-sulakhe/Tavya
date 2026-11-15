import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { logDoseSchema } from "@/domain/schemas";
import { formatDateKey } from "@/domain/schedule";
import { parseJsonBody } from "@/lib/api-utils";
import { buildDashboardPayload } from "@/lib/seed";
import { mutateStore, readStore } from "@/lib/store";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, logDoseSchema);
  if (!parsed.success) return parsed.response;

  const { medicationId, slot, status } = parsed.data;
  const dateKey = parsed.data.dateKey ?? formatDateKey();

  const current = readStore();
  const med = current.medications.find((m) => m.id === medicationId);
  if (!med) {
    return NextResponse.json({ error: "Medication not found" }, { status: 404 });
  }

  const nextStore = mutateStore((draft) => {
    const existingIdx = draft.doseLogs.findIndex(
      (l) =>
        l.medicationId === medicationId &&
        l.dateKey === dateKey &&
        l.slot === slot
    );
    const previousStatus =
      existingIdx >= 0 ? draft.doseLogs[existingIdx]?.status : "pending";

    const pillDelta =
      previousStatus !== "taken" && status === "taken"
        ? -1
        : previousStatus === "taken" && status !== "taken"
          ? 1
          : 0;

    const updatedMedications = draft.medications.map((m) =>
      m.id === medicationId
        ? { ...m, pillsRemaining: Math.max(0, m.pillsRemaining + pillDelta) }
        : m
    );

    const updatedLog = {
      id:
        existingIdx >= 0
          ? (draft.doseLogs[existingIdx]?.id ?? `log-${randomUUID().slice(0, 8)}`)
          : `log-${randomUUID().slice(0, 8)}`,
      medicationId,
      dateKey,
      slot,
      status,
      updatedAt: new Date().toISOString(),
    };

    const updatedLogs =
      existingIdx >= 0
        ? draft.doseLogs.map((l, idx) => (idx === existingIdx ? updatedLog : l))
        : [...draft.doseLogs, updatedLog];

    return {
      ...draft,
      medications: updatedMedications,
      doseLogs: updatedLogs,
    };
  });

  return NextResponse.json(buildDashboardPayload(nextStore, dateKey));
}
