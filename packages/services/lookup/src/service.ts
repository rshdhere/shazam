import { lookups, matches, type Database } from "@shazam/drizzle";
import type {
  Clip,
  FailureReason,
  Hit,
  Lookup,
  LookupStatus,
  Match,
} from "@shazam/types";
import { isShortLink, parseLink } from "@shazam/validators";
import { asc, eq } from "drizzle-orm";
import { mergeMatches } from "./merge";
import type { Extractor, RecognitionEngine } from "./ports";

export interface LookupServiceDeps {
  db: Database;
  extractor: Extractor;
  engines: RecognitionEngine[];
  clock: () => Date;
  /** Follows a short share link's redirects to the URL it points at. */
  resolveRedirect: (url: string) => Promise<string>;
  /** Hands a queued Lookup to the background runner. */
  startRun: (lookupId: string) => Promise<void>;
}

export type SubmitResult =
  { ok: true; lookup: Lookup } | { ok: false; error: "unsupported_link" };

export interface ClipResult {
  clip: Clip;
  hit: Hit | null;
}

export type LookupService = ReturnType<typeof createLookupService>;

export function createLookupService(deps: LookupServiceDeps) {
  const { db, extractor, engines, clock, startRun, resolveRedirect } = deps;

  async function setStatus(
    id: string,
    status: LookupStatus,
    failureReason: FailureReason | null = null,
  ) {
    await db
      .update(lookups)
      .set({ status, failureReason, updatedAt: clock() })
      .where(eq(lookups.id, id));
  }

  async function get(id: string): Promise<Lookup | null> {
    const [row] = await db.select().from(lookups).where(eq(lookups.id, id));
    if (!row) return null;
    const matchRows = await db
      .select()
      .from(matches)
      .where(eq(matches.lookupId, id))
      .orderBy(asc(matches.timestampSeconds));
    return {
      id: row.id,
      link: {
        platform: row.platform as Lookup["link"]["platform"],
        mediaId: row.mediaId,
        url: row.linkUrl,
      },
      status: row.status as LookupStatus,
      failureReason: row.failureReason as FailureReason | null,
      matches: matchRows.map(
        ({ id: _id, lookupId: _lookupId, ...m }): Match => ({
          ...m,
          engine: m.engine as Match["engine"],
        }),
      ),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async function canonicalLink(rawLink: string) {
    if (!isShortLink(rawLink)) return parseLink(rawLink);
    try {
      return parseLink(await resolveRedirect(rawLink.trim()));
    } catch {
      return null;
    }
  }

  async function submit(
    rawLink: string,
    _clientIp: string,
  ): Promise<SubmitResult> {
    const link = await canonicalLink(rawLink);
    if (!link) return { ok: false, error: "unsupported_link" };
    const id = crypto.randomUUID();
    const now = clock();
    await db.insert(lookups).values({
      id,
      platform: link.platform,
      mediaId: link.mediaId,
      linkUrl: link.url,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });
    await startRun(id);
    return { ok: true, lookup: (await get(id))! };
  }

  /** Step 1: fetch the media and cut Clips. Returns null when the Lookup failed. */
  async function extract(id: string): Promise<Clip[] | null> {
    const lookup = await get(id);
    if (!lookup) return null;
    await setStatus(id, "fetching");
    const result = await extractor.extract(lookup.link, id);
    if (!result.ok) {
      await setStatus(id, "failed", result.reason);
      return null;
    }
    await setStatus(id, "listening");
    return result.clips;
  }

  /** Step 2: ask each engine in order until one hears a song in the Clip. */
  async function recognise(clip: Clip): Promise<ClipResult> {
    for (const engine of engines) {
      const hit = await engine.identify(clip);
      if (hit) return { clip, hit };
    }
    return { clip, hit: null };
  }

  /** Step 3: merge per-Clip results into Matches and complete the Lookup. */
  async function complete(id: string, results: ClipResult[]) {
    const merged = mergeMatches(results);
    if (merged.length) {
      await db
        .insert(matches)
        .values(merged.map((m) => ({ lookupId: id, ...m })));
    }
    await setStatus(id, "completed");
    await extractor.discard(results.map((r) => r.clip));
  }

  async function fail(id: string, reason: FailureReason, clips: Clip[] = []) {
    await setStatus(id, "failed", reason);
    if (clips.length) await extractor.discard(clips);
  }

  /** Runs every step inline; the Workflow runs the same steps durably. */
  async function run(id: string) {
    const clips = await extract(id);
    if (!clips) return;
    const results: ClipResult[] = [];
    for (const clip of clips) results.push(await recognise(clip));
    await complete(id, results);
  }

  return { submit, get, extract, recognise, complete, fail, run };
}
