import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.beatverse.music",
  appName: "BeatVerse",
  webDir: "dist",
  server: {
    url: "https://53d60981-60be-435b-a504-700ebd15a3e8.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#1ED760",
      sound: "default",
    },
  },
};

export default config;