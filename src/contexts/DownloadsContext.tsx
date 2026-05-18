import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Track } from "@/lib/music-api";
import { getDownloadUrl } from "@/lib/music-api";
import {
  saveDownload, listDownloads, deleteDownload, getDownload,
  type DownloadRecord, getDeviceId,
} from "@/lib/downloads-db";

interface DownloadsContextValue {
  downloads: DownloadRecord[];
  loading: boolean;
  deviceId: string;
  isDownloaded: (id: string) => boolean;
  downloadTrack: (track: Track) => Promise<void>;
  removeDownload: (id: string) => Promise<void>;
  getOfflineUrl: (id: string) => Promise<string | null>;
  inProgress: Record<string, number>; // id -> percent
}

const DownloadsContext = createContext<DownloadsContextValue | null>(null);

export function DownloadsProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [inProgress, setInProgress] = useState<Record<string, number>>({});
  const deviceId = useMemo(() => getDeviceId(), []);

  const refresh = useCallback(async () => {
    setDownloads(await listDownloads());
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const isDownloaded = useCallback(
    (id: string) => downloads.some((d) => d.id === id),
    [downloads]
  );

  const downloadTrack = useCallback(async (track: Track) => {
    if (downloads.some((d) => d.id === track.id)) {
      toast("Already downloaded");
      return;
    }
    setInProgress((p) => ({ ...p, [track.id]: 1 }));
    try {
      const url = track.streamOverride || getDownloadUrl(track.id, `${track.artist} - ${track.title}`);
      if (!url) throw new Error("No stream");
      const res = await fetch(url);
      if (!res.ok || !res.body) throw new Error("Fetch failed");

      const total = Number(res.headers.get("content-length") || 0);
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (total) {
            setInProgress((p) => ({ ...p, [track.id]: Math.round((received / total) * 100) }));
          }
        }
      }
      const blob = new Blob(chunks as BlobPart[], { type: res.headers.get("content-type") || "audio/mp4" });
      if (blob.size < 1024) throw new Error("Empty file");
      await saveDownload(track, blob);
      await refresh();
      toast.success(`Saved offline: ${track.title}`);
    } catch (e) {
      toast.error("Download failed — this song source is blocked. Try another track.");
    } finally {
      setInProgress((p) => {
        const n = { ...p };
        delete n[track.id];
        return n;
      });
    }
  }, [downloads, refresh]);

  const removeDownload = useCallback(async (id: string) => {
    await deleteDownload(id);
    await refresh();
    toast("Removed from downloads");
  }, [refresh]);

  const getOfflineUrl = useCallback(async (id: string): Promise<string | null> => {
    const rec = await getDownload(id);
    if (!rec) return null;
    return URL.createObjectURL(rec.blob);
  }, []);

  const value = useMemo<DownloadsContextValue>(() => ({
    downloads, loading, deviceId, isDownloaded, downloadTrack, removeDownload, getOfflineUrl, inProgress,
  }), [downloads, loading, deviceId, isDownloaded, downloadTrack, removeDownload, getOfflineUrl, inProgress]);

  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

export function useDownloads() {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error("useDownloads must be inside DownloadsProvider");
  return ctx;
}
