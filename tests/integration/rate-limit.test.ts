import { describe, expect, it } from "vitest";
import {
  clip,
  createTestApp,
  fakeEngine,
  fakeExtractor,
  RICK,
  song,
} from "./support/app";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const ALICE = "203.0.113.1";
const BOB = "198.51.100.7";

/** A distinct YouTube Link per n, so each submission needs a new Lookup. */
function video(n: number) {
  return `https://www.youtube.com/watch?v=video${String(n).padStart(6, "0")}`;
}

async function matchingApp() {
  const { extractor } = fakeExtractor({
    ok: true,
    durationSeconds: 30,
    clips: [clip(2)],
  });
  const { engine } = fakeEngine("acrcloud", {
    2: { song: song("Known Song") },
  });
  return createTestApp({ extractor, engines: [engine] });
}

describe("Rate limit", () => {
  it("refuses the 11th new Lookup from one IP within an hour, saying when to retry", async () => {
    const app = await matchingApp();
    for (let n = 1; n <= 10; n++) {
      expect((await app.service.submit(video(n), ALICE)).ok).toBe(true);
      app.advance(MINUTE);
    }

    const refused = await app.service.submit(video(11), ALICE);

    // The first of the 10 was 10 minutes ago, so it leaves the window in 50 minutes.
    expect(refused).toEqual({
      ok: false,
      error: "rate_limited",
      retryAfterSeconds: 50 * 60,
    });
    expect(app.started).toHaveLength(10);
  });

  it("lets the IP start Lookups again once its oldest one leaves the hour", async () => {
    const app = await matchingApp();
    for (let n = 1; n <= 10; n++) await app.service.submit(video(n), ALICE);

    app.advance(HOUR);

    expect((await app.service.submit(video(11), ALICE)).ok).toBe(true);
  });

  it("counts each IP separately", async () => {
    const app = await matchingApp();
    for (let n = 1; n <= 10; n++) await app.service.submit(video(n), ALICE);

    expect((await app.service.submit(video(11), BOB)).ok).toBe(true);
  });

  it("still serves reused and joined Lookups to a limited IP, without counting them", async () => {
    const app = await matchingApp();
    const done = await app.submitAndRun(RICK, BOB);
    const running = await app.service.submit(video(99), BOB);
    for (let n = 1; n <= 10; n++) await app.service.submit(video(n), ALICE);

    const reused = await app.service.submit(RICK, ALICE);
    const joined = await app.service.submit(video(99), ALICE);

    expect(reused).toMatchObject({
      ok: true,
      outcome: "reused",
      lookup: { id: done.id },
    });
    expect(joined).toMatchObject({
      ok: true,
      outcome: "joined",
      lookup: { id: running.ok && running.lookup.id },
    });
    expect((await app.service.submit(video(11), ALICE)).ok).toBe(false);
  });

  it("does not count reused Lookups towards the limit", async () => {
    const app = await matchingApp();
    await app.submitAndRun(RICK, BOB);
    for (let i = 0; i < 20; i++) await app.service.submit(RICK, ALICE);

    expect((await app.service.submit(video(1), ALICE)).ok).toBe(true);
  });

  it("does not count unsupported links", async () => {
    const app = await matchingApp();
    for (let i = 0; i < 20; i++)
      await app.service.submit("https://example.com/not-a-video", ALICE);

    expect((await app.service.submit(video(1), ALICE)).ok).toBe(true);
  });
});
