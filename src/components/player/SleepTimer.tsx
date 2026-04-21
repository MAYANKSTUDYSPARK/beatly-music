import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Moon } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRESETS = [5, 10, 15, 30, 45, 60];

export function SleepTimer() {
  const { audioRef } = usePlayer();
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  useEffect(() => {
    if (!endsAt) return;
    if (Date.now() >= endsAt) {
      audioRef.current?.pause();
      toast("Sleep timer ended — goodnight 🌙");
      setEndsAt(null);
    }
  }, [now, endsAt, audioRef]);

  const setTimer = (mins: number) => {
    setEndsAt(Date.now() + mins * 60_000);
    toast(`Music will stop in ${mins} min`);
  };

  const cancel = () => {
    setEndsAt(null);
    toast("Sleep timer cancelled");
  };

  const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 60_000)) : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-10 w-10 relative", endsAt && "text-primary")}
          aria-label="Sleep timer"
        >
          <Moon className="h-5 w-5" />
          {endsAt && (
            <span className="absolute -bottom-0.5 right-0 text-[9px] font-bold bg-primary text-primary-foreground rounded px-1">
              {remaining}m
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 bg-popover border-border" align="center">
        <div className="space-y-2">
          <div className="text-sm font-semibold mb-2">Sleep Timer</div>
          {endsAt && (
            <div className="rounded-lg bg-secondary/40 p-2 text-center text-xs text-muted-foreground">
              Stops in <span className="font-bold text-primary">{remaining} min</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((m) => (
              <Button key={m} size="sm" variant="outline" onClick={() => setTimer(m)}>
                {m}m
              </Button>
            ))}
          </div>
          {endsAt && (
            <Button size="sm" variant="ghost" className="w-full text-destructive" onClick={cancel}>
              Cancel
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
