import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { formatDateKey } from "@/domain/schedule";
import type { TavyaStoreData } from "@/domain/types";
import {
  buildDashboardPayload,
  createBlankData,
  createSeedData,
} from "./seed";

let memoryStore: TavyaStoreData | null = null;
let memoryDataDir: string | null = null;

function resolveDataDir(): string {
  return process.env.TAVYA_DATA_DIR?.trim() || path.join(os.tmpdir(), "tavya-data");
}

function getStoreFilePath(): string {
  return path.join(resolveDataDir(), "store.json");
}

export function readStore(): TavyaStoreData {
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
      memoryStore = parsed;
      return parsed;
    }
  } catch {
    // Fall through to seed creation if disk cache is unreadable
  }

  if (memoryStore) {
    return memoryStore;
  }

  const initial = createBlankData();
  writeStore(initial);
  return initial;
}

/**
 * Persists store state in memory and atomically writes JSON to disk via temp-file rename
 * to prevent partial reads. Silently keeps in-memory state if the filesystem is read-only.
 */
export function writeStore(data: TavyaStoreData): void {
  const currentDir = resolveDataDir();
  memoryDataDir = currentDir;
  memoryStore = data;

  try {
    fs.mkdirSync(currentDir, { recursive: true });
    const targetPath = getStoreFilePath();
    const tmpPath = `${targetPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmpPath, targetPath);
  } catch {
    // Keep memoryStore authoritative if filesystem is temporarily read-only
  }
}

export function resetStore(): TavyaStoreData {
  const initial = createSeedData();
  writeStore(initial);
  return initial;
}

export function clearStore(): TavyaStoreData {
  const current = readStore();
  const cleared: TavyaStoreData = {
    ...createBlankData(),
    profile: current.profile,
  };
  writeStore(cleared);
  return cleared;
}

/**
 * Applies an immutable state transition over a deep clone of the current store.
 */
export function mutateStore(
  updater: (draft: TavyaStoreData) => TavyaStoreData
): TavyaStoreData {
  const current = structuredClone(readStore());
  const next = updater(current);
  writeStore(next);
  return next;
}

export function getDashboardSnapshot() {
  return buildDashboardPayload(readStore(), formatDateKey());
}
