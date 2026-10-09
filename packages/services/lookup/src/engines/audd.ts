import type { Clip, Hit } from "@shazam/types";
import type { RecognitionEngine } from "../ports";

interface AuddResult {
  artist: string;
  title: string;
  album?: string;
  apple_music?: { url?: string; isrc?: string; artwork?: { url?: string } };
  spotify?: {
    external_urls?: { spotify?: string };
    album?: { images?: { url: string }[] };
    external_ids?: { isrc?: string };
  };
}

type AuddResponse =
  | { status: "success"; result: AuddResult | null }
  | { status: "error"; error: { error_code: number; error_message: string } };

/** AudD reports no score; a returned result is already a confident match. */
const AUDD_CONFIDENCE = 90;

export function createAuddEngine(config: {
  apiToken: string;
  fetch?: typeof fetch;
}): RecognitionEngine {
  const http = config.fetch ?? fetch;

  return {
    name: "audd",
    async identify(clip: Clip): Promise<Hit | null> {
      const sample = await (await http(clip.url)).arrayBuffer();
      const form = new FormData();
      form.set("api_token", config.apiToken);
      form.set("return", "apple_music,spotify");
      form.set("file", new Blob([sample], { type: "audio/mpeg" }), "clip.mp3");

      const res = await http("https://api.audd.io/", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(`AudD HTTP ${res.status}`);
      const body = (await res.json()) as AuddResponse;
      if (body.status === "error") {
        throw new Error(
          `AudD ${body.error.error_code}: ${body.error.error_message}`,
        );
      }
      const r = body.result;
      if (!r) return null;

      const appleArtwork = r.apple_music?.artwork?.url?.replace(
        "{w}x{h}",
        "600x600",
      );
      return {
        engine: "audd",
        confidence: AUDD_CONFIDENCE,
        song: {
          title: r.title,
          artist: r.artist,
          album: r.album ?? null,
          artworkUrl:
            r.spotify?.album?.images?.[0]?.url ?? appleArtwork ?? null,
          isrc: r.spotify?.external_ids?.isrc ?? r.apple_music?.isrc ?? null,
          spotifyUrl: r.spotify?.external_urls?.spotify ?? null,
          appleMusicUrl: r.apple_music?.url ?? null,
          youtubeUrl: null,
        },
      };
    },
  };
}
