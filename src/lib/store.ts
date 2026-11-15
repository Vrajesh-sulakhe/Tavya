import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateRandomSecret } from "@/domain/auth";
import { formatDateKey } from "@/domain/schedule";
import type { CircleRole, TavyaStoreData } from "@/domain/types";
import { getEmailDeliveryMode } from "./email";
import {
  buildDashboardPayload,
  createBlankCircle,
  createBlankData,
  createSeedData,
  DEFAULT_CONSENT,
} from "./seed";

let memoryStore: TavyaStoreData | null = null;
let memoryDataDir: string | null = null;

function resolveDataDir(): string {
  return process.env.TAVYA_DATA_DIR?.trim() || path.join(os.tmpdir(), "tavya-data");
}

function getStoreFilePath(): string {
  return path.join(resolveDataDir(), "store.json");
}

function resolveUpstashConfig(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

function resolveRedisKey(): string {
  return process.env.TAVYA_REDIS_KEY?.trim() || "tavya:store:v2";
}

/** Reports whether durable Redis/KV storage is active instead of local/ephemeral disk. */
export function getPersistenceMode(): "durable" | "ephemeral" {
  return resolveUpstashConfig() ? "durable" : "ephemeral";
}

function hydrateStore(data: TavyaStoreData): {
  hydrated: TavyaStoreData;
  changed: boolean;
} {
  let changed = false;
  const circle = data.circle;
  const resolvedCircle =
    circle && circle.sessionSecret
      ? circle
      : {
          ...createBlankCircle(),
          ...circle,
          members: circle?.members ?? [],
          isDemo: Boolean(circle?.isDemo),
          sessionSecret: circle?.sessionSecret || generateRandomSecret(),
        };

  if (!circle || !circle.sessionSecret) {
    changed = true;
  }

  return {
    hydrated: {
      ...data,
      careNotes: data.careNotes ?? [],
      appointments: data.appointments ?? [],
      emailLog: data.emailLog ?? [],
      consent: data.consent ?? { ...DEFAULT_CONSENT },
      circle: resolvedCircle,
    },
    changed,
  };
}

async function readUpstashStore(): Promise<TavyaStoreData | null> {
  const cfg = resolveUpstashConfig();
  if (!cfg) return null;

  try {
    const response = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["GET", resolveRedisKey()]),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { result?: string | null };
    if (!payload.result) return null;
    return JSON.parse(payload.result) as TavyaStoreData;
  } catch {
    return null;
  }
}

async function writeUpstashStore(data: TavyaStoreData): Promise<boolean> {
  const cfg = resolveUpstashConfig();
  if (!cfg) return false;

  try {
    const response = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["SET", resolveRedisKey(), JSON.stringify(data)]),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function readStore(): Promise<TavyaStoreData> {
  const upstashData = await readUpstashStore();
  if (upstashData) {
    const { hydrated, changed } = hydrateStore(upstashData);
    memoryStore = hydrated;
    if (changed) {
      await writeUpstashStore(hydrated);
    }
    return hydrated;
  }

  const currentDir = resolveDataDir();
  if (memoryDataDir !== currentDir) {
    memoryStore = null;
    memoryDataDir = currentDir;
  }

  const filePath = getStoreFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw) as TavyaStoreData;
      const { hydrated, changed } = hydrateStore(parsed);
      memoryStore = hydrated;
      if (changed) {
        await writeStore(hydrated);
      }
      return hydrated;
    }
  } catch {
    // Fall through to memoryStore or fresh initial state
  }

  if (memoryStore) {
    return memoryStore;
  }

  const initial = createBlankData();
  await writeStore(initial);
  return initial;
}

/**
 * Persists store state to Upstash Redis when configured, and atomically writes JSON to disk
 * via temp-file rename as the local/test persistence adapter.
 */
export async function writeStore(data: TavyaStoreData): Promise<void> {
  const { hydrated } = hydrateStore(data);
  const currentDir = resolveDataDir();
  memoryDataDir = currentDir;
  memoryStore = hydrated;

  await writeUpstashStore(hydrated);

  try {
    fs.mkdirSync(currentDir, { recursive: true });
    const targetPath = getStoreFilePath();
    const tmpPath = `${targetPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(hydrated, null, 2), "utf8");
    fs.renameSync(tmpPath, targetPath);
  } catch {
    // Keep memoryStore/Upstash authoritative if filesystem is temporarily read-only
  }
}

export async function resetStore(): Promise<TavyaStoreData> {
  const initial = createSeedData();
  await writeStore(initial);
  return initial;
}

export async function clearStore(): Promise<TavyaStoreData> {
  const current = await readStore();
  const cleared: TavyaStoreData = {
    ...createBlankData(),
    profile: current.profile,
    circle: current.circle,
    consent: current.consent ?? { ...DEFAULT_CONSENT },
  };
  await writeStore(cleared);
  return cleared;
}

/** Applies an immutable state transition over a deep clone of the current store. */
export async function mutateStore(
  updater: (draft: TavyaStoreData) => TavyaStoreData
): Promise<TavyaStoreData> {
  const current = structuredClone(await readStore());
  const next = updater(current);
  await writeStore(next);
  return next;
}

export async function getDashboardSnapshot(
  viewerRole: CircleRole = "caretaker",
  todayKey: string = formatDateKey()
) {
  const data = await readStore();
  return buildDashboardPayload(data, {
    todayKey,
    viewerRole,
    persistence: getPersistenceMode(),
    emailDelivery: getEmailDeliveryMode(),
  });
}
