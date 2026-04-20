// Beatly music API proxy — uses YouTube Music's public InnerTube API (free, no key, unlimited).
// Routes:
//   GET  /music-api/search?q=...&type=songs|artists|albums
//   GET  /music-api/trending?region=IN
//   GET  /music-api/artist?id=...
//   GET  /music-api/stream?id=<videoId>           -> redirects to audio stream URL
//   GET  /music-api/related?id=<videoId>          -> related/up-next songs

import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const YT_MUSIC_BASE = "https://music.youtube.com/youtubei/v1";
const YT_BASE = "https://www.youtube.com/youtubei/v1";
// Public YouTube Music web client key (extracted from public web app, safe to use).
const INNERTUBE_KEY = "AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30";
const CLIENT_CTX = {
  client: {
    clientName: "WEB_REMIX",
    clientVersion: "1.20240605.01.00",
    hl: "en",
    gl: "IN",
  },
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
  });

const err = (msg: string, status = 500) => json({ error: msg }, status);

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
}

function getThumb(thumbs: Array<{ url: string }> | undefined, fallbackId?: string): string {
  if (thumbs?.length) {
    // pick the largest
    const last = thumbs[thumbs.length - 1].url;
    return last.replace(/=w\d+-h\d+/, "=w544-h544");
  }
  return fallbackId ? `https://i.ytimg.com/vi/${fallbackId}/hqdefault.jpg` : "";
}

function parseDuration(text: string | undefined): number {
  if (!text) return 0;
  const parts = text.split(":").map((p) => parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

// Walk arbitrary nested objects looking for musicResponsiveListItemRenderer entries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* walkRenderers(node: any): Generator<any> {
  if (!node || typeof node !== "object") return;
  if (node.musicResponsiveListItemRenderer) yield node.musicResponsiveListItemRenderer;
  if (Array.isArray(node)) for (const c of node) yield* walkRenderers(c);
  else for (const k of Object.keys(node)) yield* walkRenderers(node[k]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(run: any): string {
  if (!run) return "";
  if (run.text) return run.text;
  if (run.runs) return run.runs.map((r: { text?: string }) => r.text ?? "").join("");
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rendererToTrack(r: any): Track | null {
  try {
    const flexCols = r.flexColumns ?? [];
    const fixedCols = r.fixedColumns ?? [];
    const title = extractText(flexCols[0]?.musicResponsiveListItemFlexColumnRenderer?.text);
    const subtitle = extractText(flexCols[1]?.musicResponsiveListItemFlexColumnRenderer?.text);
    // subtitle format: "Song • Artist • Album • 3:45" or similar
    const subParts = subtitle.split(/\s•\s/).map((s: string) => s.trim()).filter(Boolean);
    let artist = subParts[0] ?? "";
    let durationStr = "";
    // Look for duration format
    for (const p of subParts) {
      if (/^\d+:\d{2}$/.test(p)) durationStr = p;
    }
    if (!durationStr) {
      const fixedText = extractText(fixedCols[0]?.musicResponsiveListItemFixedColumnRenderer?.text);
      if (/^\d+:\d{2}/.test(fixedText)) durationStr = fixedText;
    }
    if (artist === "Song" && subParts.length > 1) artist = subParts[1];

    // videoId
    const videoId =
      r.playlistItemData?.videoId ||
      r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
      r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;

    if (!videoId || !title) return null;

    const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails;
    return {
      id: videoId,
      title,
      artist: artist || "Unknown Artist",
      duration: parseDuration(durationStr),
      thumbnail: getThumb(thumbs, videoId),
    };
  } catch {
    return null;
  }
}

async function ytmPost(endpoint: string, body: Record<string, unknown>, base = YT_MUSIC_BASE) {
  const res = await fetch(`${base}/${endpoint}?key=${INNERTUBE_KEY}&prettyPrint=false`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "X-Goog-Api-Format-Version": "1",
      Origin: "https://music.youtube.com",
      Referer: "https://music.youtube.com/",
    },
    body: JSON.stringify({ context: CLIENT_CTX, ...body }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`YT ${endpoint} ${res.status}: ${t.slice(0, 200)}`);
  }
  return await res.json();
}

async function searchSongs(query: string): Promise<Track[]> {
  // params filter for songs only: "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D"
  const data = await ytmPost("search", {
    query,
    params: "EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D",
  });
  const tracks: Track[] = [];
  for (const r of walkRenderers(data)) {
    const t = rendererToTrack(r);
    if (t) tracks.push(t);
    if (tracks.length >= 30) break;
  }
  return tracks;
}

async function getCharts(region = "IN"): Promise<Track[]> {
  // Browse charts page id = FEmusic_charts
  const data = await ytmPost("browse", { browseId: "FEmusic_charts" });
  const tracks: Track[] = [];
  for (const r of walkRenderers(data)) {
    const t = rendererToTrack(r);
    if (t) tracks.push(t);
    if (tracks.length >= 30) break;
  }
  if (tracks.length === 0) {
    // fallback to searching trending
    return searchSongs(`Top trending songs ${region}`);
  }
  return tracks;
}

interface ArtistResult {
  name: string;
  description?: string;
  thumbnail?: string;
  topTracks: Track[];
}

async function searchArtist(name: string): Promise<ArtistResult> {
  // Search filter for artists: "EgWKAQIgAWoKEAkQBRAKEAMQBA%3D%3D"
  const tracks = await searchSongs(name);
  const data = await ytmPost("search", { query: name });
  let thumbnail = tracks[0]?.thumbnail;
  for (const r of walkRenderers(data)) {
    if (r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails) {
      thumbnail = thumbnail || getThumb(r.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails);
      break;
    }
  }
  return { name, thumbnail, topTracks: tracks.slice(0, 20) };
}

async function getRelated(videoId: string): Promise<Track[]> {
  // WEB_REMIX next endpoint to get up-next queue
  const data = await ytmPost("next", {
    videoId,
    isAudioOnly: true,
    enablePersistentPlaylistPanel: true,
  });
  const tracks: Track[] = [];
  // Watch next contains musicQueueRenderer -> playlistPanelRenderer -> contents
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walkPanel = (n: any): void => {
    if (!n || typeof n !== "object") return;
    if (n.playlistPanelVideoRenderer) {
      const r = n.playlistPanelVideoRenderer;
      const id = r.videoId;
      const title = extractText(r.title);
      const longBy = extractText(r.longBylineText);
      const lengthText = extractText(r.lengthText);
      const thumbs = r.thumbnail?.thumbnails;
      if (id && title) {
        tracks.push({
          id,
          title,
          artist: longBy.split("•")[0].trim() || "Unknown",
          duration: parseDuration(lengthText),
          thumbnail: getThumb(thumbs, id),
        });
      }
    }
    if (Array.isArray(n)) for (const c of n) walkPanel(c);
    else for (const k of Object.keys(n)) walkPanel(n[k]);
  };
  walkPanel(data);
  return tracks.slice(0, 25);
}

// Get a direct streamable audio URL using the player endpoint with ANDROID client (returns unsigned URLs)
async function getStreamUrl(videoId: string): Promise<string | null> {
  const body = {
    videoId,
    context: {
      client: {
        clientName: "ANDROID",
        clientVersion: "19.09.37",
        androidSdkVersion: 30,
        hl: "en",
        gl: "US",
      },
    },
  };
  const res = await fetch(`${YT_BASE}/player?key=AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
      "X-Goog-Api-Format-Version": "2",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formats: any[] = data?.streamingData?.adaptiveFormats ?? [];
  const audio = formats
    .filter((f) => (f.mimeType ?? "").startsWith("audio/"))
    .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
  return audio?.url ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const url = new URL(req.url);
  // Path comes in as /music-api/<sub>
  const sub = url.pathname.replace(/^\/+music-api\/?/, "").replace(/^\/+/, "");

  try {
    if (sub === "search") {
      const q = url.searchParams.get("q") ?? "";
      if (!q.trim()) return json({ tracks: [] });
      const tracks = await searchSongs(q);
      return json({ tracks });
    }
    if (sub === "trending") {
      const region = url.searchParams.get("region") ?? "IN";
      const tracks = await getCharts(region);
      return json({ tracks });
    }
    if (sub === "artist") {
      const name = url.searchParams.get("name") ?? "";
      if (!name.trim()) return err("name required", 400);
      const artist = await searchArtist(name);
      return json(artist);
    }
    if (sub === "related") {
      const id = url.searchParams.get("id") ?? "";
      if (!id) return err("id required", 400);
      const tracks = await getRelated(id);
      return json({ tracks });
    }
    if (sub === "stream") {
      const id = url.searchParams.get("id") ?? "";
      if (!id) return err("id required", 400);
      const streamUrl = await getStreamUrl(id);
      if (!streamUrl) return err("Stream not available", 404);
      return json({ url: streamUrl });
    }
    return err("Not found", 404);
  } catch (e) {
    console.error("music-api error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(msg, 500);
  }
});
