import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { LibraryProvider } from "@/contexts/LibraryContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { RecentTracker } from "@/components/player/RecentTracker";
import { LoginDialog } from "@/components/auth/LoginDialog";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import Liked from "./pages/Liked";
import Playlist from "./pages/Playlist";
import Artist from "./pages/Artist";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationsProvider>
            <LibraryProvider>
              <PlayerProvider>
                <RecentTracker />
                <LoginDialog />
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/library" element={<Library />} />
                    <Route path="/liked" element={<Liked />} />
                    <Route path="/playlist/:id" element={<Playlist />} />
                    <Route path="/artist/:name" element={<Artist />} />
                  </Route>
                  <Route path="/index" element={<Navigate to="/" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PlayerProvider>
            </LibraryProvider>
          </NotificationsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
