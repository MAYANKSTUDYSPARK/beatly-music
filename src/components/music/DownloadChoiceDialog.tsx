import { useState } from "react";
import { Loader2, Smartphone, WifiOff } from "lucide-react";
import type { Track } from "@/lib/music-api";
import { getDownloadUrl, getMusicApiHeaders } from "@/lib/music-api";
import { useDownloads } from "@/contexts/DownloadsContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  track: Track;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function safeFileName(track: Track) {
  return `${track.artist} - ${track.title}.mp4`.replace(/[/\\?%*:|"<>]/g, "_");
}

export function DownloadChoiceDialog({ track, open, onOpenChange }: Props) {
  const { downloadTrack, isDownloaded, inProgress } = useDownloads();
  const [galleryLoading, setGalleryLoading] = useState(false);
  const appProgress = inProgress[track.id];
  const saved = isDownloaded(track.id);

  const downloadToGallery = async () => {
    setGalleryLoading(true);
    toast("Preparing download…");
    try {
      const source = track.streamOverride || getDownloadUrl(track.id, `${track.artist} - ${track.title}`, `${track.artist} ${track.title}`);
      const res = await fetch(source, { headers: track.streamOverride ? undefined : getMusicApiHeaders() });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      if (blob.size < 1024) throw new Error("Empty file");
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = safeFileName(track);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
      toast.success("Download started");
      onOpenChange(false);
    } catch {
      toast.error("Download failed — try Save in app or another song.");
    } finally {
      setGalleryLoading(false);
    }
  };

  const saveInApp = async () => {
    await downloadTrack(track);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-lg">
        <DialogHeader>
          <DialogTitle>Download song</DialogTitle>
          <DialogDescription className="truncate">{track.title} · {track.artist}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Button className="h-14 justify-start gap-3" onClick={saveInApp} disabled={saved || appProgress !== undefined}>
            {appProgress !== undefined ? <Loader2 className="h-5 w-5 animate-spin" /> : <WifiOff className="h-5 w-5" />}
            <span className="text-left">
              <span className="block font-semibold">Save in app</span>
              <span className="block text-xs opacity-80">{saved ? "Already saved offline" : appProgress !== undefined ? `${appProgress}% saved` : "Works offline inside BeatVerse"}</span>
            </span>
          </Button>
          <Button variant="secondary" className="h-14 justify-start gap-3" onClick={downloadToGallery} disabled={galleryLoading}>
            {galleryLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Smartphone className="h-5 w-5" />}
            <span className="text-left">
              <span className="block font-semibold">Download to gallery</span>
              <span className="block text-xs opacity-80">Save as a file on this device</span>
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}