import { NextResponse } from "next/server";
import { z } from "zod";
import { restoreStateSchema } from "@/domain/schemas";
import { formatDateKey } from "@/domain/schedule";
import { parseJsonBody } from "@/lib/api-utils";
import { buildDashboardPayload } from "@/lib/seed";
import {
  clearStore,
  getDashboardSnapshot,
  resetStore,
  writeStore,
} from "@/lib/store";

const dashboardActionSchema = z.object({
  action: z.enum(["reset", "clear"]),
});

export async function GET() {
  return NextResponse.json(getDashboardSnapshot());
}

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, dashboardActionSchema);
  if (!parsed.success) return parsed.response;

  const store =
    parsed.data.action === "clear" ? clearStore() : resetStore();
  return NextResponse.json(buildDashboardPayload(store, formatDateKey()));
}

export async function PUT(request: Request) {
  const parsed = await parseJsonBody(request, restoreStateSchema);
  if (!parsed.success) return parsed.response;

  writeStore(parsed.data);
  return NextResponse.json(
    buildDashboardPayload(parsed.data, formatDateKey())
  );
}
