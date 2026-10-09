import type { Platform } from "@shazam/types";

export const PLATFORM_NAMES: Record<Platform, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  x: "X",
  pinterest: "Pinterest",
  tiktok: "TikTok",
};

/** 84.6 → "1:24" */
export function formatTimestamp(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** "https://www.youtube.com/watch?v=abc" → "youtube.com/watch?v=abc" */
export function shortLink(url: string) {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname}${u.search}`.replace(
      /\/$/,
      "",
    );
  } catch {
    return url;
  }
}
