/// <reference types="youtube" />
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "@/lib/music-api";
import { getStreamUrl, getRelated } from "@/lib/music-api";
import { useNotifications } from "./NotificationsContext";

type RepeatMode = "off" | "all" | "one";

interface PlayerContextValue {
  current: Track | null;
  queue: Track[];
  index: number;
  isPlaying: boolean;
  isLoading: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  audioRef: React.RefObject<HTMLAudioElement>;
  streamUrl: string | null;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
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
  const { push: pushNotification } = useNotifications();
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRateState] = useState<number>(() => {
    const rate = Number(localStorage.getItem("beatly:playback-rate") || "1");
    return Number.isFinite(rate) && rate >= 0.75 && rate <= 1.5 ? rate : 1;
  });
  const [volume, setVolumeState] = useState<number>(() => {
    const v = localStorage.getItem("beatly:volume");
    return v ? Number(v) : 80;
  });
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const audioRef = useRef<HTMLAudioElement>(null);
  const loadingIdRef = useRef<string | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const lastNotifiedIdRef = useRef<string | null>(null);
  const errorRetryRef = useRef<{ id: string; count: number }>({ id: "", count: 0 });
  const stallRetryRef = useRef<{ id: string; count: number; at: number }>({ id: "", count: 0, at: 0 });

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
    // Podcast / direct stream override — no need to call edge function.
    if (current.streamOverride) {
      setIsLoading(false);
      setStreamUrl(current.streamOverride);
      consecutiveFailuresRef.current = 0;
      return;
    }
    getStreamUrl(current.id).then((url) => {
      if (cancelled || loadingIdRef.current !== current.id) return;
      setIsLoading(false);
      if (!url) {
        consecutiveFailuresRef.current += 1;
        setIsPlaying(false);
        pushNotification({
          title: "Stream unavailable",
          body: "Try another song or play a downloaded track.",
          image: current.thumbnail,
        });
      } else {
        consecutiveFailuresRef.current = 0;
        setStreamUrl(url);
      }
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [current, pushNotification]);

  // Notify on track change
  useEffect(() => {
    if (!current || lastNotifiedIdRef.current === current.id) return;
    lastNotifiedIdRef.current = current.id;
    pushNotification({
      title: `Now playing: ${current.title}`,
      body: current.artist,
      image: current.thumbnail,
    });
  }, [current, pushNotification]);

  // Auto-extend queue with related tracks
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
    consecutiveFailuresRef.current = 0;
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

  const setPlaybackRate = useCallback((rate: number) => {
    const safeRate = Math.min(1.5, Math.max(0.75, rate));
    setPlaybackRateState(safeRate);
    localStorage.setItem("beatly:playback-rate", String(safeRate));
    if (audioRef.current) audioRef.current.playbackRate = safeRate;
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() => setRepeat((r) => r === "off" ? "all" : r === "all" ? "one" : "off"), []);

  const handleEnded = useCallback(() => {
    if (repeat === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => undefined);
    } else {
      next();
    }
  }, [repeat, next]);

  // Media Session metadata (lock-screen controls + system notification)
  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: "Beatly",
      artwork: [96, 192, 256, 384, 512].map((s) => ({
        src: current.thumbnail, sizes: `${s}x${s}`, type: "image/jpeg",
      })),
    });
    navigator.mediaSession.setActionHandler("play", () => audioRef.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("previoustrack", prev);
    navigator.mediaSession.setActionHandler("seekto", (d) => {
      if (audioRef.current && d.seekTime != null) audioRef.current.currentTime = d.seekTime;
    });
  }, [current, next, prev]);

  // Keep lock-screen progress synced
  useEffect(() => {
    if (!("mediaSession" in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: audioRef.current?.playbackRate || 1,
        position: Math.min(currentTime, duration),
      });
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    } catch {/* some browsers throw */}
  }, [currentTime, duration, isPlaying]);

  const progress = duration ? currentTime / duration : 0;

  // Handle stream errors: retry in-place only. Never auto-switch tracks on network hiccups.
  const handleAudioError = useCallback(() => {
    const id = current?.id || "";
    const a = audioRef.current;
    // If we made it past 5s of real playback, the stream itself is fine —
    // ignore the transient error rather than skipping the song.
    if (a && a.currentTime > 5) return;
    if (errorRetryRef.current.id !== id) {
      errorRetryRef.current = { id, count: 0 };
    }
    if (errorRetryRef.current.count < 1 && a && streamUrl) {
      errorRetryRef.current.count += 1;
      a.load();
      a.play().catch(() => undefined);
      return;
    }
    setIsLoading(false);
    setIsPlaying(false);
    pushNotification({
      title: "Playback paused",
      body: "Network issue detected. Tap play to retry the same song.",
      image: current?.thumbnail,
    });
  }, [current, streamUrl, pushNotification]);

  const handleWaiting = useCallback(() => {
    const id = current?.id || "";
    const a = audioRef.current;
    if (!a || !id || !streamUrl) return;
    if (stallRetryRef.current.id !== id) stallRetryRef.current = { id, count: 0, at: 0 };
    const now = Date.now();
    if (stallRetryRef.current.count >= 2 || now - stallRetryRef.current.at < 3500) return;
    stallRetryRef.current = { id, count: stallRetryRef.current.count + 1, at: now };
    window.setTimeout(() => {
      if (audioRef.current && current?.id === id && isPlaying && audioRef.current.readyState < 3) {
        const resumeAt = audioRef.current.currentTime;
        audioRef.current.load();
        audioRef.current.currentTime = resumeAt;
        audioRef.current.play().catch(() => undefined);
      }
    }, 1800);
  }, [current, isPlaying, streamUrl]);

  const value = useMemo<PlayerContextValue>(() => ({
    current, queue, index, isPlaying, isLoading, progress, currentTime, duration,
    volume, shuffle, repeat, audioRef, streamUrl, playbackRate, setPlaybackRate,
    playTrack, togglePlay, next, prev, seekTo, setVolume,
    toggleShuffle, cycleRepeat, addToQueue,
  }), [current, queue, index, isPlaying, isLoading, progress, currentTime, duration, volume, shuffle, repeat, streamUrl, playbackRate, setPlaybackRate, playTrack, togglePlay, next, prev, seekTo, setVolume, toggleShuffle, cycleRepeat, addToQueue]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
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
          a.playbackRate = playbackRate;
        }}
        onCanPlay={() => { if (isPlaying) audioRef.current?.play().catch(() => undefined); }}
        onWaiting={handleWaiting}
        onStalled={handleWaiting}
        onError={handleAudioError}
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
