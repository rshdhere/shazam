import { describe, expect, it } from "vitest";
import { createTestApp, fakeEngine, fakeExtractor } from "./support/app";

async function appWithRedirects(redirects: Record<string, string> = {}) {
  const { extractor } = fakeExtractor({
    ok: true,
    durationSeconds: 30,
    clips: [],
  });
  const { engine } = fakeEngine("acrcloud", {});
  return createTestApp({
    extractor,
    engines: [engine],
    resolveRedirect: async (url) => redirects[url] ?? url,
  });
}

const YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const IG = "https://www.instagram.com/p/C9xYz12AbCd/";
const X = "https://x.com/i/status/1834567890123456789";
const PIN = "https://www.pinterest.com/pin/123456789012345678/";
const TT = "https://www.tiktok.com/@/video/7412345678901234567";

describe("Links", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", YT],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=PL123", YT],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", YT],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ&feature=share", YT],
    ["https://youtu.be/dQw4w9WgXcQ?si=Ab12Cd34", YT],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share", YT],
    ["  https://www.youtube.com/embed/dQw4w9WgXcQ  ", YT],
    ["https://www.instagram.com/reel/C9xYz12AbCd/?igsh=MWxyZ3c4", IG],
    ["https://instagram.com/reels/C9xYz12AbCd", IG],
    ["https://www.instagram.com/p/C9xYz12AbCd/?img_index=2", IG],
    ["https://www.instagram.com/some.creator/reel/C9xYz12AbCd/", IG],
    ["https://x.com/someone/status/1834567890123456789", X],
    ["https://twitter.com/someone/status/1834567890123456789/video/1?s=20", X],
    ["https://mobile.twitter.com/someone/status/1834567890123456789", X],
    ["https://www.pinterest.com/pin/123456789012345678/", PIN],
    ["https://in.pinterest.com/pin/123456789012345678/?mt=login", PIN],
    ["https://www.pinterest.co.uk/pin/123456789012345678", PIN],
    [
      "https://www.tiktok.com/@dancer/video/7412345678901234567?is_from_webapp=1",
      TT,
    ],
    ["https://m.tiktok.com/v/7412345678901234567.html", TT],
  ])("reduces %s to its canonical form", async (raw, canonical) => {
    const app = await appWithRedirects();

    const submitted = await app.service.submit(raw, "203.0.113.1");

    expect(submitted.ok && submitted.lookup.link.url).toBe(canonical);
  });

  it.each([
    [
      "https://pin.it/4AbCdEf",
      "https://www.pinterest.com/pin/123456789012345678/sent/?invite_code=x",
      PIN,
    ],
    [
      "https://vm.tiktok.com/ZMabc123/",
      "https://www.tiktok.com/@dancer/video/7412345678901234567?_r=1",
      TT,
    ],
    [
      "https://www.tiktok.com/t/ZTabc123/",
      "https://www.tiktok.com/@dancer/video/7412345678901234567",
      TT,
    ],
  ])("follows the short link %s", async (short, target, canonical) => {
    const app = await appWithRedirects({ [short]: target });

    const submitted = await app.service.submit(short, "203.0.113.1");

    expect(submitted.ok && submitted.lookup.link.url).toBe(canonical);
  });

  it.each([
    "not a link",
    "https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8",
    "https://www.youtube.com/@RickAstleyYT",
    "https://www.instagram.com/some.creator/",
    "ftp://youtu.be/dQw4w9WgXcQ",
    "https://pin.it/unresolvable",
  ])("rejects the unsupported Link %s", async (raw) => {
    const app = await appWithRedirects();

    expect(await app.service.submit(raw, "203.0.113.1")).toEqual({
      ok: false,
      error: "unsupported_link",
    });
  });
});
