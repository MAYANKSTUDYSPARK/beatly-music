import type { AudioPlayerPlugin } from "@mediagrid/capacitor-native-audio";

export const NATIVE_AUDIO_ID = "beatverse-now-playing";

let nativeSupport: boolean | null = null;

export async function supportsNativeAudio(): Promise<boolean> {
  if (nativeSupport !== null) return nativeSupport;
  try {
    const { Capacitor } = await import("@capacitor/core");
    nativeSupport = Capacitor.isNativePlatform();
  } catch {
    nativeSupport = false;
  }
  return nativeSupport;
}

export async function getNativeAudioPlayer(): Promise<AudioPlayerPlugin | null> {
  if (!(await supportsNativeAudio())) return null;
  try {
    const { AudioPlayer } = await import("@mediagrid/capacitor-native-audio");
    return AudioPlayer;
  } catch {
    return null;
  }
}

export function isNativePlayableSource(source?: string | null): boolean {
  return !!source && /^(https?:\/\/|file:\/\/|capacitor:\/\/|content:\/\/)/i.test(source);
}