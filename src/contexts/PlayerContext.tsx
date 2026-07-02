/// <reference types="youtube" />
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Track } from "@/lib/music-api";
import { getStreamUrl, getRelated, getInlineStreamUrl } from "@/lib/music-api";
import { useNotifications } from "./NotificationsContext";

type RepeatMode = "off" | "all" | "one";

type YouTubeWindow = typeof window & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  YT?: any;
  onYouTubeIframeAPIReady?: () => void;
};

type YouTubeState = {
  videoId: string;
  src: string;
};

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  const w = window as YouTubeWindow;
  if (w.YT?.Player) return Promise.resolve();
  if (!youtubeApiPromise) {
    youtubeApiPromise = new Promise((resolve) => {
      const previous = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        document.head.appendChild(tag);
      }
    });
  }
  return youtubeApiPromise;
}

function youtubeEmbedUrl(videoId: string): string {
  const url = new URL(`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`);
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("enablejsapi", "1");
  url.searchParams.set("controls", "0");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("origin", window.location.origin);
  return url.toString();
}

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
  clearQueue: () => void;
  removeFromQueue: (queueIndex: number) => void;
  stop: () => void;
  skipBy: (seconds: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { push: pushNotification, systemPermission, requestSystemPermission } = useNotifications();
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [youtubeState, setYoutubeState] = useState<YouTubeState | null>(null);
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
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const youtubePlayerRef = useRef<any | null>(null);
  const loadingIdRef = useRef<string | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const lastNotifiedIdRef = useRef<string | null>(null);
  const errorRetryRef = useRef<{ id: string; count: number }>({ id: "", count: 0 });
  const stallRetryRef = useRef<{ id: string; count: number; at: number }>({ id: "", count: 0, at: 0 });
  const handleEndedRef = useRef<() => void>(() => undefined);
  const isPlayingRef = useRef(false);
  const audioFallbackRef = useRef<string | null>(null);
  const fallbackObjectUrlRef = useRef<string | null>(null);

  const current = index >= 0 && index < queue.length ? queue[index] : null;

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Load stream URL when current track changes
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    loadingIdRef.current = current.id;
    setIsLoading(true);
    setStreamUrl(null);
    setCurrentTime(0);
    setDuration(0);
    errorRetryRef.current = { id: current.id, count: 0 };
    stallRetryRef.current = { id: current.id, count: 0, at: 0 };
    audioFallbackRef.current = null;
    if (fallbackObjectUrlRef.current) {
      URL.revokeObjectURL(fallbackObjectUrlRef.current);
      fallbackObjectUrlRef.current = null;
    }
    setYoutubeState(null);
    youtubePlayerRef.current?.stopVideo?.();
    // Podcast / direct stream override — no need to call edge function.
    if (current.streamOverride) {
      setIsLoading(false);
      setStreamUrl(current.streamOverride);
      consecutiveFailuresRef.current = 0;
      return;
    }
    // Songs use the official YouTube iframe as the instant playback path. The audio
    // extraction API is still warmed in the background for downloads, but playback
    // must never fail just because public stream proxies are blocked.
    setIsLoading(false);
    setYoutubeState({ videoId: current.id, src: youtubeEmbedUrl(current.id) });
    consecutiveFailuresRef.current = 0;
    getStreamUrl(current.id).then((url) => {
      if (cancelled || loadingIdRef.current !== current.id) return;
      if (url) consecutiveFailuresRef.current = 0;
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [current]);

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
    if (systemPermission === "default") requestSystemPermission().catch(() => undefined);
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
  }, [systemPermission, requestSystemPermission]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((q) => (q.some((t) => t.id === track.id) ? q : [...q, track]));
  }, []);

  const togglePlay = useCallback(() => {
    if (youtubeState && youtubePlayerRef.current) {
      const state = youtubePlayerRef.current.getPlayerState?.();
      if (state === 1) youtubePlayerRef.current.pauseVideo();
      else youtubePlayerRef.current.playVideo();
      return;
    }
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => undefined);
    else a.pause();
  }, [youtubeState]);

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
    if (youtubeState && youtubePlayerRef.current && duration) {
      youtubePlayerRef.current.seekTo(fraction * duration, true);
      return;
    }
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = fraction * duration;
  }, [duration, youtubeState]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    localStorage.setItem("beatly:volume", String(v));
    if (audioRef.current) audioRef.current.volume = v / 100;
    youtubePlayerRef.current?.setVolume(v);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    const safeRate = Math.min(1.5, Math.max(0.75, rate));
    setPlaybackRateState(safeRate);
    localStorage.setItem("beatly:playback-rate", String(safeRate));
    if (audioRef.current) audioRef.current.playbackRate = safeRate;
    youtubePlayerRef.current?.setPlaybackRate?.(safeRate);
  }, []);

  const toggleShuffle = useCallback(() => setShuffle((s) => !s), []);
  const cycleRepeat = useCallback(() => setRepeat((r) => r === "off" ? "all" : r === "all" ? "one" : "off"), []);

  const clearQueue = useCallback(() => {
    setQueue(current ? [current] : []);
    setIndex(current ? 0 : -1);
  }, [current]);

  const removeFromQueue = useCallback((queueIndex: number) => {
    setQueue((q) => {
      if (queueIndex < 0 || queueIndex >= q.length) return q;
      const nextQueue = q.filter((_, i) => i !== queueIndex);
      setIndex((i) => {
        if (nextQueue.length === 0) return -1;
        if (queueIndex < i) return i - 1;
        if (queueIndex === i) return Math.min(i, nextQueue.length - 1);
        return i;
      });
      return nextQueue;
    });
  }, []);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    youtubePlayerRef.current?.stopVideo?.();
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const skipBy = useCallback((seconds: number) => {
    if (youtubeState && youtubePlayerRef.current) {
      const nextTime = Math.min(Math.max((youtubePlayerRef.current.getCurrentTime?.() || 0) + seconds, 0), duration || Number.MAX_SAFE_INTEGER);
      youtubePlayerRef.current.seekTo(nextTime, true);
      setCurrentTime(nextTime);
      return;
    }
    const a = audioRef.current;
    if (!a) return;
    const nextTime = Math.min(Math.max(a.currentTime + seconds, 0), duration || Number.MAX_SAFE_INTEGER);
    a.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, [duration, youtubeState]);

  const handleEnded = useCallback(() => {
    if (youtubeState) {
      if (repeat === "one" && youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(0, true);
        youtubePlayerRef.current.playVideo();
      } else {
        next();
      }
      return;
    }
    const actualTime = audioRef.current?.currentTime || currentTime;
    const actualDuration = audioRef.current?.duration || duration || current?.duration || 0;
    const expectedDuration = duration || current?.duration || 0;
    if (expectedDuration > 0 && actualDuration > 0 && actualTime < Math.min(expectedDuration, actualDuration) - 2) {
      setIsPlaying(false);
      pushNotification({
        title: "Playback paused",
        body: "Stream ended early. Tap play to resume this same song.",
        image: current?.thumbnail,
      });
      return;
    }
    if (repeat === "one" && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => undefined);
    } else {
      next();
    }
  }, [repeat, next, duration, current, currentTime, pushNotification, youtubeState]);

  useEffect(() => {
    handleEndedRef.current = handleEnded;
  }, [handleEnded]);

  const switchToAudioFallback = useCallback(async () => {
    if (!current || current.streamOverride) return;
    const fallbackUrl = getInlineStreamUrl(
      current.id,
      `${current.artist} ${current.title}`
    );
    if (audioFallbackRef.current === fallbackUrl) return;
    audioFallbackRef.current = fallbackUrl;
    youtubePlayerRef.current?.stopVideo?.();
    setYoutubeState(null);
    setIsLoading(true);
    try {
      const res = await fetch(fallbackUrl);
      if (!res.ok) throw new Error("fallback stream failed");
      const blob = await res.blob();
      if (blob.size < 1024) throw new Error("empty fallback stream");
      if (fallbackObjectUrlRef.current) URL.revokeObjectURL(fallbackObjectUrlRef.current);
      const objectUrl = URL.createObjectURL(blob);
      fallbackObjectUrlRef.current = objectUrl;
      setStreamUrl(objectUrl);
      setDuration(current.duration || 0);
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
      pushNotification({
        title: "Playback issue",
        body: "This track is restricted. Try another result.",
        image: current.thumbnail,
      });
    } finally {
      setIsLoading(false);
    }
  }, [current, pushNotification]);

  // Official YouTube iframe fallback for songs. This keeps playback working even
  // when public audio stream proxies return LOGIN_REQUIRED/403/502.
  useEffect(() => {
    if (!youtubeState) {
      youtubePlayerRef.current?.destroy?.();
      youtubePlayerRef.current = null;
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    loadYouTubeIframeApi().then(() => {
      if (cancelled || !youtubeIframeRef.current) return;
      youtubePlayerRef.current?.destroy?.();
      const w = window as YouTubeWindow;
      youtubePlayerRef.current = new w.YT!.Player(youtubeIframeRef.current, {
        events: {
          onReady: (event) => {
            if (cancelled) return;
            setIsLoading(false);
            event.target.setVolume(volume);
            event.target.setPlaybackRate?.(playbackRate);
            const d = event.target.getDuration?.() || 0;
            if (d) setDuration(d);
            if (isPlayingRef.current) event.target.playVideo();
          },
          onStateChange: (event) => {
            if (event.data === 0) handleEndedRef.current();
            if (event.data === 1) {
              setIsPlaying(true);
              setIsLoading(false);
              const d = event.target.getDuration?.() || 0;
              if (d) setDuration(d);
            }
            if (event.data === 2) {
              setIsPlaying(false);
              setIsLoading(false);
            }
            if (event.data === 3) setIsLoading(true);
          },
          onError: () => {
            switchToAudioFallback();
          },
        },
      });
    }).catch(() => {
      switchToAudioFallback();
    });
    const watchdog = window.setTimeout(() => {
      const player = youtubePlayerRef.current;
      const state = player?.getPlayerState?.();
      const position = player?.getCurrentTime?.() || 0;
      if (!cancelled && isPlayingRef.current && state !== 1 && position < 0.5) {
        switchToAudioFallback();
      }
    }, 6500);
    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
    };
  }, [youtubeState?.videoId, youtubeState?.src, switchToAudioFallback]);

  useEffect(() => {
    if (!youtubeState) return;
    const timer = window.setInterval(() => {
      const player = youtubePlayerRef.current;
      if (!player) return;
      const t = player.getCurrentTime?.() || 0;
      const d = player.getDuration?.() || 0;
      setCurrentTime(t);
      if (d) setDuration(d);
    }, 500);
    return () => window.clearInterval(timer);
  }, [youtubeState]);

  useEffect(() => {
    if (!youtubeState || !youtubePlayerRef.current) return;
    if (isPlaying) youtubePlayerRef.current.playVideo();
    else youtubePlayerRef.current.pauseVideo();
  }, [youtubeState, isPlaying]);

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
    navigator.mediaSession.setActionHandler("play", () => {
      if (youtubePlayerRef.current) youtubePlayerRef.current.playVideo();
      else audioRef.current?.play();
    });
    navigator.mediaSession.setActionHandler("pause", () => {
      if (youtubePlayerRef.current) youtubePlayerRef.current.pauseVideo();
      else audioRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler("stop", stop);
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("previoustrack", prev);
    navigator.mediaSession.setActionHandler("seekbackward", (d) => skipBy(-(d.seekOffset || 10)));
    navigator.mediaSession.setActionHandler("seekforward", (d) => skipBy(d.seekOffset || 10));
    navigator.mediaSession.setActionHandler("seekto", (d) => {
      if (d.seekTime == null) return;
      if (youtubePlayerRef.current) youtubePlayerRef.current.seekTo(d.seekTime, true);
      else if (audioRef.current) audioRef.current.currentTime = d.seekTime;
    });
  }, [current, next, prev, stop, skipBy]);

  // Keep lock-screen progress synced
  useEffect(() => {
    if (!("mediaSession" in navigator) || !duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate,
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
    toggleShuffle, cycleRepeat, addToQueue, clearQueue, removeFromQueue, stop, skipBy,
  }), [current, queue, index, isPlaying, isLoading, progress, currentTime, duration, volume, shuffle, repeat, streamUrl, playbackRate, setPlaybackRate, playTrack, togglePlay, next, prev, seekTo, setVolume, toggleShuffle, cycleRepeat, addToQueue, clearQueue, removeFromQueue, stop, skipBy]);

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
        preload="auto"
      />
      {youtubeState && (
        <div className="fixed left-[-9999px] top-0 h-px w-px overflow-hidden" aria-hidden="true">
          <iframe
            key={youtubeState.videoId}
            ref={youtubeIframeRef}
            title="Beatly backup player"
            src={youtubeState.src}
            allow="autoplay; encrypted-media"
            className="h-px w-px"
          />
        </div>
      )}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be inside PlayerProvider");
  return ctx;
}
