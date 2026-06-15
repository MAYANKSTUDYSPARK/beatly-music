import { Track, formatDuration } from "@/lib/music-api";
import { usePlayer } from "@/contexts/PlayerContext";
import { useLibrary } from "@/contexts/LibraryContext";
import { Heart, Play, Pause, MoreHorizontal, Download, ListPlus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { DownloadChoiceDialog } from "./DownloadChoiceDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface Props {
  track: Track;
  index?: number;
  queue?: Track[];
  showIndex?: boolean;
}

function primaryArtist(artist: string): string {
  return artist.split(/[,&]|\sand\s|\sx\s/i)[0].trim();
}

export function TrackRow({ track, index, queue, showIndex }: Props) {
  const { current, isPlaying, playTrack, togglePlay, addToQueue } = usePlayer();
  const { isLiked, toggleLike, playlists, addToPlaylist, createPlaylist } = useLibrary();
  const navigate = useNavigate();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const active = current?.id === track.id;
  const liked = isLiked(track.id);

  const onPlay = () => {
    if (active) togglePlay();
    else playTrack(track, queue);
  };

  return (
    <>
    <DownloadChoiceDialog track={track} open={downloadOpen} onOpenChange={setDownloadOpen} />
    <div
      className={cn(
        "group grid grid-cols-[40px_1fr_auto] sm:grid-cols-[40px_1fr_auto_auto] items-center gap-3 rounded-lg px-2 sm:px-3 py-2 hover:bg-secondary/60 transition-smooth",
        active && "bg-secondary/40"
      )}
    >
      <button
        onClick={onPlay}
        className="relative flex h-10 w-10 items-center justify-center"
        aria-label={active && isPlaying ? "Pause" : "Play"}
      >
        {showIndex && !active ? (
          <span className="text-sm text-muted-foreground group-hover:hidden">{(index ?? 0) + 1}</span>
        ) : null}
        <img
          src={track.thumbnail}
          alt=""
          loading="lazy"
          className={cn("h-10 w-10 rounded object-cover", showIndex && !active && "hidden group-hover:block")}
        />
        <span
          className={cn(
            "absolute inset-0 hidden items-center justify-center rounded bg-black/60 group-hover:flex",
            active && "flex"
          )}
        >
          {active && isPlaying ? (
            <Pause className="h-4 w-4 fill-primary text-primary" />
          ) : (
            <Play className="h-4 w-4 fill-primary text-primary" />
          )}
        </span>
      </button>

      <div className="min-w-0">
        <button onClick={onPlay} className="block max-w-full text-left">
          <div className={cn("truncate text-sm font-medium", active && "text-primary")}>
            {track.title}
          </div>
        </button>
        <button
          className="block max-w-full text-left"
          onClick={() => navigate(`/artist/${encodeURIComponent(primaryArtist(track.artist))}`)}
        >
          <span className="truncate text-xs text-muted-foreground hover:underline">{track.artist}</span>
        </button>
      </div>

      <div className="hidden text-xs text-muted-foreground sm:block">
        {formatDuration(track.duration)}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => toggleLike(track)}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-primary text-primary")} />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => addToQueue(track)}>
              <ListPlus className="h-4 w-4 mr-2" /> Add to queue
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDownloadOpen(true)}>
              <Download className="h-4 w-4 mr-2" /> Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/artist/${encodeURIComponent(primaryArtist(track.artist))}`)}>
              <User className="h-4 w-4 mr-2" /> Go to artist
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Add to playlist</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => {
                const name = prompt("New playlist name");
                if (name?.trim()) {
                  const pl = createPlaylist(name.trim());
                  addToPlaylist(pl.id, track);
                }
              }}
            >
              + New playlist
            </DropdownMenuItem>
            {playlists.length > 0 && <DropdownMenuSeparator />}
            {playlists.map((p) => (
              <DropdownMenuItem key={p.id} onClick={() => addToPlaylist(p.id, track)}>
                {p.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    </>
  );
}
