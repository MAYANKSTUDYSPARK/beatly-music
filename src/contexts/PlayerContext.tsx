/// <reference types="youtube" />
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "@/lib/music-api";

type RepeatMode = "off" | "all" | "one";

interface PlayerContextValue {
  current: Track | null;
  queue: Track[];
  index: number;
  isPlaying: boolean;
  progress: number; // 0-1
  currentTime: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (fraction: number) => void;
  setVolume: (v: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  registerPlayer: (p: YT.Player | null) => void;
  reportTime: (t: number, d: number) => void;
  reportState: (playing: boolean) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState<number>(() => {
    const v = localStorage.getItem("beatly:volume");
    return v ? Number(v) : 80;
  });
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const playerRef = useRef<YT.Player | null>(null);

  const current = index >= 0 && index < queue.length ? queue[index] : null;

  const registerPlayer = useCallback((p: YT.Player | null) => {
    playerRef.current = p;
    if (p && typeof p.setVolume === "function") {
      try { p.setVolume(volume); } catch { /* noop */ }
    }
  }, [volume]);

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

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo(); else p.playVideo();
  }, [isPlaying]);

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
    if (currentTime > 3) {
      playerRef.current?.seekTo(0, true);
      return;
    }
    setIndex((i) => (i - 1 >= 0 ? i - 1 : (repeat === "all" ? queue.length - 1 : 0)));
    setIsPlaying(true);
  }, [queue.length, currentTime, repeat]);

  const seekTo = useCallback((fraction: number) => {
    const p = playerRef.current;
    if (!p || !duration) return;
    p.seekTo(fraction * duration, true);
  }, [duration]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    localStorage.setItem("beatly:volume", String(v));
    playerRef.current?.setVolume(v);
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() => setRepeat((r) => r === "off" ? "all" : r === "all" ? "one" : "off"), []);

  const reportTime = useCallback((t: number, d: number) => {
    setCurrentTime(t);
    if (d) setDuration(d);
  }, []);

  const reportState = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  useEffect(() => {
    const handler = () => {
      if (repeat === "one") {
        playerRef.current?.seekTo(0, true);
        playerRef.current?.playVideo();
      } else {
        next();
      }
    };
    window.addEventListener("beatly:ended", handler);
    return () => window.removeEventListener("beatly:ended", handler);
  }, [next, repeat]);

  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      artwork: [
        { src: current.thumbnail, sizes: "512x512", type: "image/jpeg" },
      ],
    });
    navigator.mediaSession.setActionHandler("play", () => playerRef.current?.playVideo());
    navigator.mediaSession.setActionHandler("pause", () => playerRef.current?.pauseVideo());
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("previoustrack", prev);
  }, [current, next, prev]);

  const progress = duration ? currentTime / duration : 0;

  const value = useMemo<PlayerContextValue>(() => ({
    current, queue, index, isPlaying, progress, currentTime, duration,
    volume, shuffle, repeat,
    playTrack, togglePlay, next, prev, seekTo, setVolume,
    toggleShuffle, cycleRepeat, registerPlayer, reportTime, reportState,
  }), [current, queue, index, isPlaying, progress, currentTime, duration, volume, shuffle, repeat, playTrack, togglePlay, next, prev, seekTo, setVolume, toggleShuffle, cycleRepeat, registerPlayer, reportTime, reportState]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be inside PlayerProvider");
  return ctx;
}
