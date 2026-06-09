"use client";
import { useEffect, useCallback, useState } from "react";
import { openDB, IDBPDatabase } from "idb";
import { createClient } from "@/lib/supabase/client";

const DB_NAME = "edoshatch-offline";
const DB_VERSION = 1;

interface OfflineRecord {
  id: string;
  table: string;
  operation: "insert" | "update";
  payload: Record<string, unknown>;
  createdAt: number;
  synced: boolean;
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("pending")) {
        const store = db.createObjectStore("pending", { keyPath: "id" });
        store.createIndex("synced", "synced");
        store.createIndex("table", "table");
      }
      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache", { keyPath: "key" });
      }
    },
  });
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline  = () => { setIsOnline(true);  syncPending(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    countPending();
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const countPending = useCallback(async () => {
    try {
      const db = await getDB();
      const count = await db.countFromIndex("pending", "synced", 0);
      setPendingCount(count);
    } catch {}
  }, []);

  const queueRecord = useCallback(async (
    table: string,
    operation: "insert" | "update",
    payload: Record<string, unknown>
  ) => {
    const record: OfflineRecord = {
      id: crypto.randomUUID(),
      table,
      operation,
      payload,
      createdAt: Date.now(),
      synced: false,
    };
    const db = await getDB();
    await db.put("pending", record);
    setPendingCount(c => c + 1);
    if (isOnline) syncPending();
  }, [isOnline]);

  const syncPending = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const db = await getDB();
      const tx = db.transaction("pending", "readwrite");
      const store = tx.objectStore("pending");
      const pending = await store.index("synced").getAll(0);

      for (const record of pending) {
        try {
          if (record.operation === "insert") {
            await supabase.from(record.table as never).insert(record.payload);
          } else {
            const { id, ...rest } = record.payload;
            await supabase.from(record.table as never).update(rest).eq("id", id);
          }
          record.synced = true;
          await store.put(record);
        } catch (e) {
          console.error(`Sync failed for ${record.table}:`, e);
        }
      }
      await tx.done;
      await countPending();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, supabase, countPending]);

  const cacheData = useCallback(async (key: string, data: unknown, ttlMs = 300_000) => {
    const db = await getDB();
    await db.put("cache", { key, data, expiresAt: Date.now() + ttlMs });
  }, []);

  const getCached = useCallback(async <T>(key: string): Promise<T | null> => {
    const db = await getDB();
    const entry = await db.get("cache", key);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.data as T;
  }, []);

  return { isOnline, pendingCount, isSyncing, queueRecord, syncPending, cacheData, getCached };
}
