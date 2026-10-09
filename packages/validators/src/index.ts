import type { Link } from "@shazam/types";
import { z } from "zod";

const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);

/** Reduces a pasted Link to its canonical form, or null when unsupported. */
export function parseLink(raw: string): Link | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (YOUTUBE_HOSTS.has(url.hostname) && url.pathname === "/watch") {
    const id = url.searchParams.get("v");
    if (id && YOUTUBE_ID.test(id)) {
      return {
        platform: "youtube",
        mediaId: id,
        url: `https://www.youtube.com/watch?v=${id}`,
      };
    }
  }
  return null;
}

export const submitLookupBody = z.object({ link: z.string().min(1).max(2048) });
