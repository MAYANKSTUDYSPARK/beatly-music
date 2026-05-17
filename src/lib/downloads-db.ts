// Offline downloads storage — IndexedDB keyed by device UUID.
// Stores full audio blobs so users can listen offline forever.
import type { Track } from "./music-api";

const DB_NAME = "beatly-offline";
const DB_VERSION = 1;
const STORE = "downloads";
const DEVICE_KEY = "beatly:device-id";

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export interface DownloadRecord {
  id: string;             // track id
  deviceId: string;
  track: Track;           // metadata snapshot
  blob: Blob;             // audio data
  size: number;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("deviceId", "deviceId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDownload(track: Track, blob: Blob): Promise<DownloadRecord> {
  const db = await openDb();
  const record: DownloadRecord = {
    id: track.id,
    deviceId: getDeviceId(),
    track,
    blob,
    size: blob.size,
    savedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return record;
}

export async function listDownloads(): Promise<DownloadRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const all = (req.result as DownloadRecord[]) || [];
      const mine = getDeviceId();
      resolve(all.filter((r) => r.deviceId === mine).sort((a, b) => b.savedAt - a.savedAt));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getDownload(id: string): Promise<DownloadRecord | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as DownloadRecord) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDownload(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
