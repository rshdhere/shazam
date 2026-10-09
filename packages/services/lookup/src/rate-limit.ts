import { rateLimitHits, type Database } from "@shazam/drizzle";
import { and, asc, eq, gt, lte } from "drizzle-orm";
import { createHash } from "node:crypto";

/** New Lookups one IP may start per window. */
export const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

function clientKey(clientIp: string) {
  return createHash("sha256").update(clientIp).digest("hex");
}

/** Counts new Lookups per IP over a sliding hour. */
export function createRateLimiter(db: Database, clock: () => Date) {
  return {
    /** Seconds until the IP may start another Lookup, or null if it may now. */
    async retryAfterSeconds(clientIp: string): Promise<number | null> {
      const now = clock().getTime();
      const hits = await db
        .select({ createdAt: rateLimitHits.createdAt })
        .from(rateLimitHits)
        .where(
          and(
            eq(rateLimitHits.clientKey, clientKey(clientIp)),
            gt(rateLimitHits.createdAt, new Date(now - WINDOW_MS)),
          ),
        )
        .orderBy(asc(rateLimitHits.createdAt))
        .limit(RATE_LIMIT);
      if (hits.length < RATE_LIMIT) return null;
      const oldest = hits[0]!.createdAt.getTime();
      return Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    },

    /** Counts a new Lookup against the IP and forgets its hits older than the window. */
    async record(clientIp: string) {
      const key = clientKey(clientIp);
      const now = clock();
      await db.insert(rateLimitHits).values({ clientKey: key, createdAt: now });
      await db
        .delete(rateLimitHits)
        .where(
          and(
            eq(rateLimitHits.clientKey, key),
            lte(rateLimitHits.createdAt, new Date(now.getTime() - WINDOW_MS)),
          ),
        );
    },
  };
}
