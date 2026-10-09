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
