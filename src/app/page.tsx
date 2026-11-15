import { cookies } from "next/headers";
import {
  resolveSessionSecret,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from "@/domain/auth";
import { TavyaApp } from "@/components/TavyaApp";
import { getDashboardSnapshot, readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const store = await readStore();
  const secret = resolveSessionSecret(store.circle);
  const verified = verifySessionToken(token, secret);

  const activeMember = verified
    ? (store.circle?.members ?? []).find((m) => m.id === verified.memberId)
    : undefined;

  const session = activeMember
    ? {
        memberId: activeMember.id,
        name: activeMember.name,
        role: activeMember.role,
      }
    : null;

  const initialData = session
    ? await getDashboardSnapshot(session.role)
    : null;

  return (
    <TavyaApp
      initialData={initialData}
      initialSession={session}
      initialAuthStatus={{
        configured: (store.circle?.members ?? []).length > 0,
        isDemo: Boolean(store.circle?.isDemo),
      }}
    />
  );
}
