import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createCareNoteSchema } from "@/domain/schemas";
import { formatDateKey } from "@/domain/schedule";
import type { CareNote } from "@/domain/types";
import { parseJsonBody } from "@/lib/api-utils";
import { buildDashboardPayload } from "@/lib/seed";
import { mutateStore } from "@/lib/store";

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, createCareNoteSchema);
  if (!parsed.success) return parsed.response;

  const entry: CareNote = {
    id: `note-${randomUUID().slice(0, 8)}`,
    category: parsed.data.category,
    text: parsed.data.text,
    scheduledDate: parsed.data.scheduledDate,
    createdAt: new Date().toISOString(),
  };

  const nextStore = mutateStore((draft) => ({
    ...draft,
    careNotes: [entry, ...(draft.careNotes ?? [])].slice(0, 40),
  }));

  return NextResponse.json(
    buildDashboardPayload(nextStore, formatDateKey()),
    { status: 201 }
  );
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const noteId = searchParams.get("id")?.trim();
  if (!noteId) {
    return NextResponse.json({ error: "Missing note id" }, { status: 400 });
  }

  const nextStore = mutateStore((draft) => ({
    ...draft,
    careNotes: (draft.careNotes ?? []).filter((n) => n.id !== noteId),
  }));

  return NextResponse.json(buildDashboardPayload(nextStore, formatDateKey()));
}
