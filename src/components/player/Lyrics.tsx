import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LyricLine {
  time: number;
  text: string;
}

interface LyricsResponse {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  found: boolean;
}

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split("\n")) {
    const m = raw.match(/^\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\](.*)$/);
    if (!m) continue;
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    const ms = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
    const time = min * 60 + sec + ms / 1000;
    const text = m[4].trim();
    lines.push({ time, text });
  }
  return lines.sort((a, b) => a.time - b.time);
}

export function Lyrics() {
  const { current, currentTime } = usePlayer();
  const [synced, setSynced] = useState<LyricLine[] | null>(null);
  const [plain, setPlain] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    setSynced(null);
    setPlain(null);
    setActiveIdx(-1);

    // Fast cache hit
    const cacheKey = `beatly:lyrics:${current.id}`;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const c = JSON.parse(raw) as { synced?: string; plain?: string };
        if (c.synced) { setSynced(parseLrc(c.synced)); setLoading(false); return; }
        if (c.plain) { setPlain(c.plain); setLoading(false); return; }
      }
    } catch { /* ignore */ }

    setLoading(true);

    const cleanTitle = current.title
      .replace(/\([^)]*\)/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/\b(official|video|music|audio|lyrics?|hd|4k|full song|song|mv|m\/v)\b/gi, "")
      .replace(/\s*[-|—–]\s*.*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    const cleanArtist = current.artist
      .split(/[,&·•|]/)[0]
      .replace(/\b(vevo|topic|official)\b/gi, "")
      .trim();

    const tryFetch = async () => {
      const tryGet = async (track: string, artist: string, dur?: number) => {
        const p = new URLSearchParams({ track_name: track, artist_name: artist });
        if (dur) p.set("duration", String(dur));
        const r = await fetch(`https://lrclib.net/api/get?${p}`);
        if (!r.ok) return null;
        return r.json() as Promise<LyricsResponse>;
      };
      const trySearch = async (q: string) => {
        const r = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
        if (!r.ok) return null;
        const arr = (await r.json()) as LyricsResponse[];
        return arr.find((x) => x.syncedLyrics) || arr[0] || null;
      };

      // Race multiple lookups in parallel — first one with synced lyrics wins.
      const candidates = await Promise.all([
        tryGet(cleanTitle, cleanArtist, current.duration).catch(() => null),
        tryGet(cleanTitle, cleanArtist).catch(() => null),
        trySearch(`${cleanTitle} ${cleanArtist}`).catch(() => null),
        trySearch(cleanTitle).catch(() => null),
      ]);
      if (cancelled) return;
      const withSynced = candidates.find((d) => d?.syncedLyrics);
      const withPlain = candidates.find((d) => d?.plainLyrics);
      const data = withSynced || withPlain;
      if (data?.syncedLyrics) {
        setSynced(parseLrc(data.syncedLyrics));
        try { localStorage.setItem(cacheKey, JSON.stringify({ synced: data.syncedLyrics })); } catch {/**/}
      } else if (data?.plainLyrics) {
        setPlain(data.plainLyrics);
        try { localStorage.setItem(cacheKey, JSON.stringify({ plain: data.plainLyrics })); } catch {/**/}
      }
      setLoading(false);
    };

    tryFetch().catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [current]);

  useEffect(() => {
    if (!synced) return;
    let idx = -1;
    for (let i = 0; i < synced.length; i++) {
      if (synced[i].time <= currentTime + 0.3) idx = i;
      else break;
    }
    if (idx !== activeIdx) setActiveIdx(idx);
  }, [currentTime, synced, activeIdx]);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      activeRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIdx]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (synced) {
    return (
      <div ref={containerRef} className="h-full overflow-y-auto px-4 py-6 text-center scrollbar-hide">
        <div className="space-y-3">
          {synced.map((line, i) => (
            <div
              key={i}
              ref={i === activeIdx ? activeRef : undefined}
              className={cn(
                "text-lg font-semibold transition-all duration-300",
                i === activeIdx ? "text-primary scale-110" : i < activeIdx ? "text-muted-foreground/40" : "text-muted-foreground"
              )}
            >
              {line.text || "♪"}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (plain) {
    return (
      <div className="h-full overflow-y-auto whitespace-pre-line px-4 py-6 text-center text-base text-foreground/80 scrollbar-hide">
        {plain}
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
      No lyrics found for this track. Try another song!
    </div>
  );
}
