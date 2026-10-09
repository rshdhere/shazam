import { describe, expect, it } from "vitest";
import {
  clip,
  createTestApp,
  fakeEngine,
  fakeExtractor,
  RICK,
  song,
} from "./support/app";

const REEL = "https://www.instagram.com/reel/C9xYz12AbCd/";

describe("Platform Tag", () => {
  it("is kept beside the Matches, never counted as one, even when they disagree", async () => {
    const { extractor } = fakeExtractor({
      ok: true,
      durationSeconds: 30,
      platformTag: { title: "Espresso", artist: "Sabrina Carpenter" },
      clips: [clip(2)],
    });
    const { engine } = fakeEngine("acrcloud", {
      2: { song: song("Please Please Please", "Sabrina Carpenter") },
    });
    const app = await createTestApp({ extractor, engines: [engine] });

    const lookup = await app.submitAndRun(REEL);

    expect(lookup.platformTag).toEqual({
      platform: "instagram",
      title: "Espresso",
      artist: "Sabrina Carpenter",
    });
    expect(lookup.matches.map((m) => m.title)).toEqual([
      "Please Please Please",
    ]);
  });

  it("does not turn a no-match Lookup into a match", async () => {
    const { extractor } = fakeExtractor({
      ok: true,
      durationSeconds: 30,
      platformTag: { title: "Never Gonna Give You Up", artist: "Rick Astley" },
      clips: [clip(2)],
    });
    const { engine } = fakeEngine("acrcloud", {});
    const app = await createTestApp({ extractor, engines: [engine] });

    const lookup = await app.submitAndRun(RICK);

    expect(lookup.status).toBe("completed");
    expect(lookup.matches).toEqual([]);
    expect(lookup.platformTag).toEqual({
      platform: "youtube",
      title: "Never Gonna Give You Up",
      artist: "Rick Astley",
    });
  });

  it.each([
    "Original audio",
    "original sound - dancer.daily",
    "Original Sound",
  ])("ignores the placeholder label %s", async (title) => {
    const { extractor } = fakeExtractor({
      ok: true,
      durationSeconds: 30,
      platformTag: { title, artist: "dancer.daily" },
      clips: [clip(2)],
    });
    const app = await createTestApp({
      extractor,
      engines: [fakeEngine("acrcloud", {}).engine],
    });

    expect((await app.submitAndRun(REEL)).platformTag).toBeNull();
  });

  it("is absent when the platform labels nothing", async () => {
    const { extractor } = fakeExtractor({
      ok: true,
      durationSeconds: 30,
      platformTag: null,
      clips: [clip(2)],
    });
    const app = await createTestApp({
      extractor,
      engines: [fakeEngine("acrcloud", {}).engine],
    });

    expect((await app.submitAndRun(RICK)).platformTag).toBeNull();
  });
});
