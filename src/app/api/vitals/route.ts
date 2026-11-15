import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { logVitalsSchema } from "@/domain/schemas";
import type { CareAlert, VitalsLog } from "@/domain/types";
import { parseJsonBody, requireSession } from "@/lib/api-utils";
import { getDashboardSnapshot, mutateStore } from "@/lib/store";

export async function POST(request: Request) {
  const auth = await requireSession(request, ["senior", "caretaker"]);
  if (!auth.success) return auth.response;

  const parsed = await parseJsonBody(request, logVitalsSchema);
  if (!parsed.success) return parsed.response;

  const now = new Date().toISOString();
  const entry: VitalsLog = {
    id: `vital-${randomUUID().slice(0, 8)}`,
    ...parsed.data,
    recordedAt: now,
  };

  const highBp =
    parsed.data.systolic !== undefined && parsed.data.systolic >= 145;
  const highSugar =
    parsed.data.bloodSugarMgDl !== undefined &&
    parsed.data.bloodSugarMgDl >= 220;
  const needsAlert =
    parsed.data.mood === "dizzy" ||
    parsed.data.mood === "nausea" ||
    highBp ||
    highSugar;

  const newAlert: CareAlert | null = needsAlert
    ? {
        id: `alert-${randomUUID().slice(0, 8)}`,
        severity: parsed.data.mood === "dizzy" ? "critical" : "warning",
        category: "wellness",
        title: `Wellness check-in: ${parsed.data.mood.toUpperCase()}`,
        detail: [
          parsed.data.systolic && parsed.data.diastolic
            ? `BP ${parsed.data.systolic}/${parsed.data.diastolic} mmHg`
            : null,
          parsed.data.bloodSugarMgDl
            ? `Sugar ${parsed.data.bloodSugarMgDl} mg/dL`
            : null,
          parsed.data.note ?? "Caregiver follow-up recommended.",
        ]
          .filter(Boolean)
          .join(" · "),
        createdAt: now,
      }
    : null;

  await mutateStore((draft) => ({
    ...draft,
    vitalsLogs: [entry, ...draft.vitalsLogs].slice(0, 20),
    alerts: newAlert
      ? [newAlert, ...draft.alerts].slice(0, 15)
      : draft.alerts,
  }));

  return NextResponse.json(await getDashboardSnapshot(auth.session.role), {
    status: 201,
  });
}
