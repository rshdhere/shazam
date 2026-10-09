import { createAcrCloudEngine } from "@shazam/lookup";
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
        artworkUrl: null,
        isrc: "GBARL9300135",
        spotifyUrl: "https://open.spotify.com/track/4PTG3Z6ehGkBFwjybzWkR8",
        appleMusicUrl: null,
        youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      },
    });
    const form = requests[1]!.init!.body as FormData;
    expect(form.get("access_key")).toBe("key123");
    expect(form.get("data_type")).toBe("audio");
    expect(form.get("sample_bytes")).toBe("4");
    expect(form.get("signature")).toMatch(/^[A-Za-z0-9+/]+=*$/);
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
