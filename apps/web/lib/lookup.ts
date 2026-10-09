import "server-only";
import { createNeonDatabase } from "@shazam/drizzle/neon";
import {
  createAcrCloudEngine,
  createHttpExtractor,
  createLookupService,
  blobClipStore,
  followRedirects,
  inlineClipStore,
} from "@shazam/lookup";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (run scripts/setup.sh)`);
  return value;
}

/** The Python Extractor on this deployment, or a local one in development. */
function extractorEndpoint(): string {
  if (process.env.EXTRACTOR_URL) return process.env.EXTRACTOR_URL;
  const host =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_URL;
  return host ? `https://${host}/api/extract` : "http://localhost:3001";
}

function extractorHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (process.env.EXTRACTOR_SECRET)
    headers.authorization = `Bearer ${process.env.EXTRACTOR_SECRET}`;
  // Lets server-side calls through Deployment Protection on preview URLs.
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers["x-vercel-protection-bypass"] =
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  return headers;
}

let db: ReturnType<typeof createNeonDatabase> | undefined;

export function lookupService(
  startRun: (lookupId: string) => Promise<void> = async () => {},
) {
  db ??= createNeonDatabase(required("DATABASE_URL"));
  return createLookupService({
    db,
    clock: () => new Date(),
    startRun,
    resolveRedirect: (url) => followRedirects(url),
    extractor: createHttpExtractor({
      endpoint: extractorEndpoint(),
      headers: extractorHeaders(),
      plan: { maxClips: 5, clipSeconds: 10, skipSeconds: 2 },
      clipStore: process.env.BLOB_READ_WRITE_TOKEN
        ? blobClipStore
        : inlineClipStore,
    }),
    engines: [
      createAcrCloudEngine({
        host: required("ACRCLOUD_HOST"),
        accessKey: required("ACRCLOUD_ACCESS_KEY"),
        accessSecret: required("ACRCLOUD_ACCESS_SECRET"),
      }),
    ],
  });
}
