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
    youtube?: { vid?: string };
  };
}

interface AcrCloudResponse {
  status: { code: number; msg: string };
  metadata?: { music?: AcrCloudMusic[] };
}

const NO_RESULT = 1001;

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
      const sample = await (await http(clip.url)).arrayBuffer();
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
      form.set("sample_bytes", String(sample.byteLength));
      form.set("sample", new Blob([sample]), "clip.mp3");

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
      if (!music) return null;
      const spotifyId = music.external_metadata?.spotify?.track?.id;
      const youtubeId = music.external_metadata?.youtube?.vid;
      return {
        engine: "acrcloud",
        confidence: music.score ?? 0,
        song: {
          title: music.title,
          artist: (music.artists ?? []).map((a) => a.name).join(", "),
          album: music.album?.name ?? null,
          artworkUrl: null,
          isrc: music.external_ids?.isrc ?? null,
          spotifyUrl: spotifyId
            ? `https://open.spotify.com/track/${spotifyId}`
            : null,
          appleMusicUrl: null,
          youtubeUrl: youtubeId
            ? `https://www.youtube.com/watch?v=${youtubeId}`
            : null,
        },
      };
    },
  };
}
