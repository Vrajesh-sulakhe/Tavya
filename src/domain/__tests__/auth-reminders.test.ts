import { describe, expect, it } from "vitest";
import {
  authenticateMember,
  createMemberRecord,
  generateRandomSecret,
  hashPasscode,
  signSessionToken,
  verifyPasscode,
  verifySessionToken,
} from "../auth";
import { computeDueReminders } from "../reminders";
import { buildDashboardPayload, createSeedData } from "@/lib/seed";

describe("auth & passcode cryptography", () => {
  it("hashes passcodes with unique per-member salts and verifies constant-time", () => {
    const first = hashPasscode("2468");
    const second = hashPasscode("2468");

    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
    expect(verifyPasscode("2468", first.hash, first.salt)).toBe(true);
    expect(verifyPasscode("2469", first.hash, first.salt)).toBe(false);
    expect(verifyPasscode("", first.hash, first.salt)).toBe(false);
  });

  it("matches only the member whose passcode matches", () => {
    const members = [
      createMemberRecord({ name: "Lakshmi", role: "senior", passcode: "1111" }),
      createMemberRecord({ name: "Ananya", role: "caretaker", passcode: "2222" }),
    ];

    expect(authenticateMember(members, "1111")?.role).toBe("senior");
    expect(authenticateMember(members, "2222")?.role).toBe("caretaker");
    expect(authenticateMember(members, "9999")).toBeNull();
  });

  it("signs HMAC-SHA256 tokens and rejects tampered, expired, or wrong-secret tokens", () => {
    const secret = generateRandomSecret();
    const now = 1_760_000_000_000;
    const token = signSessionToken(
      { memberId: "m-1", name: "Ananya", role: "caretaker" },
      secret,
      now,
      60_000
    );

    const verified = verifySessionToken(token, secret, now + 10_000);
    expect(verified).toEqual({
      memberId: "m-1",
      name: "Ananya",
      role: "caretaker",
    });

    // Tampered payload
    const [, sig] = token.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        memberId: "m-1",
        name: "Ananya",
        role: "family",
        exp: now + 60_000,
      }),
      "utf8"
    ).toString("base64url");
    expect(verifySessionToken(`${tamperedPayload}.${sig}`, secret, now)).toBeNull();

    // Expired
    expect(verifySessionToken(token, secret, now + 120_000)).toBeNull();

    // Wrong secret
    expect(verifySessionToken(token, generateRandomSecret(), now)).toBeNull();
  });
});

describe("proactive reminder evaluation & consent redaction", () => {
  it("computes deduplicated upcoming dose, missed dose, and 24h appointment reminders", () => {
    const store = createSeedData("2026-11-15");
    // Ensure clean pending afternoon/morning evaluation at 12:30 UTC (morning passed, afternoon active)
    const now = new Date("2026-11-15T12:30:00.000Z");

    const due = computeDueReminders(store, now);
    expect(due.some((r) => r.kind === "upcoming_dose" && r.dedupeKey === "upcoming_dose:2026-11-15:afternoon")).toBe(true);
    expect(due.some((r) => r.kind === "missed_dose" && r.dedupeKey === "missed_dose:2026-11-15:morning")).toBe(true);
    expect(due.some((r) => r.kind === "appointment" && r.dedupeKey === "appointment:appt-seed-1")).toBe(true);
    // appt-seed-2 is 4 days away so it should not fire yet
    expect(due.some((r) => r.dedupeKey === "appointment:appt-seed-2")).toBe(false);

    // Already-logged dedupe keys are skipped
    const logged = {
      ...store,
      emailLog: due.map((item, idx) => ({
        id: `mail-${idx}`,
        dedupeKey: item.dedupeKey,
        kind: item.kind,
        subject: item.subject,
        recipients: item.recipients,
        status: "preview" as const,
        createdAt: now.toISOString(),
      })),
    };
    expect(computeDueReminders(logged, now)).toHaveLength(0);
  });

  it("respects senior consent for missed-dose family emails and vitals redaction", () => {
    const store = createSeedData("2026-11-15");
    store.consent = {
      shareVitalsWithFamily: false,
      emailFamilyOnMissedDose: false,
    };

    const due = computeDueReminders(store, new Date("2026-11-15T12:30:00.000Z"));
    const missed = due.find((r) => r.kind === "missed_dose");
    expect(missed).toBeDefined();
    expect(missed?.recipients).toContain("ananya@tavya-care.demo");
    expect(missed?.recipients).not.toContain("rohan@tavya-care.demo");

    const familyView = buildDashboardPayload(store, {
      todayKey: "2026-11-15",
      viewerRole: "family",
    });
    expect(familyView.vitalsLogs).toHaveLength(0);
    expect("circle" in familyView).toBe(false);

    const seniorView = buildDashboardPayload(store, {
      todayKey: "2026-11-15",
      viewerRole: "senior",
    });
    expect(seniorView.vitalsLogs.length).toBeGreaterThanOrEqual(1);
    expect("circle" in seniorView).toBe(false);
  });
});
