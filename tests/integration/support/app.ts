import { PGlite } from "@electric-sql/pglite";
import { schema, type Database } from "@shazam/drizzle";
import { migrationsFolder } from "@shazam/drizzle/migrations";
import {
  createLookupService,
  type Extractor,
  type ExtractResult,
  type RecognitionEngine,
} from "@shazam/lookup";
import type { Clip, EngineName, Hit, Song } from "@shazam/types";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

export const RICK = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

export function song(
  title: string,
  artist = "Some Artist",
  extra: Partial<Song> = {},
): Song {
  return {
    title,
    artist,
    album: null,
    artworkUrl: null,
    isrc: null,
    spotifyUrl: null,
    appleMusicUrl: null,
    youtubeUrl: null,
    ...extra,
  };
}

export function clip(offsetSeconds: number): Clip {
  return { url: `https://blob.test/clip-${offsetSeconds}.mp3`, offsetSeconds };
}

/** An Extractor that always returns the given result and records calls. */
export function fakeExtractor(result: ExtractResult) {
  const calls: string[] = [];
  const extractor: Extractor = {
    async extract(link) {
      calls.push(link.url);
      return result;
    },
  };
  return { extractor, calls };
}

/** An engine that hears `songs[offset]` in the Clip at that offset. */
export function fakeEngine(
  name: EngineName,
  songs: Record<number, { song: Song; confidence?: number }>,
) {
  const calls: Clip[] = [];
  const engine: RecognitionEngine = {
    name,
    async identify(c): Promise<Hit | null> {
      calls.push(c);
      const heard = songs[c.offsetSeconds];
      return heard
        ? { song: heard.song, confidence: heard.confidence ?? 90, engine: name }
        : null;
    },
  };
  return { engine, calls };
}

export async function createTestApp(deps: {
  extractor: Extractor;
  engines: RecognitionEngine[];
}) {
  const db = drizzle({ client: new PGlite(), schema }) as unknown as Database;
  await migrate(db as never, { migrationsFolder });
  const started: string[] = [];
  const service = createLookupService({
    db,
    ...deps,
    clock: () => new Date(),
    startRun: async (lookupId) => {
      started.push(lookupId);
    },
  });
  return {
    service,
    /** Runs every Lookup started so far, like the background Workflow would. */
    async drain() {
      while (started.length) await service.run(started.shift()!);
    },
  };
}
