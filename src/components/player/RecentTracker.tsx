import { useEffect } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useLibrary } from "@/contexts/LibraryContext";

/** Tracks the currently playing song into "Recently played". */
export function RecentTracker() {
  const { current } = usePlayer();
  const { addRecent } = useLibrary();
  useEffect(() => {
    if (current) addRecent(current);
  }, [current, addRecent]);
  return null;
}
