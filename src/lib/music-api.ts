// YouTube search via Piped public instances (no API key required).
// Falls back across instances for resilience.

export interface Track {
  id: string; // youtube video id
  title: string;
  artist: string;
  duration: number; // seconds
  thumbnail: string;
}

const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.reallyaweso.me",
  "https://api.piped.yt",
];

async function pipedFetch(path: string): Promise<any> {
  let lastErr: unknown = null;
  for (const base of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${base}${path}`, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  throw lastErr ?? new Error("All Piped instances failed");
}

function bestThumb(thumbnailUrl: string | undefined, videoId: string): string {
  if (thumbnailUrl) return thumbnailUrl;
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function extractId(url: string | undefined): string {
  if (!url) return "";
  const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  return m ? m[1] : "";
}

export async function searchTracks(query: string, limit = 25): Promise<Track[]> {
  if (!query.trim()) return [];
  const data = await pipedFetch(
    `/search?q=${encodeURIComponent(query)}&filter=music_songs`
  );
  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  return items
    .filter((it) => it.type === "stream" || it.url)
    .slice(0, limit)
    .map((it) => {
      const id = extractId(it.url);
      return {
        id,
        title: it.title ?? "Unknown",
        artist: it.uploaderName ?? it.uploader ?? "Unknown Artist",
        duration: typeof it.duration === "number" ? it.duration : 0,
        thumbnail: bestThumb(it.thumbnail, id),
      } as Track;
    })
    .filter((t) => t.id);
}

export async function getTrending(region = "IN"): Promise<Track[]> {
  try {
    const data = await pipedFetch(`/trending?region=${region}`);
    const items: any[] = Array.isArray(data) ? data : [];
    return items.slice(0, 30).map((it) => {
      const id = extractId(it.url);
      return {
        id,
        title: it.title ?? "Unknown",
        artist: it.uploaderName ?? "Unknown Artist",
        duration: typeof it.duration === "number" ? it.duration : 0,
        thumbnail: bestThumb(it.thumbnail, id),
      } as Track;
    }).filter((t) => t.id);
  } catch {
    return [];
  }
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
