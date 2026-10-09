import { createHttpExtractor } from "@shazam/lookup";
import { describe, expect, it } from "vitest";
import { json, replayFetch } from "./support/fetch";

const plan = {
  maxClips: 5,
  clipSeconds: 10,
  skipSeconds: 2,
  maxDurationSeconds: 600,
};
const clipStore = {
  async put(lookupId: string, index: number) {
    return `https://blob.test/${lookupId}/${index}.mp3`;
  },
  async remove() {},
};

describe("HTTP Extractor", () => {
  it("tells the Extractor the platform, so it can pick that platform's cookies", async () => {
    const { fetch, requests } = replayFetch({
      "https://extractor.test/": json({ ok: false, reason: "blocked" }),
    });
    const extractor = createHttpExtractor({
      endpoint: "https://extractor.test/api/extract",
      plan,
      clipStore,
      fetch,
    });

    const result = await extractor.extract(
      {
        platform: "instagram",
        mediaId: "C9xYz12AbCd",
        url: "https://www.instagram.com/p/C9xYz12AbCd/",
      },
      "lookup-1",
    );

    expect(result).toEqual({ ok: false, reason: "blocked" });
    expect(JSON.parse(String(requests[0]!.init!.body))).toEqual({
      url: "https://www.instagram.com/p/C9xYz12AbCd/",
      platform: "instagram",
      ...plan,
    });
  });
});
