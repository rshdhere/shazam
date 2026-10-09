import type { RecognitionEngine } from "@shazam/lookup";
import type { EngineName } from "@shazam/types";
import { describe, expect, it } from "vitest";
import {
  clip,
  createTestApp,
  fakeEngine,
  fakeExtractor,
  RICK,
  song,
} from "./support/app";

/** An engine whose service is down: it throws `failures` times, then hears nothing. */
function downEngine(name: EngineName, failures = Infinity) {
  let calls = 0;
  const engine: RecognitionEngine = {
    name,
    async identify() {
      calls++;
      if (calls <= failures) throw new Error(`${name} HTTP 503`);
      return null;
    },
  };
  return { engine, calls: () => calls };
}

const twoClips = {
  ok: true as const,
  durationSeconds: 60,
  clips: [clip(2), clip(30)],
};

describe("Media the Extractor cannot use", () => {
  it.each(["unavailable", "blocked", "too_long"] as const)(
    "fails the Lookup as %s without listening",
    async (reason) => {
      const { extractor } = fakeExtractor({ ok: false, reason });
      const { engine, calls } = fakeEngine("acrcloud", {});
      const app = await createTestApp({ extractor, engines: [engine] });

      const lookup = await app.submitAndRun(RICK);

      expect(lookup.status).toBe("failed");
      expect(lookup.failureReason).toBe(reason);
      expect(lookup.matches).toEqual([]);
      expect(calls).toEqual([]);
    },
  );

  it("fails as unavailable when the Extractor itself errors", async () => {
    const { engine } = fakeEngine("acrcloud", {});
    const app = await createTestApp({
      extractor: {
        async extract() {
          throw new Error("Extractor HTTP 500");
        },
        async discard() {},
      },
      engines: [engine],
    });

    const lookup = await app.submitAndRun(RICK);

    expect(lookup.status).toBe("failed");
    expect(lookup.failureReason).toBe("unavailable");
  });
});

describe("Recognition engines that are down", () => {
  it("fails the Lookup as engines_unavailable when every engine stays down after retries", async () => {
    const { extractor, discarded } = fakeExtractor(twoClips);
    const acr = downEngine("acrcloud");
    const audd = downEngine("audd");
    const app = await createTestApp({
      extractor,
      engines: [acr.engine, audd.engine],
    });

    const lookup = await app.submitAndRun(RICK);

    expect(lookup.status).toBe("failed");
    expect(lookup.failureReason).toBe("engines_unavailable");
    expect(lookup.matches).toEqual([]);
    expect(acr.calls()).toBeGreaterThan(1);
    expect(discarded).toEqual(twoClips.clips);
  });

  it("recovers when an engine is down only briefly", async () => {
    const { extractor } = fakeExtractor({ ...twoClips, clips: [clip(2)] });
    let calls = 0;
    const flaky: RecognitionEngine = {
      name: "acrcloud",
      async identify() {
        if (++calls === 1) throw new Error("acrcloud HTTP 503");
        return {
          song: song("Never Gonna Give You Up", "Rick Astley"),
          confidence: 100,
          engine: "acrcloud",
        };
      },
    };
    const app = await createTestApp({ extractor, engines: [flaky] });

    const lookup = await app.submitAndRun(RICK);

    expect(lookup.status).toBe("completed");
    expect(lookup.matches.map((m) => m.title)).toEqual([
      "Never Gonna Give You Up",
    ]);
  });

  it("uses the fallback engine while the primary is down", async () => {
    const { extractor } = fakeExtractor({ ...twoClips, clips: [clip(2)] });
    const acr = downEngine("acrcloud");
    const { engine: audd } = fakeEngine("audd", {
      2: { song: song("Never Gonna Give You Up", "Rick Astley") },
    });
    const app = await createTestApp({ extractor, engines: [acr.engine, audd] });

    const lookup = await app.submitAndRun(RICK);

    expect(lookup.status).toBe("completed");
    expect(lookup.matches).toEqual([
      expect.objectContaining({
        title: "Never Gonna Give You Up",
        engine: "audd",
      }),
    ]);
  });
});

describe("No match", () => {
  it("completes with zero Matches when no Clip is recognised", async () => {
    const { extractor, discarded } = fakeExtractor(twoClips);
    const { engine: acr } = fakeEngine("acrcloud", {});
    const { engine: audd } = fakeEngine("audd", {});
    const app = await createTestApp({ extractor, engines: [acr, audd] });

    const lookup = await app.submitAndRun(RICK);

    expect(lookup.status).toBe("completed");
    expect(lookup.failureReason).toBeNull();
    expect(lookup.matches).toEqual([]);
    expect(discarded).toEqual(twoClips.clips);
  });

  it("completes with zero Matches when the only engine able to answer hears nothing", async () => {
    const { extractor } = fakeExtractor({ ...twoClips, clips: [clip(2)] });
    const acr = downEngine("acrcloud");
    const { engine: audd } = fakeEngine("audd", {});
    const app = await createTestApp({ extractor, engines: [acr.engine, audd] });

    const lookup = await app.submitAndRun(RICK);

    expect(lookup.status).toBe("completed");
    expect(lookup.matches).toEqual([]);
  });
});
