import { useEffect, useRef } from "react";
import { usePlayer } from "@/contexts/PlayerContext";

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<typeof YT> | null = null;
function loadYouTubeAPI(): Promise<typeof YT> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
  });
  return apiPromise;
}

export function YouTubePlayer() {
  const { current, isPlaying, registerPlayer, reportTime, reportState, volume } = usePlayer();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const intervalRef = useRef<number | null>(null);
  const currentIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadYouTubeAPI().then((YTApi) => {
      if (cancelled || !containerRef.current || playerRef.current) return;
      playerRef.current = new YTApi.Player(containerRef.current, {
        height: "1",
        width: "1",
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: () => {
            registerPlayer(playerRef.current);
            playerRef.current?.setVolume(volume);
          },
          onStateChange: (e) => {
            const s = e.data;
            if (s === YTApi.PlayerState.PLAYING) reportState(true);
            else if (s === YTApi.PlayerState.PAUSED) reportState(false);
            else if (s === YTApi.PlayerState.ENDED) {
              reportState(false);
              window.dispatchEvent(new Event("beatly:ended"));
            }
          },
        },
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load new track
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !current) return;
    if (currentIdRef.current === current.id) return;
    currentIdRef.current = current.id;
    try {
      p.loadVideoById(current.id);
    } catch { /* noop */ }
  }, [current]);

  // Play/pause sync
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !current) return;
    try {
      if (isPlaying) p.playVideo();
      else p.pauseVideo();
    } catch { /* noop */ }
  }, [isPlaying, current]);

  // Time tracking
  useEffect(() => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const t = p.getCurrentTime?.() ?? 0;
        const d = p.getDuration?.() ?? 0;
        reportTime(t, d);
      } catch { /* noop */ }
    }, 500);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [reportTime]);

  return (
    <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none" aria-hidden>
      <div ref={containerRef} />
    </div>
  );
}
