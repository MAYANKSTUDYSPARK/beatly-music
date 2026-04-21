import { Bell, LogOut, User as UserIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useState } from "react";
import logo from "@/assets/beatly-logo.png";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function TopBar() {
  const { user, signOut, requireAuth } = useAuth();
  const { notifications, unreadCount, markAllRead, installPromptEvent, triggerInstall, canInstall } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const initials =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ").map((n) => n[0]).slice(0, 2).join("") ||
    user?.email?.[0]?.toUpperCase() || "?";
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) ?? undefined;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border/40 bg-background/80 px-3 py-2 backdrop-blur-xl sm:px-4">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 transition-smooth hover:opacity-80"
        aria-label="Beatly home"
      >
        <img src={logo} alt="Beatly" width={32} height={32} className="h-8 w-8" loading="lazy" />
        <span className="text-xl font-extrabold tracking-tight text-gradient-brand">Beatly</span>
      </button>

      <div className="flex items-center gap-1 sm:gap-2">
        {canInstall && (
          <Button
            variant="outline"
            size="sm"
            onClick={triggerInstall}
            className="hidden sm:inline-flex gap-1 border-primary/40 text-primary hover:bg-primary/10"
          >
            <Download className="h-4 w-4" /> Install App
          </Button>
        )}
        {canInstall && (
          <Button
            variant="ghost"
            size="icon"
            onClick={triggerInstall}
            className="sm:hidden h-9 w-9 text-primary"
            aria-label="Install app"
          >
            <Download className="h-5 w-5" />
          </Button>
        )}

        <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) markAllRead(); }}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 bg-popover border-border">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-semibold">Notifications</span>
              {notifications.length > 0 && (
                <span className="text-xs text-muted-foreground">{notifications.length} recent</span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No notifications yet 🎶
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 px-3 py-2.5 hover:bg-secondary/40 transition-smooth",
                      !n.read && "bg-secondary/20"
                    )}
                  >
                    {n.image && (
                      <img src={n.image} alt="" className="h-10 w-10 rounded object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{n.title}</div>
                      {n.body && <div className="text-xs text-muted-foreground truncate">{n.body}</div>}
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full hover:opacity-80 transition-smooth"
              aria-label="Account"
            >
              <Avatar className="h-9 w-9 border border-border">
                <AvatarImage src={avatarUrl} alt={user?.email ?? ""} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  {user ? initials : <UserIcon className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
            {user ? (
              <>
                <DropdownMenuLabel className="font-normal">
                  <div className="text-xs text-muted-foreground">Signed in as</div>
                  <div className="truncate text-sm font-medium">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/library")}>
                  Your Library
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/liked")}>
                  Liked Songs
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => requireAuth("Sign in to access your library")}>
                Sign in with Google
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
