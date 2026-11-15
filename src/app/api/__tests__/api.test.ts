import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as analyzePrescription } from "../ai/analyze-prescription/route";
import {
  GET as getDashboard,
  POST as postDashboard,
  PUT as putDashboard,
} from "../dashboard/route";
import { POST as logDose } from "../doses/route";
import { GET as getHealth } from "../health/route";
import { POST as createMedication } from "../medications/route";
import { PATCH as updateMedication } from "../medications/[id]/route";
import { DELETE as deleteNote, POST as createNote } from "../notes/route";
import { PATCH as updateProfile } from "../profile/route";
import { POST as triggerSos } from "../sos/route";
import { POST as logVitals } from "../vitals/route";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "tavya-api-test-"));
  process.env.TAVYA_DATA_DIR = tmpDir;
  delete process.env.GEMINI_API_KEY;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.TAVYA_DATA_DIR;
});

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("Tavya API routes", () => {
  it("GET /api/health returns 200 ok", async () => {
    const res = await getHealth();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
  });

  it("GET /api/dashboard returns clean blank state by default and POST reset loads sample", async () => {
    const res = await getDashboard();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.profile.name).toBeTruthy();
    expect(data.medications).toHaveLength(0);
    expect(typeof data.adherence.todayPercent).toBe("number");

    const sampleRes = await postDashboard(
      jsonRequest("http://localhost/api/dashboard", "POST", { action: "reset" })
    );
    expect(sampleRes.status).toBe(200);
    const sample = await sampleRes.json();
    expect(sample.medications.length).toBeGreaterThanOrEqual(4);
  });

  it("POST /api/medications validates payload and creates medication", async () => {
    const badRes = await createMedication(
      jsonRequest("http://localhost/api/medications", "POST", {
        name: "A",
        slots: [],
      })
    );
    expect(badRes.status).toBe(400);

    const goodRes = await createMedication(
      jsonRequest("http://localhost/api/medications", "POST", {
        name: "Vitamin D3",
        dosage: "60,000 IU",
        instructions: "1 amber capsule once a week after lunch",
        purpose: "Bone Strength",
        slots: ["afternoon"],
        mealTiming: "after_food",
        appearance: "amber_capsule",
        pillsRemaining: 8,
        refillThresholdDays: 5,
      })
    );
    expect(goodRes.status).toBe(201);
    const created = await goodRes.json();
    expect(created.medication.name).toBe("Vitamin D3");
  });

  it("POST /api/doses marks pending dose taken, decrements pillsRemaining once, and is idempotent", async () => {
    const dashBefore = await (
      await postDashboard(
        jsonRequest("http://localhost/api/dashboard", "POST", { action: "reset" })
      )
    ).json();
    const targetMed = dashBefore.medications[1]; // Metformin (pending)

    const res = await logDose(
      jsonRequest("http://localhost/api/doses", "POST", {
        medicationId: targetMed.id,
        slot: targetMed.slots[0],
        status: "taken",
      })
    );
    expect(res.status).toBe(200);
    const updated = await res.json();
    const updatedMed = updated.medications.find(
      (m: { id: string }) => m.id === targetMed.id
    );
    expect(updatedMed.pillsRemaining).toBe(targetMed.pillsRemaining - 1);

    // Calling taken again should not double-decrement
    const resAgain = await logDose(
      jsonRequest("http://localhost/api/doses", "POST", {
        medicationId: targetMed.id,
        slot: targetMed.slots[0],
        status: "taken",
      })
    );
    const updatedAgain = await resAgain.json();
    const updatedMedAgain = updatedAgain.medications.find(
      (m: { id: string }) => m.id === targetMed.id
    );
    expect(updatedMedAgain.pillsRemaining).toBe(targetMed.pillsRemaining - 1);
  });

  it("POST /api/vitals creates a high-priority alert when dizzy is reported", async () => {
    const res = await logVitals(
      jsonRequest("http://localhost/api/vitals", "POST", {
        mood: "dizzy",
        systolic: 152,
        diastolic: 94,
        note: "Felt lightheaded standing up",
      })
    );
    expect(res.status).toBe(201);
    const payload = await res.json();
    expect(
      payload.alerts.some(
        (a: { category: string; severity: string }) =>
          a.category === "wellness" && a.severity === "critical"
      )
    ).toBe(true);
  });

  it("POST /api/ai/analyze-prescription validates bounds and falls back cleanly", async () => {
    const tooShort = await analyzePrescription(
      jsonRequest("http://localhost/api/ai/analyze-prescription", "POST", {
        text: "hi",
      })
    );
    expect(tooShort.status).toBe(400);

    const tooLong = await analyzePrescription(
      jsonRequest("http://localhost/api/ai/analyze-prescription", "POST", {
        text: "x".repeat(2005),
      })
    );
    expect(tooLong.status).toBe(400);

    const valid = await analyzePrescription(
      jsonRequest("http://localhost/api/ai/analyze-prescription", "POST", {
        text: "Tab Aspirin 75mg OD after breakfast\nTab Ibuprofen 400mg BD after food",
      })
    );
    expect(valid.status).toBe(200);
    const analysis = await valid.json();
    expect(analysis.source).toBe("clinical-rules");
    expect(analysis.items).toHaveLength(2);
    expect(analysis.interactions.length).toBeGreaterThanOrEqual(1);
    expect(analysis.disclaimer).toBeTruthy();
  });

  it("POST /api/dashboard reset restores initial demo state", async () => {
    const res = await postDashboard(
      jsonRequest("http://localhost/api/dashboard", "POST", { action: "reset" })
    );
    expect(res.status).toBe(200);
  });

  it("PATCH /api/profile updates senior, caregiver, and medical profile dynamically", async () => {
    const res = await updateProfile(
      jsonRequest("http://localhost/api/profile", "PATCH", {
        name: "Ramesh Kulkarni",
        age: 76,
        caregiverName: "Vrajesh",
        caregiverPhone: "+91 98000 11111",
        caregiverRelation: "Son",
        doctorName: "Dr. Sneha Rao",
        doctorPhone: "+91 98000 22222",
        allergies: ["Sulfa drugs"],
        conditions: ["Hypertension"],
      })
    );
    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.profile.name).toBe("Ramesh Kulkarni");
    expect(updated.profile.caregiverRelation).toBe("Son");
  });

  it("PATCH /api/medications/[id] updates dosage and pillsRemaining", async () => {
    const dashBefore = await (
      await postDashboard(
        jsonRequest("http://localhost/api/dashboard", "POST", { action: "reset" })
      )
    ).json();
    const targetMed = dashBefore.medications[0];
    const res = await updateMedication(
      jsonRequest(`http://localhost/api/medications/${targetMed.id}`, "PATCH", {
        dosage: "10 mg",
        pillsRemaining: 30,
      }),
      { params: Promise.resolve({ id: targetMed.id }) }
    );
    expect(res.status).toBe(200);
    const updated = await res.json();
    const edited = updated.medications.find(
      (m: { id: string }) => m.id === targetMed.id
    );
    expect(edited.dosage).toBe("10 mg");
    expect(edited.pillsRemaining).toBe(30);
  });

  it("POST /api/dashboard clear empties schedule and PUT /api/dashboard restores custom state", async () => {
    const clearedRes = await postDashboard(
      jsonRequest("http://localhost/api/dashboard", "POST", { action: "clear" })
    );
    expect(clearedRes.status).toBe(200);
    const cleared = await clearedRes.json();
    expect(cleared.medications).toHaveLength(0);

    const restoredRes = await putDashboard(
      jsonRequest("http://localhost/api/dashboard", "PUT", {
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
      })
    );
    expect(restoredRes.status).toBe(200);
    const restored = await restoredRes.json();
    expect(restored.medications).toHaveLength(1);
    expect(restored.medications[0].name).toBe("Custom Vitamin B12");
  });

  it("POST/DELETE /api/notes manages caregiver notes and doctor visits", async () => {
    const createRes = await createNote(
      jsonRequest("http://localhost/api/notes", "POST", {
        category: "appointment",
        text: "Cardiology follow-up with Dr. Rao",
        scheduledDate: "2026-11-20",
      })
    );
    expect(createRes.status).toBe(201);
    const createdData = await createRes.json();
    expect(createdData.careNotes).toHaveLength(1);
    expect(createdData.careNotes[0].category).toBe("appointment");

    const noteId = createdData.careNotes[0].id as string;
    const deleteRes = await deleteNote(
      new NextRequest(`http://localhost/api/notes?id=${encodeURIComponent(noteId)}`, {
        method: "DELETE",
      })
    );
    expect(deleteRes.status).toBe(200);
    const afterDelete = await deleteRes.json();
    expect(afterDelete.careNotes).toHaveLength(0);
  });

  it("POST /api/sos creates a critical SOS caregiver alert", async () => {
    const res = await triggerSos(
      jsonRequest("http://localhost/api/sos", "POST", {
        channel: "whatsapp",
        note: "Requested help from Senior view",
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.alerts[0]?.category).toBe("sos");
    expect(data.alerts[0]?.severity).toBe("critical");
  });

  it("POST /api/ai/analyze-prescription returns 400 for image-only without GEMINI_API_KEY", async () => {
    const res = await analyzePrescription(
      jsonRequest("http://localhost/api/ai/analyze-prescription", "POST", {
        imageBase64: "dGVzdA==",
        imageMimeType: "image/png",
      })
    );
    expect(res.status).toBe(400);
    const payload = await res.json();
    expect(payload.error).toMatch(/gemini/i);
  });
});
