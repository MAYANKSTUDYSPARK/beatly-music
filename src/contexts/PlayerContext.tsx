/// <reference types="youtube" />
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "@/lib/music-api";
import { getStreamUrl, getRelated } from "@/lib/music-api";

type RepeatMode = "off" | "all" | "one";

interface PlayerContextValue {
  current: Track | null;
  queue: Track[];
  index: number;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number; // 0-1
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  audioRef: React.RefObject<HTMLAudioElement>;
  streamUrl: string | null;
  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (fraction: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (track: Track) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [volume, setVolumeState] = useState<number>(() => {
    const v = localStorage.getItem("beatly:volume");
    return v ? Number(v) : 80;
  });
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const audioRef = useRef<HTMLAudioElement>(null);
  const loadingIdRef = useRef<string | null>(null);

  const current = index >= 0 && index < queue.length ? queue[index] : null;

  // Load stream URL when current track changes
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    loadingIdRef.current = current.id;
    setIsLoading(true);
    setStreamUrl(null);
    setCurrentTime(0);
    setDuration(0);
    getStreamUrl(current.id).then((url) => {
      if (cancelled || loadingIdRef.current !== current.id) return;
      setStreamUrl(url);
      setIsLoading(false);
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [current]);

  // Auto-extend queue with related tracks when nearing end
  useEffect(() => {
    if (!current || queue.length - index > 3) return;
    let cancelled = false;
    getRelated(current.id).then((related) => {
      if (cancelled || related.length === 0) return;
      setQueue((q) => {
        const existing = new Set(q.map((t) => t.id));
        const fresh = related.filter((t) => !existing.has(t.id));
        return fresh.length ? [...q, ...fresh] : q;
      });
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [current, index, queue.length]);

  const playTrack = useCallback((track: Track, newQueue?: Track[]) => {
    if (newQueue && newQueue.length) {
      const i = newQueue.findIndex((t) => t.id === track.id);
      setQueue(newQueue);
      setIndex(i >= 0 ? i : 0);
    } else {
      setQueue((q) => {
        const existing = q.findIndex((t) => t.id === track.id);
        if (existing >= 0) {
          setIndex(existing);
          return q;
        }
        const nq = [...q, track];
        setIndex(nq.length - 1);
        return nq;
      });
    }
    setIsPlaying(true);
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((q) => (q.some((t) => t.id === track.id) ? q : [...q, track]));
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => undefined);
    else a.pause();
  }, []);

  const next = useCallback(() => {
    if (!queue.length) return;
    if (shuffle) {
      let n = Math.floor(Math.random() * queue.length);
      if (queue.length > 1 && n === index) n = (n + 1) % queue.length;
      setIndex(n);
    } else {
      setIndex((i) => (i + 1 < queue.length ? i + 1 : (repeat === "all" ? 0 : i)));
    }
    setIsPlaying(true);
  }, [queue.length, shuffle, index, repeat]);

  const prev = useCallback(() => {
    if (!queue.length) return;
    if (currentTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      return;
    }
    setIndex((i) => (i - 1 >= 0 ? i - 1 : (repeat === "all" ? queue.length - 1 : 0)));
    setIsPlaying(true);
  }, [queue.length, currentTime, repeat]);

  const seekTo = useCallback((fraction: number) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = fraction * duration;
  }, [duration]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    localStorage.setItem("beatly:volume", String(v));
    if (audioRef.current) audioRef.current.volume = v / 100;
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() => setRepeat((r) => r === "off" ? "all" : r === "all" ? "one" : "off"), []);

  // Handle ended
  const handleEnded = useCallback(() => {
    if (repeat === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => undefined);
    } else {
      next();
    }
  }, [repeat, next]);

  // Media Session metadata
  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      artwork: [{ src: current.thumbnail, sizes: "512x512", type: "image/jpeg" }],
    });
    navigator.mediaSession.setActionHandler("play", () => audioRef.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("previoustrack", prev);
  }, [current, next, prev]);

  const progress = duration ? currentTime / duration : 0;

  const value = useMemo<PlayerContextValue>(() => ({
    current, queue, index, isPlaying, isLoading, progress, currentTime, duration,
    volume, shuffle, repeat, audioRef, streamUrl,
    playTrack, togglePlay, next, prev, seekTo, setVolume,
    toggleShuffle, cycleRepeat, addToQueue,
  }), [current, queue, index, isPlaying, isLoading, progress, currentTime, duration, volume, shuffle, repeat, streamUrl, playTrack, togglePlay, next, prev, seekTo, setVolume, toggleShuffle, cycleRepeat, addToQueue]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* Hidden audio element controlled by the context */}
      <audio
        ref={audioRef}
        src={streamUrl ?? undefined}
        autoPlay={isPlaying}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onTimeUpdate={(e) => setCurrentTime((e.currentTarget as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => {
          const a = e.currentTarget as HTMLAudioElement;
          setDuration(a.duration || 0);
          a.volume = volume / 100;
        }}
        onCanPlay={() => { if (isPlaying) audioRef.current?.play().catch(() => undefined); }}
        onError={() => { setIsLoading(false); next(); }}
        crossOrigin="anonymous"
        preload="auto"
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be inside PlayerProvider");
  return ctx;
}
