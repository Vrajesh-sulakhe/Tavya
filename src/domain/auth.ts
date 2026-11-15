import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { CareCircle, CircleMember, CircleRole, PublicMember, SessionInfo } from "./types";

export const SESSION_COOKIE_NAME = "tavya_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

interface SignedSessionPayload extends SessionInfo {
  exp: number;
}

const VALID_ROLES = new Set<CircleRole>(["senior", "caretaker", "family"]);

/** Generates a 256-bit random hex secret for HMAC session signing. */
export function generateRandomSecret(): string {
  return randomBytes(32).toString("hex");
}

/** Hashes a 4-8 digit passcode with scrypt and a per-member random salt. */
export function hashPasscode(
  passcode: string,
  salt: string = randomBytes(16).toString("hex")
): { hash: string; salt: string } {
  const hash = scryptSync(passcode, salt, 32).toString("hex");
  return { hash, salt };
}

/** Constant-time passcode check against a stored scrypt hash and salt. */
export function verifyPasscode(
  passcode: string,
  expectedHash: string,
  salt: string
): boolean {
  if (!passcode || !expectedHash || !salt) return false;
  try {
    const derived = scryptSync(passcode, salt, 32);
    const expected = Buffer.from(expectedHash, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Creates a server-only CircleMember record with salted scrypt passcode hash. */
export function createMemberRecord(input: {
  id?: string;
  name: string;
  role: CircleRole;
  email?: string;
  passcode: string;
  createdAt?: string;
}): CircleMember {
  const { hash, salt } = hashPasscode(input.passcode);
  return {
    id: input.id ?? `member-${randomUUID().slice(0, 8)}`,
    name: input.name.trim(),
    role: input.role,
    email: input.email?.trim() || undefined,
    passcodeHash: hash,
    passcodeSalt: salt,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

/** Authenticates a passcode against all circle members without early-return bias. */
export function authenticateMember(
  members: CircleMember[],
  passcode: string
): CircleMember | null {
  let matched: CircleMember | null = null;
  for (const member of members) {
    if (verifyPasscode(passcode, member.passcodeHash, member.passcodeSalt)) {
      matched = matched ?? member;
    }
  }
  return matched;
}

/** Resolves the HMAC secret from env override or persisted circle secret. */
export function resolveSessionSecret(circle?: CareCircle): string {
  const envSecret = process.env.TAVYA_SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  return circle?.sessionSecret ?? "";
}

/** Signs a compact stateless session token using HMAC-SHA256. */
export function signSessionToken(
  session: SessionInfo,
  secret: string,
  nowMs: number = Date.now(),
  ttlMs: number = SESSION_TTL_MS
): string {
  if (!secret) {
    throw new Error("Cannot sign session token without a session secret.");
  }
  const payload: SignedSessionPayload = {
    memberId: session.memberId,
    name: session.name,
    role: session.role,
    exp: nowMs + ttlMs,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

/** Verifies an HMAC-SHA256 signed session token and checks its expiration. */
export function verifySessionToken(
  token: string | null | undefined,
  secret: string,
  nowMs: number = Date.now()
): SessionInfo | null {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  if (!encoded || !signature) return null;

  try {
    const expectedSig = createHmac("sha256", secret)
      .update(encoded)
      .digest("base64url");
    const actualBuf = Buffer.from(signature, "utf8");
    const expectedBuf = Buffer.from(expectedSig, "utf8");
    if (actualBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(actualBuf, expectedBuf)) return null;

    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<SignedSessionPayload>;

    if (
      typeof parsed.memberId !== "string" ||
      !parsed.memberId ||
      typeof parsed.name !== "string" ||
      !parsed.name ||
      typeof parsed.role !== "string" ||
      !VALID_ROLES.has(parsed.role as CircleRole) ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= nowMs
    ) {
      return null;
    }

    return {
      memberId: parsed.memberId,
      name: parsed.name,
      role: parsed.role as CircleRole,
    };
  } catch {
    return null;
  }
}

/** Extracts a named cookie value from an HTTP Cookie header string. */
export function parseCookieHeader(
  cookieHeader: string | null | undefined,
  cookieName: string
): string | null {
  if (!cookieHeader) return null;
  const segments = cookieHeader.split(";");
  for (const segment of segments) {
    const idx = segment.indexOf("=");
    if (idx === -1) continue;
    const key = segment.slice(0, idx).trim();
    if (key === cookieName) {
      const raw = segment.slice(idx + 1).trim();
      try {
        return decodeURIComponent(raw);
      } catch {
        return raw;
      }
    }
  }
  return null;
}

/** Strips password hashes and salts before sending circle members to clients. */
export function toPublicMember(member: CircleMember): PublicMember {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    email: member.email,
  };
}
