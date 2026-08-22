// lib/offline/offlineQueue.ts
// IndexedDB storage for queued offline road hazard reports.

export interface OfflineHazardReport {
  id: string;
  type: string;
  severity: number;
  lat: number;
  lng: number;
  imageBlob: Blob;
  imageName: string;
  createdAt: number;
  retryCount: number;
}

const DB_NAME = "ridebuddy_offline_db";
const STORE_NAME = "pending_hazards";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineHazard(
  data: Omit<OfflineHazardReport, "id" | "createdAt" | "retryCount">
): Promise<string> {
  const db = await openDB();
  const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const record: OfflineHazardReport = {
    ...data,
    id,
    createdAt: Date.now(),
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(record);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineHazards(): Promise<OfflineHazardReport[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("[OfflineQueue] Error getting offline hazards:", err);
    return [];
  }
}

export async function removeOfflineHazard(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingOfflineCount(): Promise<number> {
  const items = await getOfflineHazards();
  return items.length;
}
