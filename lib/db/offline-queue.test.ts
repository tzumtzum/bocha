import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock idb module
const mockDB = {
  put: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
  getAllFromIndex: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
};

const mockOpenDB = vi.fn().mockResolvedValue(mockDB);

vi.mock("idb", () => ({
  openDB: (...args: unknown[]) => mockOpenDB(...args),
}));

import {
  queueOfflineLog,
  getUnsyncedLogs,
  markLogSynced,
  getQueuedLogsForBird,
  clearAllOfflineLogs,
} from "./offline-queue";

describe("Offline Queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queues a log", async () => {
    await queueOfflineLog({
      bird_id: "bird-1",
      user_id: "user-1",
      log_date: "2024-03-15",
      log_type: "quick",
      weight: 95,
      weight_unit: "g",
      overall_status: "normal",
      created_at: new Date().toISOString(),
    });

    expect(mockOpenDB).toHaveBeenCalledWith("bobo-offline-db", 1, expect.any(Object));
    expect(mockDB.put).toHaveBeenCalledWith("offline_logs", expect.objectContaining({
      bird_id: "bird-1",
      weight: 95,
      synced: false,
      retry_count: 0,
    }));
  });

  it("gets unsynced logs from index", async () => {
    const mockLogs = [
      { id: "1", bird_id: "bird-1", synced: false },
      { id: "2", bird_id: "bird-1", synced: false },
    ];
    mockDB.getAllFromIndex.mockResolvedValue(mockLogs);

    const logs = await getUnsyncedLogs();
    expect(mockDB.getAllFromIndex).toHaveBeenCalledWith("offline_logs", "by_synced", 0);
    expect(logs).toHaveLength(2);
  });

  it("marks log as synced by deleting it", async () => {
    await markLogSynced("log-1");
    expect(mockDB.delete).toHaveBeenCalledWith("offline_logs", "log-1");
  });

  it("gets queued logs for specific bird", async () => {
    const allLogs = [
      { id: "1", bird_id: "bird-1", synced: false },
      { id: "2", bird_id: "bird-2", synced: false },
      { id: "3", bird_id: "bird-1", synced: false },
    ];
    mockDB.getAllFromIndex.mockImplementation((_store: string, _index: string, key: string) => {
      return Promise.resolve(allLogs.filter((l) => l.bird_id === key));
    });

    const logs = await getQueuedLogsForBird("bird-1");
    expect(logs).toHaveLength(2);
    expect(logs[0].bird_id).toBe("bird-1");
    expect(logs[1].bird_id).toBe("bird-1");
  });

  it("clears all offline logs", async () => {
    await clearAllOfflineLogs();
    expect(mockDB.clear).toHaveBeenCalledWith("offline_logs");
  });
});
