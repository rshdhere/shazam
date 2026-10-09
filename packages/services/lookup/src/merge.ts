import type { Match } from "@shazam/types";
import type { ClipResult } from "./service";

/** Two Hits are the same song when their ISRCs match, else their title and artist. */
function songKey({ song }: NonNullable<ClipResult["hit"]>): string {
  if (song.isrc) return `isrc:${song.isrc.toUpperCase()}`;
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return `name:${norm(song.title)}|${norm(song.artist)}`;
}

/**
 * The Match merge rule: one Match per distinct song, placed at its earliest
 * timestamp with its highest confidence, ordered by timestamp.
 */
export function mergeMatches(results: ClipResult[]): Match[] {
  const bySong = new Map<string, Match>();
  const ordered = [...results].sort(
    (a, b) => a.clip.offsetSeconds - b.clip.offsetSeconds,
  );
  for (const { clip, hit } of ordered) {
    if (!hit) continue;
    const key = songKey(hit);
    const existing = bySong.get(key);
    if (existing) {
      existing.confidence = Math.max(existing.confidence, hit.confidence);
    } else {
      bySong.set(key, {
        ...hit.song,
        timestampSeconds: clip.offsetSeconds,
        confidence: hit.confidence,
        engine: hit.engine,
      });
    }
  }
  return [...bySong.values()];
}
