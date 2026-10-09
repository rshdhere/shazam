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

/** The song name the hosting platform itself attaches to the media. */
export interface PlatformTag {
  platform: Platform;
  title: string;
  artist: string | null;
}

export type LookupStatus =
  "queued" | "fetching" | "listening" | "completed" | "failed";

/** Statuses of a Lookup still at work; at most one per Link at a time. */
export const RUNNING_STATUSES = [
  "queued",
  "fetching",
  "listening",
] as const satisfies readonly LookupStatus[];

/** What the visitor sees the Lookup doing: its status, with finished ones as "done". */
export type LookupStage = (typeof RUNNING_STATUSES)[number] | "done";

export function stageOf(status: LookupStatus): LookupStage {
  return (RUNNING_STATUSES as readonly LookupStatus[]).includes(status)
    ? (status as LookupStage)
    : "done";
}

/** Why the Extractor refused a Link's media. */
export type ExtractFailureReason = "unavailable" | "blocked" | "too_long";

export type FailureReason =
  | ExtractFailureReason
  /** Our Extractor itself kept erroring or timing out. */
  | "extractor_unavailable"
  | "engines_unavailable";

export interface Lookup {
  id: string;
  link: Link;
  status: LookupStatus;
  matches: Match[];
  platformTag: PlatformTag | null;
  failureReason: FailureReason | null;
  createdAt: Date;
  updatedAt: Date;
}
