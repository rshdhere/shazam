import { describe, expect, it } from "vitest";
import {
  clip,
  createTestApp,
  fakeEngine,
  fakeExtractor,
  RICK,
  song,
} from "./support/app";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

async function appHearing(heard: boolean) {
  const ext = fakeExtractor({
    ok: true,
    durationSeconds: 30,
    clips: [clip(2)],
  });
  const { engine } = fakeEngine(
    "acrcloud",
    heard ? { 2: { song: song("Known Song") } } : {},
  );
  return {
    app: await createTestApp({ extractor: ext.extractor, engines: [engine] }),
    extractorCalls: ext.calls,
  };
}

async function submit(
  app: Awaited<ReturnType<typeof createTestApp>>,
  link: string,
) {
  const result = await app.service.submit(link, "203.0.113.1");
  if (!result.ok) throw new Error(result.error);
  return result;
}

describe("Reusing Lookups", () => {
  it("reuses a completed Lookup with Matches forever, without fetching or listening again", async () => {
    const { app, extractorCalls } = await appHearing(true);
    const first = await app.submitAndRun(RICK);

    app.advance(400 * DAY);
    const again = await submit(app, RICK);

    expect(again.outcome).toBe("reused");
    expect(again.lookup.id).toBe(first.id);
    expect(again.lookup.matches.map((m) => m.title)).toEqual(["Known Song"]);
    expect(app.started).toEqual([]);
    expect(extractorCalls).toHaveLength(1);
  });

  it("reuses a no-match Lookup for 7 days, then looks again", async () => {
    const { app } = await appHearing(false);
    const first = await app.submitAndRun(RICK);

    app.advance(7 * DAY - HOUR);
    expect((await submit(app, RICK)).lookup.id).toBe(first.id);

    app.advance(2 * HOUR);
    const fresh = await submit(app, RICK);
    expect(fresh.outcome).toBe("started");
    expect(fresh.lookup.id).not.toBe(first.id);
  });

  it("reuses a failed Lookup for an hour, then retries", async () => {
    const { extractor } = fakeExtractor({ ok: false, reason: "blocked" });
    const app = await createTestApp({
      extractor,
      engines: [fakeEngine("acrcloud", {}).engine],
    });
    const first = await app.submitAndRun(RICK);
    expect(first.status).toBe("failed");

    app.advance(59 * 60 * 1000);
    expect((await submit(app, RICK)).lookup.id).toBe(first.id);

    app.advance(2 * 60 * 1000);
    expect((await submit(app, RICK)).lookup.id).not.toBe(first.id);
  });

  it("shares one Lookup between variants of the same Link", async () => {
    const { app } = await appHearing(true);
    const first = await app.submitAndRun(RICK);

    const variant = await submit(app, "https://youtu.be/dQw4w9WgXcQ?si=share");

    expect(variant.lookup.id).toBe(first.id);
  });
});

describe("Joining Lookups", () => {
  it("joins the running Lookup for a Link instead of starting another", async () => {
    const { app } = await appHearing(true);

    const first = await submit(app, RICK);
    const second = await submit(
      app,
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    );

    expect(second.outcome).toBe("joined");
    expect(second.lookup.id).toBe(first.lookup.id);
    expect(app.started).toEqual([first.lookup.id]);
  });

  it("joins when two people submit the same Link at the same moment", async () => {
    const { app } = await appHearing(true);

    const [a, b] = await Promise.all([submit(app, RICK), submit(app, RICK)]);

    expect(a.lookup.id).toBe(b.lookup.id);
    expect(app.started).toHaveLength(1);
  });
});
