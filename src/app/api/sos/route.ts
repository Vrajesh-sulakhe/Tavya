import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { sosAlertSchema } from "@/domain/schemas";
import { parseJsonBody, requireSession } from "@/lib/api-utils";
import { getDashboardSnapshot, mutateStore } from "@/lib/store";

export async function POST(request: Request) {
  const auth = await requireSession(request, ["senior", "caretaker"]);
  if (!auth.success) return auth.response;

  const parsed = await parseJsonBody(request, sosAlertSchema);
  if (!parsed.success) return parsed.response;

  await mutateStore((draft) => {
    const channelLabel =
      parsed.data.channel === "whatsapp"
        ? "WhatsApp"
        : parsed.data.channel === "sms"
          ? "SMS"
          : parsed.data.channel === "call"
            ? "phone call"
            : "SOS card";

    const alert = {
      id: `sos-${randomUUID().slice(0, 8)}`,
      severity: "critical" as const,
      category: "sos" as const,
      title: `Emergency SOS triggered (${channelLabel})`,
      detail:
        parsed.data.note?.trim() ||
        `${draft.profile.name} opened emergency assistance for ${draft.profile.caregiverName}.`,
      createdAt: new Date().toISOString(),
    };

    return {
      ...draft,
      alerts: [alert, ...draft.alerts].slice(0, 25),
    };
  });

  return NextResponse.json(await getDashboardSnapshot(auth.session.role), {
    status: 201,
  });
}
