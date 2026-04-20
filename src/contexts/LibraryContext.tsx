import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Track } from "@/lib/music-api";

export interface Playlist {
  id: string;
  name: string;
  cover?: string;
  tracks: Track[];
  createdAt: number;
}

interface LibraryContextValue {
  liked: Track[];
  recent: Track[];
  playlists: Playlist[];
  isLiked: (id: string) => boolean;
  toggleLike: (track: Track) => void;
  addRecent: (track: Track) => void;
  createPlaylist: (name: string) => Playlist;
  deletePlaylist: (id: string) => void;
  renamePlaylist: (id: string, name: string) => void;
  addToPlaylist: (id: string, track: Track) => void;
  removeFromPlaylist: (id: string, trackId: string) => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

const KEY = "beatly:library:v1";

interface Persisted {
  liked: Track[];
  recent: Track[];
  playlists: Playlist[];
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return { liked: [], recent: [], playlists: [] };
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(() => load());

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const isLiked = useCallback((id: string) => state.liked.some((t) => t.id === id), [state.liked]);

  const toggleLike = useCallback((track: Track) => {
    setState((s) => ({
      ...s,
      liked: s.liked.some((t) => t.id === track.id)
        ? s.liked.filter((t) => t.id !== track.id)
        : [track, ...s.liked],
    }));
  }, []);

  const addRecent = useCallback((track: Track) => {
    setState((s) => ({
      ...s,
      recent: [track, ...s.recent.filter((t) => t.id !== track.id)].slice(0, 30),
    }));
  }, []);

  const createPlaylist = useCallback((name: string) => {
    const pl: Playlist = { id: crypto.randomUUID(), name, tracks: [], createdAt: Date.now() };
    setState((s) => ({ ...s, playlists: [pl, ...s.playlists] }));
    return pl;
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setState((s) => ({ ...s, playlists: s.playlists.filter((p) => p.id !== id) }));
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    setState((s) => ({
      ...s,
      playlists: s.playlists.map((p) => (p.id === id ? { ...p, name } : p)),
    }));
  }, []);

  const addToPlaylist = useCallback((id: string, track: Track) => {
    setState((s) => ({
      ...s,
      playlists: s.playlists.map((p) =>
        p.id === id && !p.tracks.some((t) => t.id === track.id)
          ? { ...p, tracks: [...p.tracks, track], cover: p.cover ?? track.thumbnail }
          : p
      ),
    }));
  }, []);

  const removeFromPlaylist = useCallback((id: string, trackId: string) => {
    setState((s) => ({
      ...s,
      playlists: s.playlists.map((p) =>
        p.id === id ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) } : p
      ),
    }));
  }, []);

  const value = useMemo<LibraryContextValue>(() => ({
    liked: state.liked,
    recent: state.recent,
    playlists: state.playlists,
    isLiked, toggleLike, addRecent,
    createPlaylist, deletePlaylist, renamePlaylist,
    addToPlaylist, removeFromPlaylist,
  }), [state, isLiked, toggleLike, addRecent, createPlaylist, deletePlaylist, renamePlaylist, addToPlaylist, removeFromPlaylist]);

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be inside LibraryProvider");
  return ctx;
}
