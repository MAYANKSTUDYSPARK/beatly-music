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
    setLoading(true);
    setSynced(null);
    setPlain(null);
    setActiveIdx(-1);

    const params = new URLSearchParams({
      track_name: current.title.replace(/\s*\(.*?\)\s*/g, "").trim(),
      artist_name: current.artist.split(/[,&]/)[0].trim(),
      duration: String(current.duration || ""),
    });

    fetch(`https://lrclib.net/api/get?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: LyricsResponse | null) => {
        if (cancelled) return;
        if (!data) {
          setLoading(false);
          return;
        }
        if (data.syncedLyrics) {
          setSynced(parseLrc(data.syncedLyrics));
        } else if (data.plainLyrics) {
          setPlain(data.plainLyrics);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

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
