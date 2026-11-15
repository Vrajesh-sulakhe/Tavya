import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as analyzePrescription } from "../ai/analyze-prescription/route";
import {
  DELETE as deleteAppointment,
  PATCH as updateAppointment,
} from "../appointments/[id]/route";
import { POST as createAppointment } from "../appointments/route";
import { POST as loginPasscode } from "../auth/login/route";
import { POST as logoutSession } from "../auth/logout/route";
import { GET as getSession } from "../auth/session/route";
import { POST as setupCircle } from "../auth/setup/route";
import {
  DELETE as removeMember,
  POST as addMember,
} from "../circle/members/route";
import { PATCH as updateConsent } from "../consent/route";
import {
  GET as getDashboard,
  POST as postDashboard,
  PUT as putDashboard,
} from "../dashboard/route";
import { POST as logDose } from "../doses/route";
import { GET as getHealth } from "../health/route";
import { PATCH as updateMedication } from "../medications/[id]/route";
import { POST as createMedication } from "../medications/route";
import { DELETE as deleteNote, POST as createNote } from "../notes/route";
import { PATCH as updateProfile } from "../profile/route";
import { POST as runReminders } from "../reminders/run/route";
import { POST as triggerSos } from "../sos/route";
import { POST as logVitals } from "../vitals/route";

let tmpDir: string;
let ipCounter = 1;

function nextTestIp(): string {
  ipCounter += 1;
  return `198.51.100.${(ipCounter % 200) + 1}`;
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tavya-api-test-"));
  process.env.TAVYA_DATA_DIR = tmpDir;
  delete process.env.GEMINI_API_KEY;
  delete process.env.RESEND_API_KEY;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.CRON_SECRET;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.TAVYA_DATA_DIR;
  delete process.env.CRON_SECRET;
});

function jsonRequest(
  url: string,
  method: string,
  body?: unknown,
  cookie?: string,
  ip: string = nextTestIp()
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-forwarded-for": ip,
  };
  if (cookie) {
    headers.cookie = cookie;
  }
  return new NextRequest(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function extractSessionCookie(response: Response): string {
  const raw = response.headers.get("set-cookie") ?? "";
  const match = raw.match(/tavya_session=([^;]+)/);
  return match ? `tavya_session=${match[1]}` : "";
}

async function seedDemoAndLogin(passcode: string): Promise<string> {
  await setupCircle(
    jsonRequest("http://localhost/api/auth/setup", "POST", { demo: true })
  );
  const loginRes = await loginPasscode(
    jsonRequest("http://localhost/api/auth/login", "POST", { passcode })
  );
  expect(loginRes.status).toBe(200);
  return extractSessionCookie(loginRes);
}

describe("Tavya API routes & auth security", () => {
  it("GET /api/health returns 200 ok with persistence & email modes", async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.persistence).toBe("ephemeral");
    expect(data.emailDelivery).toBe("preview");
  });

  it("blocks unauthenticated requests with 401 and keeps /api/auth/session secret-free", async () => {
    const unauthDash = await getDashboard(
      jsonRequest("http://localhost/api/dashboard", "GET")
    );
    expect(unauthDash.status).toBe(401);

    const unauthMed = await createMedication(
      jsonRequest("http://localhost/api/medications", "POST", { name: "Test" })
    );
    expect(unauthMed.status).toBe(401);

    const sessRes = await getSession(
      jsonRequest("http://localhost/api/auth/session", "GET")
    );
    expect(sessRes.status).toBe(200);
    const sessJson = await sessRes.json();
    expect(sessJson).toEqual({
      configured: false,
      isDemo: false,
      session: null,
    });
  });

  it("sets up custom Care Circle, enforces RBAC (senior/family/caretaker), and logs out cleanly", async () => {
    const setupRes = await setupCircle(
      jsonRequest("http://localhost/api/auth/setup", "POST", {
        seniorName: "Ramesh Kulkarni",
        seniorAge: 75,
        allergies: ["Penicillin"],
        emergencyContactName: "Ananya",
        emergencyContactPhone: "+91 98201 11111",
        caretakerName: "Ananya",
        caretakerEmail: "ananya@example.com",
        passcode: "2468",
        seniorPasscode: "1357",
      })
    );
    expect(setupRes.status).toBe(201);
    const caretakerCookie = extractSessionCookie(setupRes);
    expect(caretakerCookie).toContain("tavya_session=");

    // Repeat unauthenticated setup is blocked
    const repeatSetup = await setupCircle(
      jsonRequest("http://localhost/api/auth/setup", "POST", { demo: true })
    );
    expect(repeatSetup.status).toBe(409);

    // Caretaker adds a family member
    const addFamilyRes = await addMember(
      jsonRequest(
        "http://localhost/api/circle/members",
        "POST",
        {
          name: "Rohan",
          role: "family",
          email: "rohan@example.com",
          passcode: "3579",
        },
        caretakerCookie
      )
    );
    expect(addFamilyRes.status).toBe(201);
    const addedBody = await addFamilyRes.json();
    // Never leaks password hashes
    expect(JSON.stringify(addedBody)).not.toContain("passcodeHash");
    expect(JSON.stringify(addedBody)).not.toContain("passcodeSalt");

    // Sign in as Family & test 403 restriction on medication mutations
    const familyLogin = await loginPasscode(
      jsonRequest("http://localhost/api/auth/login", "POST", { passcode: "3579" })
    );
    const familyCookie = extractSessionCookie(familyLogin);
    const forbiddenCreate = await createMedication(
      jsonRequest(
        "http://localhost/api/medications",
        "POST",
        {
          name: "Aspirin",
          dosage: "75 mg",
          instructions: "1 daily",
          purpose: "Heart",
          slots: ["morning"],
          mealTiming: "after_food",
          appearance: "white_round",
          pillsRemaining: 10,
          refillThresholdDays: 5,
        },
        familyCookie
      )
    );
    expect(forbiddenCreate.status).toBe(403);

    // Logout clears session cookie
    const logoutRes = await logoutSession();
    expect(logoutRes.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("POST /api/medications validates payload and creates medication for caretaker", async () => {
    const cookie = await seedDemoAndLogin("2222");

    const badRes = await createMedication(
      jsonRequest(
        "http://localhost/api/medications",
        "POST",
        { name: "A", slots: [] },
        cookie
      )
    );
    expect(badRes.status).toBe(400);

    const goodRes = await createMedication(
      jsonRequest(
        "http://localhost/api/medications",
        "POST",
        {
          name: "Vitamin D3",
          dosage: "60,000 IU",
          instructions: "1 amber capsule once a week after lunch",
          purpose: "Bone Strength",
          slots: ["afternoon"],
          mealTiming: "after_food",
          appearance: "amber_capsule",
          pillsRemaining: 8,
          refillThresholdDays: 5,
        },
        cookie
      )
    );
    expect(goodRes.status).toBe(201);
    const created = await goodRes.json();
    expect(created.medication.name).toBe("Vitamin D3");
  });

  it("POST /api/doses marks pending dose taken, decrements pillsRemaining once, and is idempotent", async () => {
    const cookie = await seedDemoAndLogin("1111"); // senior can confirm doses
    const dashRes = await getDashboard(
      jsonRequest("http://localhost/api/dashboard", "GET", undefined, cookie)
    );
    const dashBefore = await dashRes.json();
    const targetMed = dashBefore.medications[1]; // Metformin (pending)

    const res = await logDose(
      jsonRequest(
        "http://localhost/api/doses",
        "POST",
        {
          medicationId: targetMed.id,
          slot: targetMed.slots[0],
          status: "taken",
        },
        cookie
      )
    );
    expect(res.status).toBe(200);
    const updated = await res.json();
    const updatedMed = updated.medications.find(
      (m: { id: string }) => m.id === targetMed.id
    );
    expect(updatedMed.pillsRemaining).toBe(targetMed.pillsRemaining - 1);

    // Calling taken again should not double-decrement
    const resAgain = await logDose(
      jsonRequest(
        "http://localhost/api/doses",
        "POST",
        {
          medicationId: targetMed.id,
          slot: targetMed.slots[0],
          status: "taken",
        },
        cookie
      )
    );
    const updatedAgain = await resAgain.json();
    const updatedMedAgain = updatedAgain.medications.find(
      (m: { id: string }) => m.id === targetMed.id
    );
    expect(updatedMedAgain.pillsRemaining).toBe(targetMed.pillsRemaining - 1);
  });

  it("POST /api/vitals creates critical alert and enforces Senior consent redaction for Family", async () => {
    const seniorCookie = await seedDemoAndLogin("1111");
    const familyLogin = await loginPasscode(
      jsonRequest("http://localhost/api/auth/login", "POST", { passcode: "3333" })
    );
    const familyCookie = extractSessionCookie(familyLogin);

    const vitalRes = await logVitals(
      jsonRequest(
        "http://localhost/api/vitals",
        "POST",
        {
          mood: "dizzy",
          systolic: 152,
          diastolic: 94,
          note: "Felt lightheaded standing up",
        },
        seniorCookie
      )
    );
    expect(vitalRes.status).toBe(201);
    const vitalPayload = await vitalRes.json();
    expect(
      vitalPayload.alerts.some(
        (a: { category: string; severity: string }) =>
          a.category === "wellness" && a.severity === "critical"
      )
    ).toBe(true);

    // Senior turns off vitals sharing with family
    const consentRes = await updateConsent(
      jsonRequest(
        "http://localhost/api/consent",
        "PATCH",
        { shareVitalsWithFamily: false },
        seniorCookie
      )
    );
    expect(consentRes.status).toBe(200);

    // Family cannot change consent (403)
    const familyConsentAttempt = await updateConsent(
      jsonRequest(
        "http://localhost/api/consent",
        "PATCH",
        { shareVitalsWithFamily: true },
        familyCookie
      )
    );
    expect(familyConsentAttempt.status).toBe(403);

    // Family GET /api/dashboard sees redacted vitalsLogs
    const familyDash = await (
      await getDashboard(
        jsonRequest(
          "http://localhost/api/dashboard",
          "GET",
          undefined,
          familyCookie
        )
      )
    ).json();
    expect(familyDash.vitalsLogs).toHaveLength(0);
  });

  it("manages structured Appointments CRUD and triggers deduped email reminders via /api/reminders/run", async () => {
    const caretakerCookie = await seedDemoAndLogin("2222");
    const soonIso = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const createRes = await createAppointment(
      jsonRequest(
        "http://localhost/api/appointments",
        "POST",
        {
          title: "Geriatric Eye Check",
          doctor: "Dr. Kapoor",
          location: "Ruby Hall Clinic",
          startsAt: soonIso,
          notes: "Dilated eye exam",
        },
        caretakerCookie
      )
    );
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    const apptId = created.appointment.id as string;

    const patchRes = await updateAppointment(
      jsonRequest(
        `http://localhost/api/appointments/${apptId}`,
        "PATCH",
        { location: "Ruby Hall Wing B" },
        caretakerCookie
      ),
      { params: Promise.resolve({ id: apptId }) }
    );
    expect(patchRes.status).toBe(200);
    const patched = await patchRes.json();
    expect(
      patched.dashboard.appointments.find((a: { id: string }) => a.id === apptId)
        ?.location
    ).toBe("Ruby Hall Wing B");

    // Run reminder sweep via CRON_SECRET bearer token
    process.env.CRON_SECRET = "test-cron-secret-value";
    const firstSweep = await runReminders(
      new NextRequest("http://localhost/api/reminders/run", {
        method: "POST",
        headers: { authorization: "Bearer test-cron-secret-value" },
      })
    );
    expect(firstSweep.status).toBe(200);
    const sweep1 = await firstSweep.json();
    expect(sweep1.processedCount).toBeGreaterThanOrEqual(1);
    expect(
      sweep1.entries.some(
        (e: { dedupeKey: string; status: string }) =>
          e.dedupeKey === `appointment:${apptId}` && e.status === "preview"
      )
    ).toBe(true);

    // Immediate second run produces 0 duplicate emails
    const secondSweep = await runReminders(
      jsonRequest("http://localhost/api/reminders/run", "POST", undefined, caretakerCookie)
    );
    const sweep2 = await secondSweep.json();
    expect(sweep2.processedCount).toBe(0);

    const deleteRes = await deleteAppointment(
      jsonRequest(
        `http://localhost/api/appointments/${apptId}`,
        "DELETE",
        undefined,
        caretakerCookie
      ),
      { params: Promise.resolve({ id: apptId }) }
    );
    expect(deleteRes.status).toBe(200);
  });

  it("revokes deleted member cookie immediately and prevents deleting last caretaker", async () => {
    const caretakerCookie = await seedDemoAndLogin("2222");
    const familyLogin = await loginPasscode(
      jsonRequest("http://localhost/api/auth/login", "POST", { passcode: "3333" })
    );
    const familyCookie = extractSessionCookie(familyLogin);
    const { session: familySess } = await (
      await getSession(
        jsonRequest("http://localhost/api/auth/session", "GET", undefined, familyCookie)
      )
    ).json();

    const delRes = await removeMember(
      jsonRequest(
        "http://localhost/api/circle/members",
        "DELETE",
        { id: familySess.memberId },
        caretakerCookie
      )
    );
    expect(delRes.status).toBe(200);

    // Deleted member cookie is no longer valid
    const revokedDash = await getDashboard(
      jsonRequest("http://localhost/api/dashboard", "GET", undefined, familyCookie)
    );
    expect(revokedDash.status).toBe(401);

    // Cannot delete self / last caretaker
    const selfDel = await removeMember(
      jsonRequest(
        "http://localhost/api/circle/members",
        "DELETE",
        { id: "member-caretaker-1" },
        caretakerCookie
      )
    );
    expect(selfDel.status).toBe(400);
  });

  it("POST /api/ai/analyze-prescription validates bounds and falls back cleanly", async () => {
    const cookie = await seedDemoAndLogin("2222");

    const tooShort = await analyzePrescription(
      jsonRequest(
        "http://localhost/api/ai/analyze-prescription",
        "POST",
        { text: "hi" },
        cookie
      )
    );
    expect(tooShort.status).toBe(400);

    const tooLong = await analyzePrescription(
      jsonRequest(
        "http://localhost/api/ai/analyze-prescription",
        "POST",
        { text: "x".repeat(2005) },
        cookie
      )
    );
    expect(tooLong.status).toBe(400);

    const valid = await analyzePrescription(
      jsonRequest(
        "http://localhost/api/ai/analyze-prescription",
        "POST",
        {
          text: "Tab Aspirin 75mg OD after breakfast\nTab Ibuprofen 400mg BD after food",
        },
        cookie
      )
    );
    expect(valid.status).toBe(200);
    const analysis = await valid.json();
    expect(analysis.source).toBe("clinical-rules");
    expect(analysis.items).toHaveLength(2);
    expect(analysis.interactions.length).toBeGreaterThanOrEqual(1);
    expect(analysis.disclaimer).toBeTruthy();

    const mismatchRes = await analyzePrescription(
      jsonRequest(
        "http://localhost/api/ai/analyze-prescription",
        "POST",
        { imageBase64: "dGVzdA==" },
        cookie
      )
    );
    expect(mismatchRes.status).toBe(400);

    const imgNoKey = await analyzePrescription(
      jsonRequest(
        "http://localhost/api/ai/analyze-prescription",
        "POST",
        { imageBase64: "dGVzdA==", imageMimeType: "image/png" },
        cookie
      )
    );
    expect(imgNoKey.status).toBe(400);
    const imgPayload = await imgNoKey.json();
    expect(imgPayload.error).toMatch(/gemini/i);
  });

  it("PATCH /api/profile, PATCH /api/medications/[id], clear/restore, notes, and SOS work end-to-end", async () => {
    const cookie = await seedDemoAndLogin("2222");

    const profileRes = await updateProfile(
      jsonRequest(
        "http://localhost/api/profile",
        "PATCH",
        {
          name: "Ramesh Kulkarni",
          age: 76,
          caregiverName: "Vrajesh",
          caregiverPhone: "+91 98000 11111",
          caregiverRelation: "Son",
          doctorName: "Dr. Sneha Rao",
          doctorPhone: "+91 98000 22222",
          allergies: ["Sulfa drugs"],
          conditions: ["Hypertension"],
        },
        cookie
      )
    );
    expect(profileRes.status).toBe(200);
    const profJson = await profileRes.json();
    expect(profJson.profile.name).toBe("Ramesh Kulkarni");

    const targetMed = profJson.medications[0];
    const editMedRes = await updateMedication(
      jsonRequest(
        `http://localhost/api/medications/${targetMed.id}`,
        "PATCH",
        { dosage: "10 mg", pillsRemaining: 30 },
        cookie
      ),
      { params: Promise.resolve({ id: targetMed.id }) }
    );
    expect(editMedRes.status).toBe(200);

    const clearedRes = await postDashboard(
      jsonRequest("http://localhost/api/dashboard", "POST", { action: "clear" }, cookie)
    );
    const cleared = await clearedRes.json();
    expect(cleared.medications).toHaveLength(0);

    const restoredRes = await putDashboard(
      jsonRequest(
        "http://localhost/api/dashboard",
        "PUT",
        {
          profile: cleared.profile,
          medications: [
            {
              id: "med-custom-1",
              name: "Custom Vitamin B12",
              dosage: "1500 mcg",
              instructions: "1 tablet after breakfast",
              purpose: "Nerve Support",
              slots: ["morning"],
              mealTiming: "after_food",
              appearance: "rose_coated",
              pillsRemaining: 20,
              refillThresholdDays: 5,
              active: true,
            },
          ],
          doseLogs: [],
          vitalsLogs: [],
          alerts: [],
        },
        cookie
      )
    );
    expect(restoredRes.status).toBe(200);
    const restored = await restoredRes.json();
    expect(restored.medications).toHaveLength(1);

    const createNoteRes = await createNote(
      jsonRequest(
        "http://localhost/api/notes",
        "POST",
        {
          category: "appointment",
          text: "Cardiology follow-up with Dr. Rao",
          scheduledDate: "2026-11-20",
        },
        cookie
      )
    );
    expect(createNoteRes.status).toBe(201);
    const noteData = await createNoteRes.json();
    const noteId = noteData.careNotes[0].id as string;

    const deleteNoteRes = await deleteNote(
      jsonRequest(
        `http://localhost/api/notes?id=${encodeURIComponent(noteId)}`,
        "DELETE",
        undefined,
        cookie
      )
    );
    expect(deleteNoteRes.status).toBe(200);

    const sosRes = await triggerSos(
      jsonRequest(
        "http://localhost/api/sos",
        "POST",
        { channel: "whatsapp", note: "Requested help from Senior view" },
        cookie
      )
    );
    expect(sosRes.status).toBe(201);
    const sosData = await sosRes.json();
    expect(sosData.alerts[0]?.category).toBe("sos");
  });
});
