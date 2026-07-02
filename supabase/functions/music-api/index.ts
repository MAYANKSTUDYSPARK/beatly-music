// Beatly music API proxy — uses YouTube Music's public InnerTube API (free, no key, unlimited).
// Routes:
//   GET  /music-api/search?q=...&type=songs|artists|albums
//   GET  /music-api/trending?region=IN
//   GET  /music-api/artist?id=...
//   GET  /music-api/stream?id=<videoId>           -> redirects to audio stream URL
//   GET  /music-api/related?id=<videoId>          -> related/up-next songs

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

const safeFileName = (value: string) =>
  value.replace(/[\\/\?%\*:|"<>]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "beatly-track";

interface Track {
  id: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
}

interface StreamResult {
  url: string;
  proxied?: boolean;
  mimeType?: string;
}

async function isReachableMedia(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "audio/*,video/mp4,*/*;q=0.8", Range: "bytes=0-1023" },
      signal: AbortSignal.timeout(6000),
    });
    return res.ok || res.status === 206;
  } catch {
    return false;
  }
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

// Try multiple YouTube clients to extract a direct streamable audio URL.
// Different clients have different reliability — we fall back through them.
// TVHTML5_SIMPLY_EMBEDDED_PLAYER bypasses login on data-center IPs (works for embeddable videos).
// IOS client is the second-best fallback. We skip ANDROID/WEB which now require PoToken.
interface StreamClient {
  name: string;
  key: string;
  ua: string;
  client: Record<string, unknown>;
  extra?: Record<string, unknown>;
}
const STREAM_CLIENTS: StreamClient[] = [
  {
    name: "TV_EMBED",
    key: INNERTUBE_KEY,
    ua: "Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15",
    client: {
      clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER",
      clientVersion: "2.0",
      clientScreen: "EMBED",
      hl: "en",
      gl: "US",
    },
    extra: { thirdParty: { embedUrl: "https://www.youtube.com" } },
  },
  {
    name: "IOS",
    key: "AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc",
    ua: "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
    client: {
      clientName: "IOS",
      clientVersion: "19.09.3",
      deviceMake: "Apple",
      deviceModel: "iPhone14,3",
      osName: "iPhone",
      osVersion: "15.6.0.19G71",
      hl: "en",
      gl: "US",
    },
  },
  {
    name: "ANDROID_MUSIC",
    key: "AIzaSyAOghZGza2MQSZkY_zfZ370N-PUdXEo8AI",
    ua: "com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 11) gzip",
    client: { clientName: "ANDROID_MUSIC", clientVersion: "6.42.52", androidSdkVersion: 30, hl: "en", gl: "US" },
  },
];

async function tryClient(videoId: string, c: typeof STREAM_CLIENTS[number]): Promise<StreamResult | null> {
  try {
    const res = await fetch(`${YT_BASE}/player?key=${c.key}&prettyPrint=false`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": c.ua,
        "X-Goog-Api-Format-Version": "2",
        Origin: "https://www.youtube.com",
      },
      body: JSON.stringify({
        videoId,
        context: { client: c.client, ...(c.extra ?? {}) },
        playbackContext: { contentPlaybackContext: { html5Preference: "HTML5_PREF_WANTS" } },
        contentCheckOk: true,
        racyCheckOk: true,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const status = data?.playabilityStatus?.status;
    if (status && status !== "OK") {
      console.log(`[stream] ${c.name} ${videoId}: ${status}`);
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formats: any[] = data?.streamingData?.adaptiveFormats ?? [];
    const audio = formats
      .filter((f) => (f.mimeType ?? "").startsWith("audio/") && f.url) // require unsigned url
      .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
    return audio?.url ? { url: audio.url, mimeType: audio.mimeType ?? "audio/mp4" } : null;
  } catch (e) {
    console.log(`[stream] ${c.name} threw:`, e instanceof Error ? e.message : e);
    return null;
  }
}

// Public Piped/Invidious instances that proxy YouTube and bypass data-center blocks.
// These return JSON with audio stream URLs we can serve directly.
const PIPED_INSTANCES = [
  "https://api.piped.private.coffee",
  "https://pipedapi.leptons.xyz",
  "https://pipedapi-libre.kavin.rocks",
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.reallyaweso.me",
];
const STREAM_RESULT_CACHE = new Map<string, { expiresAt: number; stream: StreamResult | null }>();
const STREAM_RESULT_TTL = 8 * 60 * 1000;

async function getStreamFromPiped(videoId: string): Promise<StreamResult | null> {
  for (const base of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${base}/streams/${videoId}`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(4500),
      });
      if (!res.ok) {
        console.log(`[piped] ${base} ${videoId}: ${res.status}`);
        continue;
      }
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const audios: any[] = data?.audioStreams ?? [];
      const best = audios
        .filter((a) => a.url)
        .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
      if (best?.url) {
        console.log(`[piped] hit ${base} ${videoId}`);
        const candidate = { url: best.url, mimeType: best.mimeType ?? "audio/mp4" };
        if (await isReachableMedia(candidate.url)) return candidate;
      }
      // Some YouTube Music tracks only expose muxed MP4 streams via public proxies.
      // HTMLAudio can play the audio track from these MP4 files, so use them as a reliable fallback.
      const videos: any[] = data?.videoStreams ?? [];
      const muxed = videos
        .filter((v) => v.url && v.videoOnly !== true && (v.mimeType ?? "").includes("mp4"))
        .sort((a, b) => (Number(a.contentLength || 0) || 0) - (Number(b.contentLength || 0) || 0))[0];
      if (muxed?.url) {
        console.log(`[piped] muxed fallback ${base} ${videoId}`);
        const candidate = { url: muxed.url, mimeType: muxed.mimeType ?? "video/mp4" };
        if (await isReachableMedia(candidate.url)) return candidate;
      }
    } catch (e) {
      console.log(`[piped] ${base} threw:`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

async function getStream(videoId: string): Promise<StreamResult | null> {
  const cached = STREAM_RESULT_CACHE.get(videoId);
  if (cached && cached.expiresAt > Date.now()) return cached.stream;
  // Try Piped first (most reliable on data-center IPs).
  const piped = await getStreamFromPiped(videoId);
  if (piped) {
    STREAM_RESULT_CACHE.set(videoId, { expiresAt: Date.now() + STREAM_RESULT_TTL, stream: piped });
    return piped;
  }
  // Fall back to direct InnerTube (works for some unrestricted videos).
  for (const c of STREAM_CLIENTS) {
    const stream = await tryClient(videoId, c);
    if (stream) {
      STREAM_RESULT_CACHE.set(videoId, { expiresAt: Date.now() + STREAM_RESULT_TTL, stream });
      return stream;
    }
  }
  STREAM_RESULT_CACHE.set(videoId, { expiresAt: Date.now() + 60_000, stream: null });
  return null;
}

const SAAVN_INSTANCES = [
  "https://saavn-api-eight.vercel.app",
  "https://jiosavn-api.vercel.app",
];

async function getSaavnDownload(query: string): Promise<StreamResult | null> {
  const q = query.replace(/\.(mp3|m4a|mp4)$/i, "").replace(/\s+/g, " ").trim();
  if (!q) return null;
  for (const base of SAAVN_INSTANCES) {
    try {
      const res = await fetch(`${base}/api/search/songs?query=${encodeURIComponent(q)}&limit=1`, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const downloads: any[] = data?.data?.results?.[0]?.downloadUrl ?? [];
      const best = downloads
        .filter((d) => d.url)
        .sort((a, b) => parseInt(b.quality, 10) - parseInt(a.quality, 10))[0];
      if (best?.url) {
        const candidate = { url: best.url, mimeType: "audio/mp4" };
        if (await isReachableMedia(candidate.url)) return candidate;
      }
    } catch (e) {
      console.log(`[saavn] threw:`, e instanceof Error ? e.message : e);
    }
  }
  return null;
}

function streamApiUrl(req: Request, videoId: string): string {
  const url = new URL(req.url);
  url.protocol = "https:";
  url.search = "";
  url.pathname = "/functions/v1/music-api/stream-file";
  url.searchParams.set("id", videoId);
  return url.toString();
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
      const stream = await getStream(id);
      // Always return 200 — null url signals "unavailable" without a noisy 404.
      return json({ url: stream ? streamApiUrl(req, id) : null, available: !!stream, proxied: true });
    }
    if (sub === "stream-file") {
      const id = url.searchParams.get("id") ?? "";
      if (!id) return err("id required", 400);
      const stream = await getStream(id);
      if (!stream) return err("Stream unavailable for this track", 404);
      const upstream = await fetch(stream.url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "audio/*,video/mp4,*/*;q=0.8",
          Range: "bytes=0-",
        },
      });
      if (!upstream.ok && upstream.status !== 206) return err("Stream source failed", 502);
      const headers = new Headers(corsHeaders);
      headers.set("Content-Type", upstream.headers.get("content-type") || stream.mimeType || "audio/mp4");
      headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
      headers.set("Cache-Control", "public, max-age=300");
      for (const h of ["content-length", "content-range"]) {
        const value = upstream.headers.get(h);
        if (value) headers.set(h, value);
      }
      return new Response(upstream.body, { status: upstream.status, headers });
    }
    if (sub === "download") {
      const id = url.searchParams.get("id") ?? "";
      const name = safeFileName(url.searchParams.get("name") ?? `Beatly-${id}`);
      const query = url.searchParams.get("q") ?? name;
      if (!id) return err("id required", 400);
      const stream = await getStream(id) ?? await getSaavnDownload(query);
      if (!stream) return err("Download unavailable for this track", 404);
      const upstream = await fetch(stream.url, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "audio/*,video/mp4,*/*;q=0.8",
          Range: "bytes=0-",
        },
      });
      if (!upstream.ok && upstream.status !== 206) return err("Download source failed", 502);
      const headers = new Headers(corsHeaders);
      const contentType = upstream.headers.get("content-type") || stream.mimeType || "audio/mp4";
      headers.set("Content-Type", contentType);
      headers.set("Content-Disposition", `attachment; filename="${name}.${contentType.includes("mp4") ? "mp4" : "m4a"}"`);
      headers.set("Accept-Ranges", upstream.headers.get("accept-ranges") || "bytes");
      headers.set("Cache-Control", "private, max-age=300");
      for (const h of ["content-length", "content-range"]) {
        const value = upstream.headers.get(h);
        if (value) headers.set(h, value);
      }
      return new Response(upstream.body, { status: upstream.status, headers });
    }
    return err("Not found", 404);
  } catch (e) {
    console.error("music-api error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return err(msg, 500);
  }
});
