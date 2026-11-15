import { NextResponse } from "next/server";
import { sosAlertSchema } from "@/domain/schemas";
import { formatDateKey } from "@/domain/schedule";
import { parseJsonBody } from "@/lib/api-utils";
import { buildDashboardPayload } from "@/lib/seed";
import { mutateStore } from "@/lib/store";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, sosAlertSchema);
  if (!parsed.success) return parsed.response;

  const nextStore = mutateStore((draft) => {
    const channelLabel =
      parsed.data.channel === "whatsapp"
        ? "WhatsApp"
        : parsed.data.channel === "sms"
          ? "SMS"
          : parsed.data.channel === "call"
            ? "phone call"
            : "SOS card";

    const alert = {
      id: `sos-${crypto.randomUUID().slice(0, 8)}`,
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

  return NextResponse.json(buildDashboardPayload(nextStore, formatDateKey()), {
    status: 201,
  });
}
