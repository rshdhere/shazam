import { createHmac } from "node:crypto";
import type { Clip, Hit } from "@shazam/types";
import type { RecognitionEngine } from "../ports";

interface AcrCloudMusic {
  title: string;
  artists?: { name: string }[];
  album?: { name?: string };
  score?: number;
  external_ids?: { isrc?: string };
  external_metadata?: {
    spotify?: { track?: { id?: string } };
    deezer?: { album?: { id?: string | number } };
    youtube?: { vid?: string };
  };
}

interface AcrCloudResponse {
  status: { code: number; msg: string };
  metadata?: { music?: AcrCloudMusic[] };
}

const NO_RESULT = 1001;
/** ACRCloud scores 0–100; below this its matches are too often wrong to show. */
const MIN_SCORE = 70;

export function createAcrCloudEngine(config: {
  host: string;
  accessKey: string;
  accessSecret: string;
  fetch?: typeof fetch;
}): RecognitionEngine {
  const http = config.fetch ?? fetch;

  return {
    name: "acrcloud",
    async identify(clip: Clip): Promise<Hit | null> {
      const clipAudio = await (await http(clip.url)).arrayBuffer();
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = createHmac("sha1", config.accessSecret)
        .update(
          [
            "POST",
            "/v1/identify",
            config.accessKey,
            "audio",
            "1",
            timestamp,
          ].join("\n"),
        )
        .digest("base64");

      const form = new FormData();
      form.set("access_key", config.accessKey);
      form.set("data_type", "audio");
      form.set("signature_version", "1");
      form.set("signature", signature);
      form.set("timestamp", timestamp);
      form.set("sample_bytes", String(clipAudio.byteLength));
      form.set("sample", new Blob([clipAudio]), "clip.mp3");

      const res = await http(`https://${config.host}/v1/identify`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(`ACRCloud HTTP ${res.status}`);
      const body = (await res.json()) as AcrCloudResponse;
      if (body.status.code === NO_RESULT) return null;
      if (body.status.code !== 0)
        throw new Error(`ACRCloud ${body.status.code}: ${body.status.msg}`);

      const music = body.metadata?.music?.[0];
      if (!music || (music.score ?? 0) < MIN_SCORE) return null;
      const artist = (music.artists ?? []).map((a) => a.name).join(", ");
      const spotifyId = music.external_metadata?.spotify?.track?.id;
      const deezerAlbumId = music.external_metadata?.deezer?.album?.id;
      const youtubeId = music.external_metadata?.youtube?.vid;
      return {
        engine: "acrcloud",
        confidence: music.score ?? 0,
        song: {
          title: music.title,
          artist,
          album: music.album?.name ?? null,
          // ACRCloud has no artwork; Deezer serves any album's cover by id.
          artworkUrl: deezerAlbumId
            ? `https://api.deezer.com/album/${deezerAlbumId}/image?size=big`
            : null,
          isrc: music.external_ids?.isrc ?? null,
          spotifyUrl: spotifyId
            ? `https://open.spotify.com/track/${spotifyId}`
            : null,
          // ACRCloud has no Apple Music ids, so link a search for the song.
          appleMusicUrl: `https://music.apple.com/search?term=${encodeURIComponent(`${music.title} ${artist}`.trim())}`,
          youtubeUrl: youtubeId
            ? `https://www.youtube.com/watch?v=${youtubeId}`
            : null,
        },
      };
    },
  };
}
