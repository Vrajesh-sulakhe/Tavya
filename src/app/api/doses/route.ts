import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { logDoseSchema } from "@/domain/schemas";
import { formatDateKey } from "@/domain/schedule";
import { parseJsonBody, requireSession } from "@/lib/api-utils";
import { getEmailDeliveryMode } from "@/lib/email";
import { buildDashboardPayload } from "@/lib/seed";
import { getPersistenceMode, mutateStore } from "@/lib/store";

export async function POST(request: Request) {
  const auth = await requireSession(request, ["senior", "caretaker"]);
  if (!auth.success) return auth.response;

  const parsed = await parseJsonBody(request, logDoseSchema);
  if (!parsed.success) return parsed.response;

  const { medicationId, slot, status } = parsed.data;
  const dateKey = parsed.data.dateKey ?? formatDateKey();

  const med = auth.store.medications.find((m) => m.id === medicationId);
  if (!med) {
    return NextResponse.json({ error: "Medication not found" }, { status: 404 });
  }

  const nextStore = await mutateStore((draft) => {
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

  return NextResponse.json(
    buildDashboardPayload(nextStore, {
      todayKey: dateKey,
      viewerRole: auth.session.role,
      persistence: getPersistenceMode(),
      emailDelivery: getEmailDeliveryMode(),
    })
  );
}
