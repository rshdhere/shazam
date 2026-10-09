import type { Lookup } from "@shazam/types";

const HOUR = 60 * 60 * 1000;
/** Engine catalogues grow, so "no song recognised" deserves another try after a week. */
const NO_MATCH_REUSE_MS = 7 * 24 * HOUR;
/** Blocking and outages are usually temporary. */
const FAILED_REUSE_MS = HOUR;

export function isRunning(lookup: Lookup): boolean {
  return (
    lookup.status === "queued" ||
    lookup.status === "fetching" ||
    lookup.status === "listening"
  );
}

/** Whether a finished Lookup still answers for its Link, or a fresh one should run. */
export function isReusable(lookup: Lookup, now: Date): boolean {
  const age = now.getTime() - lookup.updatedAt.getTime();
  if (lookup.status === "failed") return age < FAILED_REUSE_MS;
  if (lookup.status === "completed")
    return lookup.matches.length > 0 || age < NO_MATCH_REUSE_MS;
  return false;
}

/** Postgres unique_violation, possibly wrapped by Drizzle. */
export function isUniqueViolation(error: unknown): boolean {
  for (
    let e: unknown = error;
    e && typeof e === "object";
    e = (e as { cause?: unknown }).cause
  ) {
    if ((e as { code?: unknown }).code === "23505") return true;
  }
  return false;
}
