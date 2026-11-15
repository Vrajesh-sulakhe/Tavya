import { NextResponse } from "next/server";
import type { z } from "zod";
import {
  parseCookieHeader,
  resolveSessionSecret,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  verifySessionToken,
} from "@/domain/auth";
import type { CircleRole, SessionInfo, TavyaStoreData } from "@/domain/types";
import { readStore } from "./store";

export async function parseJsonBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<
  | { success: true; data: z.infer<T> }
  | { success: false; response: NextResponse }
> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Malformed JSON request body" },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      response: NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: parsed.data };
}

/** Verifies the signed session cookie against the store's active circle membership. */
export function getSessionFromRequest(
  request: Request,
  store: TavyaStoreData
): SessionInfo | null {
  const token = parseCookieHeader(
    request.headers.get("cookie"),
    SESSION_COOKIE_NAME
  );
  const secret = resolveSessionSecret(store.circle);
  const session = verifySessionToken(token, secret);
  if (!session) return null;

  const activeMember = (store.circle?.members ?? []).find(
    (m) => m.id === session.memberId
  );
  if (!activeMember) return null;

  return {
    memberId: activeMember.id,
    name: activeMember.name,
    role: activeMember.role,
  };
}

/** Enforces signed passcode session authentication and optional role membership. */
export async function requireSession(
  request: Request,
  allowedRoles?: readonly CircleRole[]
): Promise<
  | { success: true; session: SessionInfo; store: TavyaStoreData }
  | { success: false; response: NextResponse }
> {
  const store = await readStore();
  const session = getSessionFromRequest(request, store);
  if (!session) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Passcode authentication required." },
        { status: 401 }
      ),
    };
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Insufficient care circle permissions for this action." },
        { status: 403 }
      ),
    };
  }

  return { success: true, session, store };
}

/** Attaches an HttpOnly HMAC-signed session cookie to the HTTP response. */
export function attachSessionCookie(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return response;
}

/** Clears the session cookie on logout. */
export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

/** Extracts a normalized client identifier for rate limiting. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "local";
}
