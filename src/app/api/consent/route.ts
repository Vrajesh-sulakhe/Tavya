import { NextResponse } from "next/server";
import { updateConsentSchema } from "@/domain/schemas";
import { parseJsonBody, requireSession } from "@/lib/api-utils";
import { DEFAULT_CONSENT } from "@/lib/seed";
import { getDashboardSnapshot, mutateStore } from "@/lib/store";

export async function PATCH(request: Request) {
  const auth = await requireSession(request, ["senior", "caretaker"]);
  if (!auth.success) return auth.response;

  const parsed = await parseJsonBody(request, updateConsentSchema);
  if (!parsed.success) return parsed.response;

  await mutateStore((draft) => ({
    ...draft,
    consent: {
      shareVitalsWithFamily:
        parsed.data.shareVitalsWithFamily ??
        draft.consent?.shareVitalsWithFamily ??
        DEFAULT_CONSENT.shareVitalsWithFamily,
      emailFamilyOnMissedDose:
        parsed.data.emailFamilyOnMissedDose ??
        draft.consent?.emailFamilyOnMissedDose ??
        DEFAULT_CONSENT.emailFamilyOnMissedDose,
    },
  }));

  const dashboard = await getDashboardSnapshot(auth.session.role);
  return NextResponse.json({ ok: true, dashboard });
}
