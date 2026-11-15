import { NextResponse } from "next/server";
import { updateProfileSchema } from "@/domain/schemas";
import { parseJsonBody, requireSession } from "@/lib/api-utils";
import { getDashboardSnapshot, mutateStore } from "@/lib/store";

export async function PATCH(request: Request) {
  const auth = await requireSession(request, ["caretaker"]);
  if (!auth.success) return auth.response;

  const parsed = await parseJsonBody(request, updateProfileSchema);
  if (!parsed.success) return parsed.response;

  await mutateStore((draft) => ({
    ...draft,
    profile: parsed.data,
  }));

  return NextResponse.json(await getDashboardSnapshot(auth.session.role));
}
