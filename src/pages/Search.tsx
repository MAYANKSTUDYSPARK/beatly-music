import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { searchTracks, type Track } from "@/lib/music-api";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";
import { TrackRow } from "@/components/music/TrackRow";
import { Skeleton } from "@/components/ui/skeleton";

const SUGGESTIONS = [
  { label: "Hindi", q: "Top Hindi songs", grad: "vibe-1" },
  { label: "Punjabi", q: "Punjabi top hits", grad: "vibe-2" },
  { label: "English", q: "English top charts", grad: "vibe-3" },
  { label: "K-Pop", q: "BTS Blackpink", grad: "vibe-4" },
  { label: "Lofi", q: "Lofi chill", grad: "vibe-5" },
  { label: "Arijit", q: "Arijit Singh", grad: "vibe-6" },
  { label: "Workout", q: "Workout gym hits", grad: "vibe-1" },
  { label: "Romance", q: "Romantic Hindi", grad: "vibe-2" },
];

const Search = () => {
  const [params, setParams] = useSearchParams();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const r = await searchTracks(q, 30);
        if (!cancelled) setResults(r);
      } catch (e) {
        if (!cancelled) setError("Search service unavailable. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  useEffect(() => {
    if (query) setParams({ q: query }, { replace: true });
    else setParams({}, { replace: true });
  }, [query, setParams]);

  return (
    <div className="px-4 sm:px-6 py-6 max-w-screen-xl mx-auto">
      <div className="relative max-w-2xl">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Songs, artists, albums…"
          className="h-12 pl-10 text-base bg-card border-border"
        />
      </div>

      {!query.trim() ? (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-bold">Browse all</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => setQuery(s.q)}
                className={`group relative h-28 overflow-hidden rounded-xl bg-${s.grad} p-4 text-left hover:scale-[1.02] transition-bounce`}
              >
                <span className="text-lg font-extrabold text-white drop-shadow">{s.label}</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="mt-6">
          {loading && (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && results.length === 0 && (
            <p className="text-sm text-muted-foreground">No results for "{query}".</p>
          )}
          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {results.map((t, i) => (
                <TrackRow key={`${t.id}-${i}`} track={t} index={i} queue={results} showIndex />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default Search;
