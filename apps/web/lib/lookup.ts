import "server-only";
import { createNeonDatabase } from "@shazam/drizzle/neon";
import {
  createAcrCloudEngine,
  createHttpExtractor,
  createLookupService,
  storeClipInBlob,
  type StoreClip,
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

/** Without a Blob store (local dev), Clips travel as data: URLs. */
const storeClipInline: StoreClip = async (_lookupId, _index, audio) =>
  `data:audio/mpeg;base64,${Buffer.from(audio).toString("base64")}`;

let db: ReturnType<typeof createNeonDatabase> | undefined;

export function lookupService(
  startRun: (lookupId: string) => Promise<void> = async () => {},
) {
  db ??= createNeonDatabase(required("DATABASE_URL"));
  return createLookupService({
    db,
    clock: () => new Date(),
    startRun,
    extractor: createHttpExtractor({
      endpoint: extractorEndpoint(),
      headers: extractorHeaders(),
      plan: { maxClips: 1, clipSeconds: 10, skipSeconds: 2 },
      storeClip: process.env.BLOB_READ_WRITE_TOKEN
        ? storeClipInBlob
        : storeClipInline,
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
