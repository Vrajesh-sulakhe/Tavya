import { NextResponse } from "next/server";
import { getEmailDeliveryMode } from "@/lib/email";
import { getPersistenceMode } from "@/lib/store";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "tavya",
    persistence: getPersistenceMode(),
    emailDelivery: getEmailDeliveryMode(),
    timestamp: new Date().toISOString(),
  });
}
