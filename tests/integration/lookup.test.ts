import { RUNNING_STATUSES, stageOf } from "@shazam/types";
import { selectEngines } from "@shazam/lookup";
import { describe, expect, it } from "vitest";
import {
  clip,
  createTestApp,
  fakeEngine,
  fakeExtractor,
  RICK,
  song,
} from "./support/app";

describe("Lookup", () => {
  it("identifies the song in a YouTube Link", async () => {
    const { extractor } = fakeExtractor({
      ok: true,
      durationSeconds: 212,
      clips: [clip(2)],
    });
    const { engine } = fakeEngine("acrcloud", {
      2: {
        song: song("Never Gonna Give You Up", "Rick Astley"),
        confidence: 100,
      },
    });
    const app = await createTestApp({ extractor, engines: [engine] });

    const submitted = await app.service.submit(RICK, "203.0.113.1");
    if (!submitted.ok) throw new Error(submitted.error);
    expect(submitted.lookup.status).toBe("queued");

    await app.drain();
    const lookup = await app.service.get(submitted.lookup.id);

    expect(lookup?.status).toBe("completed");
    expect(lookup?.matches).toEqual([
      expect.objectContaining({
        title: "Never Gonna Give You Up",
        artist: "Rick Astley",
        timestampSeconds: 2,
        confidence: 100,
        engine: "acrcloud",
      }),
    ]);
  });
});

describe("Matches across Clips", () => {
  it("lists every distinct song in order of appearance", async () => {
    const { extractor } = fakeExtractor({
      ok: true,
      durationSeconds: 60,
      clips: [clip(2), clip(14), clip(26), clip(38), clip(50)],
    });
    const { engine } = fakeEngine("acrcloud", {
      38: { song: song("Second Song") },
      2: { song: song("First Song") },
    });
    const app = await createTestApp({ extractor, engines: [engine] });

    const lookup = await app.submitAndRun(RICK);

    expect(lookup.status).toBe("completed");
    expect(lookup.matches.map((m) => [m.title, m.timestampSeconds])).toEqual([
      ["First Song", 2],
      ["Second Song", 38],
    ]);
  });

  it("lists a song heard in several Clips once, at its earliest timestamp with its best confidence", async () => {
    const { extractor } = fakeExtractor({
      ok: true,
      durationSeconds: 40,
      clips: [clip(2), clip(11), clip(20), clip(30)],
    });
    const hook = song("Hook", "Band", { isrc: "USRC17607839" });
    const { engine } = fakeEngine("acrcloud", {
      11: { song: hook, confidence: 70 },
      20: { song: { ...hook, title: "Hook (Radio Edit)" }, confidence: 95 },
      30: { song: hook, confidence: 80 },
    });
    const app = await createTestApp({ extractor, engines: [engine] });

    const lookup = await app.submitAndRun(RICK);

    expect(lookup.matches).toHaveLength(1);
    expect(lookup.matches[0]).toMatchObject({
      timestampSeconds: 11,
      confidence: 95,
    });
  });

  it("treats the same title and artist without an ISRC as one song", async () => {
    const { extractor } = fakeExtractor({
      ok: true,
      durationSeconds: 30,
      clips: [clip(2), clip(18)],
    });
    const { engine } = fakeEngine("acrcloud", {
      2: { song: song("Levitating", "Dua Lipa") },
      18: { song: song("levitating ", "DUA LIPA") },
    });
    const app = await createTestApp({ extractor, engines: [engine] });

    const lookup = await app.submitAndRun(RICK);

    expect(lookup.matches).toHaveLength(1);
  });

  it("discards the Clips once the Lookup completes", async () => {
    const { extractor, discarded } = fakeExtractor({
      ok: true,
      durationSeconds: 30,
      clips: [clip(2), clip(18)],
    });
    const { engine } = fakeEngine("acrcloud", {});
    const app = await createTestApp({ extractor, engines: [engine] });

    await app.submitAndRun(RICK);

    expect(discarded).toEqual([clip(2), clip(18)]);
  });
});

describe("Recognition engines", () => {
  it("asks the fallback engine only about Clips the primary did not recognise", async () => {
    const { extractor } = fakeExtractor({
      ok: true,
      durationSeconds: 30,
      clips: [clip(2), clip(14)],
    });
    const primary = fakeEngine("acrcloud", {
      2: { song: song("Primary Heard This") },
    });
    const fallback = fakeEngine("audd", {
      2: { song: song("Fallback Would Say This") },
      14: { song: song("Only Fallback Heard This") },
    });
    const app = await createTestApp({
      extractor,
      engines: [primary.engine, fallback.engine],
    });

    const lookup = await app.submitAndRun(RICK);

    expect(primary.calls.map((c) => c.offsetSeconds)).toEqual([2, 14]);
    expect(fallback.calls.map((c) => c.offsetSeconds)).toEqual([14]);
    expect(lookup.matches.map((m) => [m.title, m.engine])).toEqual([
      ["Primary Heard This", "acrcloud"],
      ["Only Fallback Heard This", "audd"],
    ]);
  });

  it("follows the configured engine order", async () => {
    const { extractor } = fakeExtractor({
      ok: true,
      durationSeconds: 12,
      clips: [clip(2)],
    });
    const acrcloud = fakeEngine("acrcloud", {
      2: { song: song("ACR Answer") },
    });
    const audd = fakeEngine("audd", { 2: { song: song("AudD Answer") } });
    const app = await createTestApp({
      extractor,
      engines: selectEngines("audd,acrcloud", {
        acrcloud: () => acrcloud.engine,
        audd: () => audd.engine,
      }),
    });

    const lookup = await app.submitAndRun(RICK);

    expect(lookup.matches.map((m) => m.title)).toEqual(["AudD Answer"]);
    expect(acrcloud.calls).toEqual([]);
  });
});

describe("Stage", () => {
  it("reports running statuses as their stage and any finished Lookup as done", () => {
    expect(RUNNING_STATUSES.map(stageOf)).toEqual([
      "queued",
      "fetching",
      "listening",
    ]);
    expect(stageOf("completed")).toBe("done");
    expect(stageOf("failed")).toBe("done");
  });
});
