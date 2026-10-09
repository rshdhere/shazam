import { createAcrCloudEngine, createAuddEngine } from "@shazam/lookup";
import auddError from "./fixtures/audd-error.json";
import auddMatch from "./fixtures/audd-match.json";
import auddNoResult from "./fixtures/audd-no-result.json";
import { describe, expect, it } from "vitest";
import match from "./fixtures/acrcloud-match.json";
import noResult from "./fixtures/acrcloud-no-result.json";
import { clip } from "./support/app";
import { audio, json, replayFetch } from "./support/fetch";

const credentials = {
  host: "identify-eu-west-1.acrcloud.com",
  accessKey: "key123",
  accessSecret: "secret456",
};

describe("ACRCloud engine", () => {
  it("maps a recognised song into a Hit", async () => {
    const { fetch, requests } = replayFetch({
      "https://blob.test/": audio(),
      "https://identify-eu-west-1.acrcloud.com/v1/identify": json(match),
    });
    const engine = createAcrCloudEngine({ ...credentials, fetch });

    const hit = await engine.identify(clip(2));

    expect(hit).toEqual({
      engine: "acrcloud",
      confidence: 100,
      song: {
        title: "Never Gonna Give You Up",
        artist: "Rick Astley",
        album: "Whenever You Need Somebody",
        artworkUrl: "https://api.deezer.com/album/6575789/image?size=big",
        isrc: "GBARL9300135",
        spotifyUrl: "https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8",
        appleMusicUrl:
          "https://music.apple.com/search?term=Never%20Gonna%20Give%20You%20Up%20Rick%20Astley",
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
    });
    const form = requests[1]!.init!.body as FormData;
    expect(form.get("access_key")).toBe("key123");
    expect(form.get("data_type")).toBe("audio");
    expect(form.get("sample_bytes")).toBe("4");
    expect(form.get("signature")).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("discards a song heard below its confidence threshold", async () => {
    const unsure = structuredClone(match);
    unsure.metadata.music[0]!.score = 50;
    const { fetch } = replayFetch({
      "https://blob.test/": audio(),
      "https://identify-eu-west-1.acrcloud.com/v1/identify": json(unsure),
    });
    const engine = createAcrCloudEngine({ ...credentials, fetch });

    expect(await engine.identify(clip(2))).toBeNull();
  });

  it("leaves artwork empty when ACRCloud knows no Deezer album", async () => {
    const bare = structuredClone(match);
    delete (bare.metadata.music[0]!.external_metadata as { deezer?: unknown })
      .deezer;
    const { fetch } = replayFetch({
      "https://blob.test/": audio(),
      "https://identify-eu-west-1.acrcloud.com/v1/identify": json(bare),
    });
    const engine = createAcrCloudEngine({ ...credentials, fetch });

    expect((await engine.identify(clip(2)))?.song.artworkUrl).toBeNull();
  });

  it("returns null when ACRCloud hears no song", async () => {
    const { fetch } = replayFetch({
      "https://blob.test/": audio(),
      "https://identify-eu-west-1.acrcloud.com/v1/identify": json(noResult),
    });
    const engine = createAcrCloudEngine({ ...credentials, fetch });

    expect(await engine.identify(clip(2))).toBeNull();
  });
});

describe("AudD engine", () => {
  it("maps a recognised song into a Hit with streaming links and artwork", async () => {
    const { fetch, requests } = replayFetch({
      "https://blob.test/": audio(),
      "https://api.audd.io/": json(auddMatch),
    });
    const engine = createAuddEngine({ apiToken: "tok789", fetch });

    const hit = await engine.identify(clip(14));

    expect(hit).toEqual({
      engine: "audd",
      confidence: 90,
      song: {
        title: "Never Gonna Give You Up",
        artist: "Rick Astley",
        album: "Whenever You Need Somebody",
        artworkUrl:
          "https://i.scdn.co/image/ab67616d0000b2735755e164993798e0c9ef7d7a",
        isrc: "GBARL9300135",
        spotifyUrl: "https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8",
        appleMusicUrl:
          "https://music.apple.com/us/album/never-gonna-give-you-up/1559523357?i=1559523359",
        youtubeUrl: null,
      },
    });
    const form = requests[1]!.init!.body as FormData;
    expect(form.get("api_token")).toBe("tok789");
    expect(form.get("return")).toBe("apple_music,spotify");
    expect(form.get("file")).toBeInstanceOf(Blob);
  });

  it("returns null when AudD hears no song", async () => {
    const { fetch } = replayFetch({
      "https://blob.test/": audio(),
      "https://api.audd.io/": json(auddNoResult),
    });

    expect(
      await createAuddEngine({ apiToken: "tok789", fetch }).identify(clip(14)),
    ).toBeNull();
  });

  it("throws when AudD reports an error, so the step can retry", async () => {
    const { fetch } = replayFetch({
      "https://blob.test/": audio(),
      "https://api.audd.io/": json(auddError),
    });

    await expect(
      createAuddEngine({ apiToken: "tok789", fetch }).identify(clip(14)),
    ).rejects.toThrow(/900/);
  });
});
