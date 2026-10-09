import type { Clip, Link } from "@shazam/types";
import type { Extractor, ExtractResult } from "../ports";

export interface ClipPlan {
  maxClips: number;
  clipSeconds: number;
  skipSeconds: number;
}

/** Holds Clip audio somewhere engines can fetch it while a Lookup runs. */
export interface ClipStore {
  put(lookupId: string, index: number, audio: Uint8Array): Promise<string>;
  remove(urls: string[]): Promise<void>;
}

type ExtractorResponse =
  | {
      ok: true;
      durationSeconds: number;
      clips: { offsetSeconds: number; audioBase64: string }[];
    }
  | { ok: false; reason: "unavailable" | "blocked" };

/** Talks to the Python Extractor function over HTTP. */
export function createHttpExtractor(config: {
  endpoint: string;
  headers?: Record<string, string>;
  plan: ClipPlan;
  clipStore: ClipStore;
  fetch?: typeof fetch;
}): Extractor {
  const http = config.fetch ?? fetch;
  return {
    async extract(link: Link, lookupId: string): Promise<ExtractResult> {
      const res = await http(config.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", ...config.headers },
        body: JSON.stringify({ url: link.url, ...config.plan }),
      });
      if (!res.ok) throw new Error(`Extractor HTTP ${res.status}`);
      const body = (await res.json()) as ExtractorResponse;
      if (!body.ok) return body;
      const clips: Clip[] = await Promise.all(
        body.clips.map(async (c, i) => ({
          offsetSeconds: c.offsetSeconds,
          url: await config.clipStore.put(
            lookupId,
            i,
            Buffer.from(c.audioBase64, "base64"),
          ),
        })),
      );
      return { ok: true, durationSeconds: body.durationSeconds, clips };
    },
    async discard(clips: Clip[]) {
      await config.clipStore.remove(clips.map((c) => c.url));
    },
  };
}
