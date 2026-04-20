import { Track } from "@/lib/music-api";
import { usePlayer } from "@/contexts/PlayerContext";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  track: Track;
  queue?: Track[];
}

export function TrackCard({ track, queue }: Props) {
  const { current, isPlaying, playTrack, togglePlay } = usePlayer();
  const active = current?.id === track.id;
  const playingThis = active && isPlaying;

  return (
    <div className="group relative flex flex-col gap-3 rounded-xl bg-card/40 p-3 hover:bg-card transition-smooth cursor-pointer">
      <div className="relative aspect-square overflow-hidden rounded-lg shadow-card">
        <img
          src={track.thumbnail}
          alt={track.title}
          loading="lazy"
          className="h-full w-full object-cover transition-bounce group-hover:scale-105"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (active) togglePlay();
            else playTrack(track, queue);
          }}
          className={cn(
            "absolute bottom-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-bounce",
            playingThis && "opacity-100 translate-y-0"
          )}
          aria-label={playingThis ? "Pause" : "Play"}
        >
          {playingThis ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
        </button>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{track.title}</div>
        <div className="truncate text-xs text-muted-foreground">{track.artist}</div>
      </div>
    </div>
  );
}
