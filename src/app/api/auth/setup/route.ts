import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createMemberRecord,
  generateRandomSecret,
  resolveSessionSecret,
  signSessionToken,
} from "@/domain/auth";
import { setupCircleSchema } from "@/domain/schemas";
import { formatDateKey } from "@/domain/schedule";
import type { CircleMember, TavyaStoreData } from "@/domain/types";
import {
  attachSessionCookie,
  getClientIp,
  getSessionFromRequest,
  parseJsonBody,
} from "@/lib/api-utils";
import { getEmailDeliveryMode } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildDashboardPayload,
  createBlankData,
  DEFAULT_CONSENT,
} from "@/lib/seed";
import { getPersistenceMode, readStore, resetStore, writeStore } from "@/lib/store";

export async function POST(request: Request) {
  const limit = checkRateLimit(`setup:${getClientIp(request)}`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many setup attempts. Please wait a minute." },
      { status: 429 }
    );
  }

  const parsed = await parseJsonBody(request, setupCircleSchema);
  if (!parsed.success) return parsed.response;

  const existing = await readStore();
  const hasMembers = (existing.circle?.members ?? []).length > 0;
  if (hasMembers) {
    const activeSession = getSessionFromRequest(request, existing);
    if (!activeSession || activeSession.role !== "caretaker") {
      return NextResponse.json(
        { error: "Care circle is already configured. Please sign in with your passcode." },
        { status: 409 }
      );
    }
  }

  const payload = parsed.data;
  if ("demo" in payload && payload.demo === true) {
    await resetStore();
    return NextResponse.json({
      configured: true,
      isDemo: true,
      session: null,
      dashboard: null,
    });
  }

  if (payload.seniorPasscode && payload.seniorPasscode === payload.passcode) {
    return NextResponse.json(
      { error: "Senior and caretaker passcodes must be unique." },
      { status: 400 }
    );
  }

  const nowIso = new Date().toISOString();
  const caretaker = createMemberRecord({
    id: `member-${randomUUID().slice(0, 8)}`,
    name: payload.caretakerName,
    role: "caretaker",
    email: payload.caretakerEmail,
    passcode: payload.passcode,
    createdAt: nowIso,
  });

  const members: CircleMember[] = [caretaker];
  if (payload.seniorPasscode) {
    members.push(
      createMemberRecord({
        id: `member-${randomUUID().slice(0, 8)}`,
        name: payload.seniorName,
        role: "senior",
        passcode: payload.seniorPasscode,
        createdAt: nowIso,
      })
    );
  }

  const blank = createBlankData();
  const nextStore: TavyaStoreData = {
    ...blank,
    profile: {
      name: payload.seniorName,
      age: payload.seniorAge,
      caregiverName: payload.emergencyContactName || payload.caretakerName,
      caregiverPhone: payload.emergencyContactPhone,
      caregiverRelation: "Caregiver",
      doctorName: "Attending Physician",
      doctorPhone: "",
      allergies: payload.allergies ?? [],
      conditions: [],
    },
    consent: { ...DEFAULT_CONSENT },
    circle: {
      members,
      isDemo: false,
      sessionSecret: generateRandomSecret(),
    },
  };

  await writeStore(nextStore);

  const session = {
    memberId: caretaker.id,
    name: caretaker.name,
    role: caretaker.role,
  };
  const token = signSessionToken(session, resolveSessionSecret(nextStore.circle));
  const dashboard = buildDashboardPayload(nextStore, {
    todayKey: formatDateKey(),
    viewerRole: session.role,
    persistence: getPersistenceMode(),
    emailDelivery: getEmailDeliveryMode(),
  });

  const response = NextResponse.json(
    { configured: true, isDemo: false, session, dashboard },
    { status: 201 }
  );
  return attachSessionCookie(response, token);
}
