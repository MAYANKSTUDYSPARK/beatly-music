import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { LibraryProvider } from "@/contexts/LibraryContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { DownloadsProvider } from "@/contexts/DownloadsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { RecentTracker } from "@/components/player/RecentTracker";
import { InstallPrompt } from "@/components/InstallPrompt";
import { OfflineGate } from "@/components/OfflineGate";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Liked from "./pages/Liked";
import Playlist from "./pages/Playlist";
import Artist from "./pages/Artist";
import Podcasts from "./pages/Podcasts";
import Trending from "./pages/Trending";
import Downloads from "./pages/Downloads";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NotificationsProvider>
          <LibraryProvider>
            <DownloadsProvider>
              <PlayerProvider>
                <RecentTracker />
                <InstallPrompt />
                <OfflineGate />
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/trending" element={<Trending />} />
                    <Route path="/library" element={<Library />} />
                    <Route path="/liked" element={<Liked />} />
                    <Route path="/podcasts" element={<Podcasts />} />
                    <Route path="/downloads" element={<Downloads />} />
                    <Route path="/playlist/:id" element={<Playlist />} />
                    <Route path="/artist/:name" element={<Artist />} />
                  </Route>
                  <Route path="/index" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PlayerProvider>
            </DownloadsProvider>
          </LibraryProvider>
        </NotificationsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
