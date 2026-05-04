import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface OfflineLog {
  id: string;
  bird_id: string;
  user_id: string;
  log_date: string;
  log_type: string;
  weight?: number;
  weight_unit: string;
  overall_status: string;
  observations?: string | null;
  custom_fields?: unknown[];
  logged_at: string;
  created_at: string;
  synced: boolean;
  retry_count: number;
}

interface BoboDBSchema extends DBSchema {
  offline_logs: {
    key: string;
    value: OfflineLog;
    indexes: {
      by_bird: string;
      by_synced: number;
    };
  };
}

const DB_NAME = "bobo-offline-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BoboDBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<BoboDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<BoboDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("offline_logs", {
          keyPath: "id",
        });
        store.createIndex("by_bird", "bird_id");
        store.createIndex("by_synced", "synced");
      },
    });
  }
  return dbPromise;
}

export async function queueOfflineLog(
  log: Omit<OfflineLog, "id" | "synced" | "retry_count">
): Promise<void> {
  const db = await getDB();
  const id = `${log.bird_id}_${log.log_date}_${Date.now()}`;
  await db.put("offline_logs", {
    ...log,
    id,
    synced: false,
    retry_count: 0,
  });
}

export async function getUnsyncedLogs(): Promise<OfflineLog[]> {
  const db = await getDB();
  return db.getAllFromIndex("offline_logs", "by_synced", 0);
}

export async function markLogSynced(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("offline_logs", id);
}

export async function incrementRetry(id: string): Promise<void> {
  const db = await getDB();
  const log = await db.get("offline_logs", id);
  if (log) {
    log.retry_count += 1;
    await db.put("offline_logs", log);
  }
}

export async function getQueuedLogsForBird(birdId: string): Promise<OfflineLog[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("offline_logs", "by_bird", birdId);
  return all.filter((l) => !l.synced);
}

export async function getQueuedCount(): Promise<number> {
  const logs = await getUnsyncedLogs();
  return logs.length;
}

export async function clearAllOfflineLogs(): Promise<void> {
  const db = await getDB();
  await db.clear("offline_logs");
}

/**
 * Flush all unsynced logs to Supabase.
 * Returns { succeeded, failed } counts.
 */
export async function flushOfflineQueue(
  insertFn: (log: Omit<OfflineLog, "id" | "synced" | "retry_count">) => Promise<{ error: Error | null }>
): Promise<{ succeeded: number; failed: number }> {
  const logs = await getUnsyncedLogs();
  let succeeded = 0;
  let failed = 0;

  for (const log of logs) {
    // Skip logs that have been retried too many times (>5)
    if (log.retry_count >= 5) {
      failed++;
      continue;
    }

    const { error } = await insertFn(log);
    if (error) {
      await incrementRetry(log.id);
      failed++;
    } else {
      await markLogSynced(log.id);
      succeeded++;
    }
  }

  return { succeeded, failed };
}
