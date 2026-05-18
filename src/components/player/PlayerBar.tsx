import { usePlayer } from "@/contexts/PlayerContext";
import { useLibrary } from "@/contexts/LibraryContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play, Pause, SkipBack, SkipForward, Heart,
  Shuffle, Repeat, Repeat1, Volume2, VolumeX, ListMusic, Loader2, Maximize2,
  Trash2, RotateCcw, Gauge, RotateCw, Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/music-api";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { NowPlaying } from "./NowPlaying";

export function PlayerBar() {
  const {
    current, isPlaying, isLoading, togglePlay, next, prev,
    progress, currentTime, duration, seekTo,
    volume, setVolume, shuffle, toggleShuffle,
    repeat, cycleRepeat, queue, playTrack,
    playbackRate, setPlaybackRate, clearQueue, removeFromQueue, skipBy, stop,
  } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  if (!current) return null;
  const liked = isLiked(current.id);

  return (
    <>
      {fullscreen && <NowPlaying onClose={() => setFullscreen(false)} />}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl shadow-player animate-slide-up">
        {/* Mobile: tap track info to expand */}
        <div className="px-2 sm:px-4 pt-2">
          <div className="flex items-center gap-2">
            <span className="hidden text-[10px] tabular-nums text-muted-foreground sm:block w-10 text-right">
              {formatDuration(currentTime)}
            </span>
            <Slider
              value={[Math.round(progress * 1000)]}
              max={1000}
              step={1}
              onValueChange={(v) => seekTo(v[0] / 1000)}
              className="flex-1"
            />
            <span className="hidden text-[10px] tabular-nums text-muted-foreground sm:block w-10">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 sm:px-4 pb-2 sm:pb-3 pt-1">
          <button
            className="flex min-w-0 items-center gap-3 text-left rounded-lg p-1 hover:bg-secondary/40 transition-smooth"
            onClick={() => setFullscreen(true)}
            aria-label="Open now playing"
          >
            <img src={current.thumbnail} alt="" className="h-12 w-12 flex-shrink-0 rounded object-cover" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{current.title}</div>
              <div className="truncate text-xs text-muted-foreground">{current.artist}</div>
            </div>
            <Maximize2 className="h-3 w-3 text-muted-foreground hidden sm:block flex-shrink-0" />
          </button>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost" size="icon"
              className={cn("h-8 w-8 hidden sm:inline-flex", shuffle && "text-primary")}
              onClick={toggleShuffle}
              aria-label="Shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={prev} aria-label="Previous">
              <SkipBack className="h-5 w-5 fill-current" />
            </Button>
            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-foreground text-background hover:bg-foreground/90 hover:scale-105 transition-bounce"
              onClick={togglePlay}
              disabled={isLoading}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={next} aria-label="Next">
              <SkipForward className="h-5 w-5 fill-current" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className={cn("h-8 w-8 hidden sm:inline-flex", repeat !== "off" && "text-primary")}
              onClick={cycleRepeat}
              aria-label="Repeat"
            >
              {repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:hidden" onClick={() => toggleLike(current)} aria-label="Like">
              <Heart className={cn("h-4 w-4", liked && "fill-primary text-primary")} />
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Queue">
                  <ListMusic className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md bg-card">
                <SheetHeader>
                  <SheetTitle>Queue</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-1 overflow-y-auto max-h-[calc(100vh-100px)]">
                  {queue.map((t, i) => (
                    <button
                      key={`${t.id}-${i}`}
                      onClick={() => playTrack(t, queue)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-secondary/60 transition-smooth",
                        t.id === current.id && "bg-secondary/60"
                      )}
                    >
                      <img src={t.thumbnail} alt="" className="h-10 w-10 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{t.title}</div>
                        <div className="truncate text-xs text-muted-foreground">{t.artist}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:inline-flex" onClick={() => toggleLike(current)} aria-label="Like">
              <Heart className={cn("h-4 w-4", liked && "fill-primary text-primary")} />
            </Button>

            <div className="hidden items-center gap-2 sm:flex w-32">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setMuted((m) => !m); setVolume(muted ? volume || 70 : 0); }}>
                {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[volume]}
                max={100}
                step={1}
                onValueChange={(v) => { setVolume(v[0]); setMuted(v[0] === 0); }}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
