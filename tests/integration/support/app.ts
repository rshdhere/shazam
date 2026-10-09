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
type FakeExtractResult =
  | (Omit<Extract<ExtractResult, { ok: true }>, "platformTag"> & {
      platformTag?: Extract<ExtractResult, { ok: true }>["platformTag"];
    })
  | Extract<ExtractResult, { ok: false }>;

export function fakeExtractor(fake: FakeExtractResult) {
  const result: ExtractResult = fake.ok ? { platformTag: null, ...fake } : fake;
  const calls: string[] = [];
  const discarded: Clip[] = [];
  const extractor: Extractor = {
    async extract(link) {
      calls.push(link.url);
      return result;
    },
    async discard(clips) {
      discarded.push(...clips);
    },
  };
  return { extractor, calls, discarded };
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
  resolveRedirect?: (url: string) => Promise<string>;
}) {
  const db = drizzle({ client: new PGlite(), schema }) as unknown as Database;
  await migrate(db as never, { migrationsFolder });
  const started: string[] = [];
  const service = createLookupService({
    db,
    resolveRedirect: async (url) => url,
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
    /** Submits a Link, runs its Lookup to the end and returns it. */
    async submitAndRun(link: string, clientIp = "203.0.113.1") {
      const submitted = await service.submit(link, clientIp);
      if (!submitted.ok) throw new Error(submitted.error);
      await this.drain();
      return (await service.get(submitted.lookup.id))!;
    },
  };
}
