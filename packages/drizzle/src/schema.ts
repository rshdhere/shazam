import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const lookups = pgTable(
  "lookups",
  {
    id: text("id").primaryKey(),
    platform: text("platform").notNull(),
    mediaId: text("media_id").notNull(),
    linkUrl: text("link_url").notNull(),
    status: text("status").notNull(),
    failureReason: text("failure_reason"),
    platformTagTitle: text("platform_tag_title"),
    platformTagArtist: text("platform_tag_artist"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("lookups_link_idx").on(t.platform, t.mediaId, t.createdAt),
    // At most one running Lookup per canonical Link.
    uniqueIndex("lookups_one_running_per_link")
      .on(t.platform, t.mediaId)
      .where(sql`${t.status} in ('queued', 'fetching', 'listening')`),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    lookupId: text("lookup_id")
      .notNull()
      .references(() => lookups.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    album: text("album"),
    artworkUrl: text("artwork_url"),
    isrc: text("isrc"),
    spotifyUrl: text("spotify_url"),
    appleMusicUrl: text("apple_music_url"),
    youtubeUrl: text("youtube_url"),
    timestampSeconds: real("timestamp_seconds").notNull(),
    confidence: real("confidence").notNull(),
    engine: text("engine").notNull(),
  },
  (t) => [index("matches_lookup_idx").on(t.lookupId)],
);

/** One row per new Lookup an IP started; reused and joined Lookups add none. */
export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    /** SHA-256 of the client IP, so raw addresses are never stored. */
    clientKey: text("client_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("rate_limit_hits_client_idx").on(t.clientKey, t.createdAt)],
);
