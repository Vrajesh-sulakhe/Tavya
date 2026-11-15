import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/api-utils";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const store = await readStore();
  const membersCount = (store.circle?.members ?? []).length;
  const session = getSessionFromRequest(request, store);

  return NextResponse.json({
    configured: membersCount > 0,
    isDemo: Boolean(store.circle?.isDemo),
    session,
  });
}
