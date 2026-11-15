"use client";

import { useState, type FormEvent } from "react";
import { CalendarCheck, NotePencil, Plus, Trash } from "@phosphor-icons/react";
import type { CareNote, CareNoteCategory } from "@/domain/types";
import { BezelCard } from "../ui/BezelCard";
import { Reveal } from "../ui/Reveal";

interface ShiftNotesSectionProps {
  careNotes: CareNote[];
  onCreateNote: (payload: {
    category: CareNoteCategory;
    text: string;
    scheduledDate?: string;
  }) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
}

export function ShiftNotesSection({
  careNotes,
  onCreateNote,
  onDeleteNote,
}: ShiftNotesSectionProps) {
  const [noteCategory, setNoteCategory] = useState<CareNoteCategory>("note");
  const [noteText, setNoteText] = useState("");
  const [noteDate, setNoteDate] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  async function handleNoteSubmit(e: FormEvent) {
    e.preventDefault();
    if (noteText.trim().length < 2) return;
    setSavingNote(true);
    try {
      await onCreateNote({
        category: noteCategory,
        text: noteText.trim(),
        scheduledDate:
          noteCategory === "appointment" && noteDate ? noteDate : undefined,
      });
      setNoteText("");
      setNoteDate("");
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <Reveal delayMs={150}>
      <section aria-labelledby="care-notes-heading" className="no-print">
        <BezelCard innerClassName="p-5 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2
                id="care-notes-heading"
                className="font-display text-3xl text-[#141D19]"
              >
                Caregiver Shift Notes &amp; Doctor Visits
              </h2>
              <p className="text-sm text-[#46534C]">
                Share handover notes across family caregivers or pin the next
                doctor appointment onto Senior Day.
              </p>
            </div>
            <div className="inline-flex rounded-full bg-[#F2EDE3] p-1 ring-1 ring-[#141D19]/[0.06]">
              <button
                type="button"
                onClick={() => setNoteCategory("note")}
                className={`min-h-[38px] rounded-full px-3.5 text-xs font-semibold transition-colors ${
                  noteCategory === "note"
                    ? "bg-[#141D19] text-white"
                    : "text-[#46534C]"
                }`}
              >
                Shift Note
              </button>
              <button
                type="button"
                onClick={() => setNoteCategory("appointment")}
                className={`min-h-[38px] rounded-full px-3.5 text-xs font-semibold transition-colors ${
                  noteCategory === "appointment"
                    ? "bg-[#0F6B54] text-white"
                    : "text-[#46534C]"
                }`}
              >
                Doctor Visit
              </button>
            </div>
          </div>

          <form
            onSubmit={handleNoteSubmit}
            className="mt-5 flex flex-col gap-2.5 sm:flex-row"
          >
            <input
              type="text"
              minLength={2}
              maxLength={240}
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={
                noteCategory === "appointment"
                  ? "e.g. Cardiology check-up with Dr. Mehta at 10:30 AM"
                  : "e.g. Ordered 1 strip of Amlodipine; check knee swelling tonight"
              }
              aria-label="Caregiver note or appointment details"
              className="flex-1 rounded-2xl bg-[#FDFBF7] px-4 py-3 text-sm text-[#141D19] ring-1 ring-[#141D19]/12"
            />
            {noteCategory === "appointment" ? (
              <input
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                aria-label="Appointment date"
                className="font-mono-num rounded-2xl bg-[#FDFBF7] px-4 py-3 text-sm text-[#141D19] ring-1 ring-[#141D19]/12"
              />
            ) : null}
            <button
              type="submit"
              disabled={savingNote || noteText.trim().length < 2}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#0F6B54] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0B5341] disabled:opacity-60"
            >
              <Plus size={16} weight="bold" aria-hidden="true" />
              <span>{savingNote ? "Saving…" : "Pin Entry"}</span>
            </button>
          </form>

          <div className="mt-5 space-y-2.5">
            {careNotes.length === 0 ? (
              <p className="rounded-2xl bg-[#FDFBF7] px-4 py-4 text-sm text-[#617068]">
                No caregiver notes or upcoming visits pinned yet.
              </p>
            ) : (
              careNotes.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-2xl bg-[#FDFBF7] p-3.5 ring-1 ring-[#141D19]/[0.07]"
                >
                  <div className="flex items-start gap-2.5">
                    {entry.category === "appointment" ? (
                      <CalendarCheck
                        size={18}
                        weight="light"
                        className="mt-0.5 shrink-0 text-[#0F6B54]"
                        aria-hidden="true"
                      />
                    ) : (
                      <NotePencil
                        size={18}
                        weight="light"
                        className="mt-0.5 shrink-0 text-[#46534C]"
                        aria-hidden="true"
                      />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${
                            entry.category === "appointment"
                              ? "bg-[#E6F3EE] text-[#0F6B54]"
                              : "bg-white text-[#46534C] ring-1 ring-[#141D19]/10"
                          }`}
                        >
                          {entry.category === "appointment"
                            ? "Doctor Visit"
                            : "Shift Note"}
                        </span>
                        {entry.scheduledDate ? (
                          <span className="font-mono-num text-xs font-semibold text-[#0F6B54]">
                            {entry.scheduledDate}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-[#141D19]">
                        {entry.text}
                      </p>
                    </div>
                  </div>

                  {onDeleteNote ? (
                    <button
                      type="button"
                      onClick={() => void onDeleteNote(entry.id)}
                      aria-label="Delete care note"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#B42318] ring-1 ring-[#B42318]/15 hover:bg-[#FEE4E2]"
                    >
                      <Trash size={15} weight="light" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </BezelCard>
      </section>
    </Reveal>
  );
}
