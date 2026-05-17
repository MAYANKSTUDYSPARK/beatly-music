import { useState } from "react";
import { useDownloads } from "@/contexts/DownloadsContext";
import { usePlayer } from "@/contexts/PlayerContext";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Play, WifiOff, HardDrive } from "lucide-react";
import { formatBytes } from "@/lib/downloads-db";
import type { Track } from "@/lib/music-api";

export default function Downloads() {
  const { downloads, loading, removeDownload, getOfflineUrl, deviceId } = useDownloads();
  const { playTrack } = usePlayer();
  const [playing, setPlaying] = useState<string | null>(null);

  const play = async (rec: typeof downloads[number]) => {
    setPlaying(rec.id);
    const url = await getOfflineUrl(rec.id);
    if (!url) return;
    const t: Track = { ...rec.track, streamOverride: url };
    playTrack(t);
    setPlaying(null);
  };

  const totalSize = downloads.reduce((s, d) => s + d.size, 0);

  return (
    <div className="min-h-full">
      <div className="px-4 sm:px-6 pt-6 pb-10 space-y-6 max-w-screen-2xl mx-auto">
        <header className="animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
            <Download className="h-8 w-8 text-primary" /> Downloads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
            <WifiOff className="h-3.5 w-3.5" /> Available offline · {downloads.length} songs · {formatBytes(totalSize)}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/60 flex items-center gap-1">
            <HardDrive className="h-3 w-3" /> Device ID: <code className="font-mono">{deviceId.slice(0, 8)}…</code>
          </p>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : downloads.length === 0 ? (
          <div className="rounded-2xl bg-card/40 p-8 text-center animate-fade-in">
            <Download className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              No downloads yet. Open any song's Now Playing screen and tap <strong>Save offline</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {downloads.map((rec) => (
              <div
                key={rec.id}
                className="flex items-center gap-3 rounded-xl bg-card/60 p-3 hover:bg-secondary/60 transition-smooth animate-fade-in"
              >
                <img src={rec.track.thumbnail} alt="" className="h-12 w-12 rounded object-cover" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{rec.track.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{rec.track.artist} · {formatBytes(rec.size)}</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => play(rec)} disabled={playing === rec.id} aria-label="Play">
                  <Play className="h-4 w-4 fill-current" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => removeDownload(rec.id)} aria-label="Remove">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
