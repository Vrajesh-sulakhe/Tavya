import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveSessionSecret, signSessionToken } from "@/domain/auth";
import { restoreStateSchema } from "@/domain/schemas";
import { formatDateKey } from "@/domain/schedule";
import {
  attachSessionCookie,
  parseJsonBody,
  requireSession,
} from "@/lib/api-utils";
import { getEmailDeliveryMode } from "@/lib/email";
import { buildDashboardPayload, DEFAULT_CONSENT } from "@/lib/seed";
import {
  clearStore,
  getDashboardSnapshot,
  getPersistenceMode,
  mutateStore,
  resetStore,
} from "@/lib/store";

const dashboardActionSchema = z.object({
  action: z.enum(["reset", "clear"]),
});

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (!auth.success) return auth.response;

  return NextResponse.json(await getDashboardSnapshot(auth.session.role));
}

export async function POST(request: Request) {
  const auth = await requireSession(request, ["caretaker"]);
  if (!auth.success) return auth.response;

  const parsed = await parseJsonBody(request, dashboardActionSchema);
  if (!parsed.success) return parsed.response;

  const nextStore =
    parsed.data.action === "clear" ? await clearStore() : await resetStore();

  const payload = buildDashboardPayload(nextStore, {
    todayKey: formatDateKey(),
    viewerRole: auth.session.role,
    persistence: getPersistenceMode(),
    emailDelivery: getEmailDeliveryMode(),
  });

  const response = NextResponse.json(payload);

  // If resetting into demo circle, refresh the caretaker cookie so the current operator stays signed in
  if (parsed.data.action === "reset") {
    const caretaker = (nextStore.circle?.members ?? []).find(
      (m) => m.role === "caretaker"
    );
    if (caretaker) {
      const token = signSessionToken(
        {
          memberId: caretaker.id,
          name: caretaker.name,
          role: caretaker.role,
        },
        resolveSessionSecret(nextStore.circle)
      );
      attachSessionCookie(response, token);
    }
  }

  return response;
}

export async function PUT(request: Request) {
  const auth = await requireSession(request, ["caretaker"]);
  if (!auth.success) return auth.response;

  const parsed = await parseJsonBody(request, restoreStateSchema);
  if (!parsed.success) return parsed.response;

  await mutateStore((draft) => ({
    ...parsed.data,
    appointments: parsed.data.appointments ?? draft.appointments ?? [],
    consent: parsed.data.consent ?? draft.consent ?? { ...DEFAULT_CONSENT },
    emailLog: draft.emailLog ?? [],
    circle: draft.circle,
  }));

  return NextResponse.json(await getDashboardSnapshot(auth.session.role));
}
