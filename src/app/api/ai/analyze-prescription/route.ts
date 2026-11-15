import { NextResponse } from "next/server";
import { z } from "zod";
import { detectInteractions } from "@/domain/interactions";
import {
  CLINICAL_DISCLAIMER,
  parsePrescriptionText,
} from "@/domain/prescription-parser";
import {
  analyzePrescriptionSchema,
  doseSlotSchema,
  mealTimingSchema,
} from "@/domain/schemas";
import type { PrescriptionAnalysisResult } from "@/domain/types";
import { parseJsonBody } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";

const geminiResponseSchema = z.object({
  summary: z.string().min(1).max(400),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        dosage: z.string().min(1).max(40),
        slots: z.array(doseSlotSchema).min(1).max(4),
        mealTiming: mealTimingSchema,
        plainInstruction: z.string().min(1).max(200),
        purpose: z.string().min(1).max(80),
      })
    )
    .max(15),
});

async function tryGeminiAnalysis(
  text: string,
  apiKey: string,
  imageBase64?: string,
  imageMimeType?: "image/jpeg" | "image/png" | "image/webp"
): Promise<PrescriptionAnalysisResult | null> {
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const prompt = [
      "Extract medications from the following prescription text or prescription image for an elderly care app.",
      "Return strict JSON matching { summary: string, items: [{ name, dosage, slots, mealTiming, plainInstruction, purpose }] }.",
      "Allowed slots: morning, afternoon, evening, night.",
      "Allowed mealTiming: before_food, after_food, with_water, anytime.",
      "Write plainInstruction in warm, clear, senior-friendly plain English.",
      text ? `\nNotes:\n${text}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [{ text: prompt }];

    if (imageBase64 && imageMimeType) {
      parts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      });
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = geminiResponseSchema.safeParse(JSON.parse(rawText));
    if (!parsed.success) return null;

    const interactions = detectInteractions(parsed.data.items.map((i) => i.name));
    return {
      source: "gemini",
      items: parsed.data.items,
      interactions,
      summary: parsed.data.summary,
      disclaimer: CLINICAL_DISCLAIMER,
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const rate = checkRateLimit(`ai:${clientIp}`, 20, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many analysis requests. Please wait a minute." },
      { status: 429 }
    );
  }

  const parsed = await parseJsonBody(request, analyzePrescriptionSchema);
  if (!parsed.success) return parsed.response;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const hasImage = Boolean(parsed.data.imageBase64 && parsed.data.imageMimeType);

  if (apiKey) {
    const geminiResult = await tryGeminiAnalysis(
      parsed.data.text,
      apiKey,
      parsed.data.imageBase64,
      parsed.data.imageMimeType
    );
    if (geminiResult) {
      return NextResponse.json(geminiResult);
    }
  }

  if (hasImage && parsed.data.text.trim().length < 5) {
    return NextResponse.json(
      {
        error:
          "Photo OCR requires GEMINI_API_KEY in Vercel/env settings. You can still type or paste prescription notes above for instant clinical parsing.",
      },
      { status: 400 }
    );
  }

  const fallback = parsePrescriptionText(parsed.data.text);
  return NextResponse.json(fallback);
}
