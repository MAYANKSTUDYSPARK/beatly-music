import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchTracks, getTrending, type Track } from "@/lib/music-api";
import { TrackCard } from "@/components/music/TrackCard";
import { useLibrary } from "@/contexts/LibraryContext";
import { Skeleton } from "@/components/ui/skeleton";

const SHORTCUTS = [
  { label: "Top Hindi", q: "Top Hindi songs 2024", grad: 1 },
  { label: "Punjabi", q: "Top Punjabi hits", grad: 2 },
  { label: "Arijit Singh", q: "Arijit Singh", grad: 3 },
  { label: "K-Pop / BTS", q: "BTS Blackpink K-pop", grad: 4 },
  { label: "English Pop", q: "Top English songs", grad: 5 },
  { label: "Lofi Chill", q: "Lofi chill India", grad: 6 },
  { label: "Workout", q: "Workout gym hits", grad: 1 },
  { label: "Romance", q: "Romantic Hindi songs", grad: 2 },
];

function useDeferredFetch<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fn().then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading };
}

const Home = () => {
  const { recent } = useLibrary();
  const trending = useDeferredFetch(() => getTrending("IN"));
  const hindi = useDeferredFetch(() => searchTracks("Top Bollywood hits 2024"));
  const punjabi = useDeferredFetch(() => searchTracks("Top Punjabi songs"));
  const english = useDeferredFetch(() => searchTracks("Top English songs 2024"));
  const kpop = useDeferredFetch(() => searchTracks("BTS Blackpink K-pop hits"));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="min-h-full bg-gradient-hero">
      <div className="px-4 sm:px-6 pt-6 pb-10 space-y-10 max-w-screen-2xl mx-auto">
        <header>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{greeting}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Stream millions of songs. Hindi, English, Punjabi, K-Pop and more.</p>
        </header>

        <section>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.label}
                to={`/search?q=${encodeURIComponent(s.q)}`}
                className={`group relative flex h-16 items-center overflow-hidden rounded-xl bg-vibe-${s.grad} px-4 hover:scale-[1.02] transition-bounce`}
              >
                <span className="text-sm font-bold text-white drop-shadow">{s.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {recent.length > 0 && <Row title="Recently played" tracks={recent.slice(0, 12)} loading={false} />}
        <Row title="Trending in India" tracks={trending.data ?? []} loading={trending.loading} />
        <Row title="Bollywood hits" tracks={hindi.data ?? []} loading={hindi.loading} />
        <Row title="Punjabi vibes" tracks={punjabi.data ?? []} loading={punjabi.loading} />
        <Row title="K-Pop & global" tracks={kpop.data ?? []} loading={kpop.loading} />
        <Row title="English top charts" tracks={english.data ?? []} loading={english.loading} />
      </div>
    </div>
  );
};

function Row({ title, tracks, loading }: { title: string; tracks: Track[]; loading: boolean }) {
  return (
    <section className="animate-fade-in">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No tracks found.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {tracks.slice(0, 12).map((t) => (
            <TrackCard key={t.id} track={t} queue={tracks} />
          ))}
        </div>
      )}
    </section>
  );
}

export default Home;
