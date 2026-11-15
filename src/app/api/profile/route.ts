import { NextResponse } from "next/server";
import { updateProfileSchema } from "@/domain/schemas";
import { formatDateKey } from "@/domain/schedule";
import { parseJsonBody } from "@/lib/api-utils";
import { buildDashboardPayload } from "@/lib/seed";
import { mutateStore } from "@/lib/store";

export async function PATCH(request: Request) {
  const parsed = await parseJsonBody(request, updateProfileSchema);
  if (!parsed.success) return parsed.response;

  const nextStore = mutateStore((draft) => ({
    ...draft,
    profile: parsed.data,
  }));

  return NextResponse.json(buildDashboardPayload(nextStore, formatDateKey()));
}
