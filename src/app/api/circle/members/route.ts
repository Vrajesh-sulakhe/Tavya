import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { authenticateMember, createMemberRecord } from "@/domain/auth";
import { createMemberSchema, removeMemberSchema } from "@/domain/schemas";
import { parseJsonBody, requireSession } from "@/lib/api-utils";
import { getDashboardSnapshot, mutateStore } from "@/lib/store";

export async function POST(request: Request) {
  const auth = await requireSession(request, ["caretaker"]);
  if (!auth.success) return auth.response;

  const parsed = await parseJsonBody(request, createMemberSchema);
  if (!parsed.success) return parsed.response;

  const existingMembers = auth.store.circle?.members ?? [];
  if (authenticateMember(existingMembers, parsed.data.passcode)) {
    return NextResponse.json(
      { error: "That passcode is already assigned to another circle member." },
      { status: 409 }
    );
  }

  const newMember = createMemberRecord({
    id: `member-${randomUUID().slice(0, 8)}`,
    name: parsed.data.name,
    role: parsed.data.role,
    email: parsed.data.email,
    passcode: parsed.data.passcode,
  });

  await mutateStore((draft) => ({
    ...draft,
    circle: {
      members: [...(draft.circle?.members ?? []), newMember],
      isDemo: draft.circle?.isDemo ?? false,
      sessionSecret: draft.circle?.sessionSecret ?? "",
    },
  }));

  const dashboard = await getDashboardSnapshot(auth.session.role);
  return NextResponse.json({ dashboard }, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireSession(request, ["caretaker"]);
  if (!auth.success) return auth.response;

  const parsed = await parseJsonBody(request, removeMemberSchema);
  if (!parsed.success) return parsed.response;

  const members = auth.store.circle?.members ?? [];
  const target = members.find((m) => m.id === parsed.data.id);
  if (!target) {
    return NextResponse.json(
      { error: "Care circle member not found." },
      { status: 404 }
    );
  }

  if (target.id === auth.session.memberId) {
    return NextResponse.json(
      { error: "You cannot remove the currently active session." },
      { status: 400 }
    );
  }

  if (
    target.role === "caretaker" &&
    members.filter((m) => m.role === "caretaker").length <= 1
  ) {
    return NextResponse.json(
      { error: "At least one caretaker must remain in the care circle." },
      { status: 400 }
    );
  }

  await mutateStore((draft) => ({
    ...draft,
    circle: {
      members: (draft.circle?.members ?? []).filter((m) => m.id !== target.id),
      isDemo: draft.circle?.isDemo ?? false,
      sessionSecret: draft.circle?.sessionSecret ?? "",
    },
  }));

  const dashboard = await getDashboardSnapshot(auth.session.role);
  return NextResponse.json({ ok: true, dashboard });
}
