import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { SlidersHorizontal } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { cn } from "@/lib/utils";

const BANDS = [
  { freq: 60, label: "60Hz" },
  { freq: 230, label: "230" },
  { freq: 910, label: "910" },
  { freq: 3600, label: "3.6k" },
  { freq: 14000, label: "14k" },
];

const PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0],
  "Bass Boost": [8, 5, 0, 0, 0],
  Vocal: [-2, 0, 4, 6, 2],
  Pop: [2, 4, 5, 4, 2],
  Rock: [5, 3, -2, 3, 6],
  Electronic: [6, 4, 0, 4, 7],
};

const STORAGE_KEY = "beatly:eq";

export function Equalizer() {
  const { audioRef } = usePlayer();
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const [gains, setGains] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return [0, 0, 0, 0, 0];
  });
  const [active, setActive] = useState(() => gains.some((g) => g !== 0));

  // Setup audio graph once when audio element is ready.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || ctxRef.current) return;

    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      const source = ctx.createMediaElementSource(audio);
      const filters = BANDS.map((b, i) => {
        const f = ctx.createBiquadFilter();
        f.type = i === 0 ? "lowshelf" : i === BANDS.length - 1 ? "highshelf" : "peaking";
        f.frequency.value = b.freq;
        f.Q.value = 1;
        f.gain.value = gains[i];
        return f;
      });
      // chain: source -> f0 -> f1 -> ... -> destination
      let prev: AudioNode = source;
      for (const f of filters) {
        prev.connect(f);
        prev = f;
      }
      prev.connect(ctx.destination);
      ctxRef.current = ctx;
      sourceRef.current = source;
      filtersRef.current = filters;
    } catch (e) {
      console.warn("EQ setup failed", e);
    }
  }, [audioRef, gains]);

  // Apply gains live
  useEffect(() => {
    filtersRef.current.forEach((f, i) => {
      f.gain.value = active ? gains[i] : 0;
    });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(gains)); } catch { /* ignore */ }
  }, [gains, active]);

  const setBand = (i: number, val: number) => {
    setGains((g) => {
      const next = [...g];
      next[i] = val;
      return next;
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-10 w-10", active && gains.some((g) => g !== 0) && "text-primary")}
          aria-label="Equalizer"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-popover border-border" align="center">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold">Equalizer</span>
          <Button
            size="sm"
            variant={active ? "default" : "outline"}
            onClick={() => setActive((a) => !a)}
            className="h-7 text-xs"
          >
            {active ? "ON" : "OFF"}
          </Button>
        </div>

        <div className="flex items-end justify-between gap-2 h-32 mb-3">
          {BANDS.map((b, i) => (
            <div key={b.freq} className="flex flex-col items-center gap-1 flex-1">
              <Slider
                orientation="vertical"
                value={[gains[i]]}
                min={-12}
                max={12}
                step={1}
                onValueChange={(v) => setBand(i, v[0])}
                className="h-24"
              />
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {gains[i] > 0 ? "+" : ""}{gains[i]}
              </span>
              <span className="text-[10px] text-muted-foreground">{b.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {Object.entries(PRESETS).map(([name, vals]) => (
            <Button
              key={name}
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px]"
              onClick={() => { setGains(vals); setActive(true); }}
            >
              {name}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
