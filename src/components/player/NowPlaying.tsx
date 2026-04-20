import { usePlayer } from "@/contexts/PlayerContext";
import { useLibrary } from "@/contexts/LibraryContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play, Pause, SkipBack, SkipForward, Heart,
  Shuffle, Repeat, Repeat1, ChevronDown, Download, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/music-api";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";

interface Props {
  onClose: () => void;
}

export function NowPlaying({ onClose }: Props) {
  const {
    current, isPlaying, isLoading, togglePlay, next, prev,
    progress, currentTime, duration, seekTo,
    shuffle, toggleShuffle, repeat, cycleRepeat, streamUrl,
  } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const [downloading, setDownloading] = useState(false);

  if (!current) return null;
  const liked = isLiked(current.id);

  const handleDownload = async () => {
    if (!streamUrl) {
      toast("Stream not ready yet — try again in a second");
      return;
    }
    setDownloading(true);
    try {
      const res = await fetch(streamUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${current.artist} - ${current.title}.m4a`.replace(/[/\\?%*:|"<>]/g, "_");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Download started");
    } catch (e) {
      toast("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background animate-slide-up"
      style={{
        backgroundImage: `linear-gradient(180deg, hsl(var(--surface-2)) 0%, hsl(var(--background)) 80%)`,
      }}
    >
      <div className="flex items-center justify-between p-4">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <ChevronDown className="h-6 w-6" />
        </Button>
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Playing from</div>
          <div className="text-sm font-medium">Beatly</div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleDownload} disabled={downloading || !streamUrl} aria-label="Download">
          {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-6">
        <div className="relative w-full max-w-sm aspect-square">
          <img
            src={current.thumbnail}
            alt={current.title}
            className="h-full w-full rounded-2xl object-cover shadow-card"
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="mt-8 w-full max-w-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-extrabold">{current.title}</h2>
              <p className="truncate text-sm text-muted-foreground">{current.artist}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => toggleLike(current)} aria-label="Like">
              <Heart className={cn("h-6 w-6", liked && "fill-primary text-primary")} />
            </Button>
          </div>

          <div className="mt-6">
            <Slider
              value={[Math.round(progress * 1000)]}
              max={1000}
              step={1}
              onValueChange={(v) => seekTo(v[0] / 1000)}
            />
            <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>{formatDuration(currentTime)}</span>
              <span>{formatDuration(duration)}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="ghost" size="icon"
              className={cn("h-10 w-10", shuffle && "text-primary")}
              onClick={toggleShuffle} aria-label="Shuffle"
            >
              <Shuffle className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12" onClick={prev} aria-label="Previous">
              <SkipBack className="h-7 w-7 fill-current" />
            </Button>
            <Button
              size="icon"
              className="h-16 w-16 rounded-full bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-bounce shadow-glow"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current ml-1" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12" onClick={next} aria-label="Next">
              <SkipForward className="h-7 w-7 fill-current" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className={cn("h-10 w-10", repeat !== "off" && "text-primary")}
              onClick={cycleRepeat} aria-label="Repeat"
            >
              {repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
