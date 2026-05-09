// Beatly music API client — calls our edge function (fast, reliable, no CORS issues).
import { supabase } from "@/integrations/supabase/client";

export interface Track {
  id: string; // youtube video id, or "pod-<id>" for podcasts
  title: string;
  artist: string;
  duration: number; // seconds
  thumbnail: string;
  streamOverride?: string; // direct audio URL (used for podcasts)
}

export interface ArtistResult {
  name: string;
  description?: string;
  thumbnail?: string;
  topTracks: Track[];
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const BASE = `${SUPABASE_URL}/functions/v1/music-api`;

async function call<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

const cache = new Map<string, { ts: number; data: unknown }>();
const TTL = 5 * 60 * 1000;
async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL) return hit.data as T;
  const data = await fn();
  cache.set(key, { ts: Date.now(), data });
  return data;
}

export async function searchTracks(query: string, _limit = 30): Promise<Track[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await cached(`search:${q}`, () => call<{ tracks: Track[] }>("/search", { q }));
  return data.tracks ?? [];
}

export async function getTrending(region = "IN"): Promise<Track[]> {
  const data = await cached(`trending:${region}`, () => call<{ tracks: Track[] }>("/trending", { region }));
  return data.tracks ?? [];
}

export async function getArtist(name: string): Promise<ArtistResult> {
  return cached(`artist:${name}`, () => call<ArtistResult>("/artist", { name }));
}

export async function getRelated(videoId: string): Promise<Track[]> {
  const data = await call<{ tracks: Track[] }>("/related", { id: videoId });
  return data.tracks ?? [];
}

export async function getStreamUrl(videoId: string): Promise<string | null> {
  try {
    const data = await call<{ url: string }>("/stream", { id: videoId });
    return data.url ?? null;
  } catch {
    return null;
  }
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Re-export for convenience
export { supabase };
