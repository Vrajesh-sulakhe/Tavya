import { NextResponse } from "next/server";
import {
  authenticateMember,
  resolveSessionSecret,
  signSessionToken,
} from "@/domain/auth";
import { loginPasscodeSchema } from "@/domain/schemas";
import { formatDateKey } from "@/domain/schedule";
import {
  attachSessionCookie,
  getClientIp,
  parseJsonBody,
} from "@/lib/api-utils";
import { getEmailDeliveryMode } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildDashboardPayload } from "@/lib/seed";
import { getPersistenceMode, readStore } from "@/lib/store";

export async function POST(request: Request) {
  const limit = checkRateLimit(`login:${getClientIp(request)}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many passcode attempts. Please wait one minute and try again." },
      { status: 429 }
    );
  }

  const parsed = await parseJsonBody(request, loginPasscodeSchema);
  if (!parsed.success) return parsed.response;

  const store = await readStore();
  const members = store.circle?.members ?? [];
  if (members.length === 0) {
    return NextResponse.json(
      { error: "Care circle is not set up yet." },
      { status: 409 }
    );
  }

  const member = authenticateMember(members, parsed.data.passcode);
  if (!member) {
    return NextResponse.json(
      { error: "Incorrect passcode. Please check your digits and try again." },
      { status: 401 }
    );
  }

  const session = {
    memberId: member.id,
    name: member.name,
    role: member.role,
  };
  const secret = resolveSessionSecret(store.circle);
  const token = signSessionToken(session, secret);

  const dashboard = buildDashboardPayload(store, {
    todayKey: formatDateKey(),
    viewerRole: session.role,
    persistence: getPersistenceMode(),
    emailDelivery: getEmailDeliveryMode(),
  });

  const response = NextResponse.json({ session, dashboard });
  return attachSessionCookie(response, token);
}
