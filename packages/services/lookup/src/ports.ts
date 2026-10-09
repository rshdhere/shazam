import type { Clip, EngineName, Hit, Link } from "@shazam/types";

export type ExtractResult =
  | {
      ok: true;
      durationSeconds: number;
      /** What the platform labels the audio as, if anything. */
      platformTag: { title: string; artist: string | null } | null;
      clips: Clip[];
    }
  | { ok: false; reason: "unavailable" | "blocked" };

/** Fetches the media behind a Link and cuts Clips from it. */
export interface Extractor {
  extract(link: Link, lookupId: string): Promise<ExtractResult>;
  /** Deletes Clips once a Lookup no longer needs them. */
  discard(clips: Clip[]): Promise<void>;
}

/** A music recognition engine: hears at most one song per Clip. */
export interface RecognitionEngine {
  name: EngineName;
  identify(clip: Clip): Promise<Hit | null>;
}
