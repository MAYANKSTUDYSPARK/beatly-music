import { usePlayer } from "@/contexts/PlayerContext";
import { useLibrary } from "@/contexts/LibraryContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play, Pause, SkipBack, SkipForward, Heart,
  Shuffle, Repeat, Repeat1, ChevronDown, Download, Loader2, Mic2, Disc3, WifiOff, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/music-api";
import { useState } from "react";
import { toast } from "sonner";
import { Lyrics } from "./Lyrics";
import { SleepTimer } from "./SleepTimer";
import { Equalizer } from "./Equalizer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDownloads } from "@/contexts/DownloadsContext";

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
  const { isDownloaded, downloadTrack, inProgress } = useDownloads();
  const [downloading, setDownloading] = useState(false);
  const [tab, setTab] = useState<"cover" | "lyrics">("cover");

  if (!current) return null;
  const liked = isLiked(current.id);
  const saved = isDownloaded(current.id);
  const offlineProgress = inProgress[current.id];

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
    } catch {
      toast("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background animate-slide-up overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(180deg, hsl(var(--surface-2)) 0%, hsl(var(--background)) 80%)`,
      }}
    >
      <div className="flex items-center justify-between p-3 sm:p-4 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <ChevronDown className="h-6 w-6" />
        </Button>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Playing from Beatly</div>
          <div className="text-sm font-semibold truncate max-w-[200px]">{current.artist}</div>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => downloadTrack(current)}
            disabled={saved || offlineProgress !== undefined}
            aria-label="Save offline"
            title="Save offline"
            className="relative"
          >
            {saved ? (
              <Check className="h-5 w-5 text-primary" />
            ) : offlineProgress !== undefined ? (
              <span className="text-[10px] font-bold text-primary">{offlineProgress}%</span>
            ) : (
              <WifiOff className="h-5 w-5" />
            )}
          </Button>
          <Button variant="ghost" size="icon" onClick={handleDownload} disabled={downloading || !streamUrl} aria-label="Download to gallery">
            {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "cover" | "lyrics")} className="flex flex-col flex-1 min-h-0 px-3 sm:px-6">
        <TabsList className="mx-auto mb-2 grid w-fit grid-cols-2 bg-secondary/40">
          <TabsTrigger value="cover" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Disc3 className="h-3.5 w-3.5" /> Cover
          </TabsTrigger>
          <TabsTrigger value="lyrics" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Mic2 className="h-3.5 w-3.5" /> Lyrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cover" className="flex-1 min-h-0 mt-0 flex items-center justify-center">
          <div className="relative w-full max-w-[min(80vw,360px)] aspect-square">
            <img
              src={current.thumbnail}
              alt={current.title}
              className={cn(
                "h-full w-full rounded-2xl object-cover shadow-card transition-transform duration-700",
                isPlaying && "scale-100",
                !isPlaying && "scale-95"
              )}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="lyrics" className="flex-1 min-h-0 mt-0 max-w-md mx-auto w-full">
          <Lyrics />
        </TabsContent>
      </Tabs>

      <div className="px-4 sm:px-6 pb-4 pt-2 mx-auto w-full max-w-md flex-shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl sm:text-2xl font-extrabold">{current.title}</h2>
            <p className="truncate text-sm text-muted-foreground">{current.artist}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => toggleLike(current)} aria-label="Like">
            <Heart className={cn("h-6 w-6", liked && "fill-primary text-primary")} />
          </Button>
        </div>

        <div className="mt-3">
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

        <div className="mt-3 flex items-center justify-between">
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
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-bounce shadow-glow"
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

        <div className="mt-2 flex items-center justify-center gap-1">
          <SleepTimer />
          <Equalizer />
        </div>
      </div>
    </div>
  );
}
