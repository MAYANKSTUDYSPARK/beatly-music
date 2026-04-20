import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { PlayerBar } from "@/components/player/PlayerBar";
import { YouTubePlayer } from "@/components/player/YouTubePlayer";
import { usePlayer } from "@/contexts/PlayerContext";
import { cn } from "@/lib/utils";

export function AppLayout() {
  const { current } = usePlayer();
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className={cn(
            "flex-1 overflow-y-auto rounded-none md:m-2 md:rounded-2xl bg-gradient-to-b from-secondary/40 to-background",
            current ? "pb-[152px] md:pb-[100px]" : "pb-[64px] md:pb-2"
          )}
        >
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <PlayerBar />
      <YouTubePlayer />
    </div>
  );
}
