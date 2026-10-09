export type Platform = "youtube" | "instagram" | "x" | "pinterest" | "tiktok";

/** A Link reduced to the media it points to. */
export interface Link {
  platform: Platform;
  mediaId: string;
  url: string;
}

/** A short excerpt of audio cut from the media behind a Link. */
export interface Clip {
  url: string;
  offsetSeconds: number;
}

export type EngineName = "acrcloud" | "audd";

export interface Song {
  title: string;
  artist: string;
  album: string | null;
  artworkUrl: string | null;
  isrc: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  youtubeUrl: string | null;
}

/** What one engine recognised in one Clip. */
export interface Hit {
  song: Song;
  confidence: number;
  engine: EngineName;
}

/** A song recognised in the media behind a Link. */
export interface Match extends Song {
  timestampSeconds: number;
  confidence: number;
  engine: EngineName;
}

export type LookupStatus =
  "queued" | "fetching" | "listening" | "completed" | "failed";

export type FailureReason = "unavailable" | "blocked" | "engines_unavailable";

export interface Lookup {
  id: string;
  link: Link;
  status: LookupStatus;
  matches: Match[];
  failureReason: FailureReason | null;
  createdAt: Date;
  updatedAt: Date;
}
