import { useEffect, useState } from "react";
import { Flame, Loader2 } from "lucide-react";
import { getTrending, searchTracks, type Track } from "@/lib/music-api";
import { TrackCard } from "@/components/music/TrackCard";
import { Button } from "@/components/ui/button";

const REGIONS = [
  { code: "IN", label: "India" },
  { code: "US", label: "Global" },
  { code: "GB", label: "UK" },
  { code: "KR", label: "K-Pop" },
];

const CATEGORIES = [
  "Trending Bollywood",
  "Trending Punjabi",
  "Viral hits 2025",
  "Top hip-hop",
  "Top EDM",
  "Indie trending",
];

export default function Trending() {
  const [region, setRegion] = useState("IN");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [cats, setCats] = useState<Record<string, Track[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setTracks([]);
    getTrending(region).then((t) => { if (!cancelled) { setTracks(t); setLoading(false); } });
    return () => { cancelled = true; };
  }, [region]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(CATEGORIES.map((c) => searchTracks(c).then((t) => [c, t] as const))).then((entries) => {
      if (cancelled) return;
      setCats(Object.fromEntries(entries));
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-full">
      <div className="px-4 sm:px-6 pt-6 pb-10 space-y-8 max-w-screen-2xl mx-auto">
        <header className="animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2">
            <Flame className="h-8 w-8 text-primary animate-pulse" /> Trending Now
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Hottest songs, updated daily.</p>
        </header>

        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <Button
              key={r.code}
              variant={region === r.code ? "default" : "secondary"}
              size="sm"
              onClick={() => setRegion(r.code)}
            >
              {r.label}
            </Button>
          ))}
        </div>

        <section>
          <h2 className="mb-4 text-xl font-bold">Top trending in {REGIONS.find((r) => r.code === region)?.label}</h2>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {tracks.slice(0, 24).map((t) => <TrackCard key={t.id} track={t} queue={tracks} />)}
            </div>
          )}
        </section>

        {CATEGORIES.map((c) => (
          <section key={c} className="animate-fade-in">
            <h2 className="mb-4 text-xl font-bold">{c}</h2>
            {!cats[c] ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {cats[c].slice(0, 12).map((t) => <TrackCard key={t.id} track={t} queue={cats[c]} />)}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
