import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-utils";
import { executeRemindersRun } from "@/lib/reminders-runner";
import { getDashboardSnapshot } from "@/lib/store";

export const dynamic = "force-dynamic";

function isValidCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization")?.trim();
  if (!header || !header.startsWith("Bearer ")) return false;
  const provided = header.slice("Bearer ".length).trim();
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function handleRun(request: Request) {
  if (isValidCronRequest(request)) {
    const summary = await executeRemindersRun();
    return NextResponse.json(summary);
  }

  const auth = await requireSession(request, ["caretaker", "senior"]);
  if (!auth.success) return auth.response;

  const summary = await executeRemindersRun();
  const dashboard = await getDashboardSnapshot(auth.session.role);
  return NextResponse.json({ ...summary, dashboard });
}

export async function GET(request: Request) {
  return handleRun(request);
}

export async function POST(request: Request) {
  return handleRun(request);
}
