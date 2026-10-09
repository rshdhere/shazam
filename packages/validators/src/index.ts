import type { Link, Platform } from "@shazam/types";
import { z } from "zod";

type Canonicaliser = (url: URL) => Link | null;

const link = (platform: Platform, mediaId: string, url: string): Link => ({
  platform,
  mediaId,
  url,
});

const youtube: Canonicaliser = (url) => {
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com") {
    const [, kind, rest] = url.pathname.split("/");
    id =
      kind === "watch"
        ? url.searchParams.get("v")
        : ["shorts", "embed", "live"].includes(kind ?? "")
          ? (rest ?? null)
          : null;
  }
  return id && /^[\w-]{11}$/.test(id)
    ? link("youtube", id, `https://www.youtube.com/watch?v=${id}`)
    : null;
};

const instagram: Canonicaliser = (url) => {
  if (url.hostname.replace(/^www\./, "") !== "instagram.com") return null;
  const match = url.pathname.match(/^\/(?:[\w.]+\/)?(?:p|reels?|tv)\/([\w-]+)/);
  return match
    ? link("instagram", match[1]!, `https://www.instagram.com/p/${match[1]}/`)
    : null;
};

const x: Canonicaliser = (url) => {
  if (!/^(www\.|mobile\.)?(x|twitter)\.com$/.test(url.hostname)) return null;
  const match = url.pathname.match(/^\/\w+\/status(?:es)?\/(\d+)/);
  return match
    ? link("x", match[1]!, `https://x.com/i/status/${match[1]}`)
    : null;
};

const pinterest: Canonicaliser = (url) => {
  if (!/(^|\.)pinterest\.[a-z.]+$/.test(url.hostname)) return null;
  const match = url.pathname.match(/^\/pin\/(\d+)/);
  return match
    ? link("pinterest", match[1]!, `https://www.pinterest.com/pin/${match[1]}/`)
    : null;
};

const tiktok: Canonicaliser = (url) => {
  if (!/^(www\.|m\.)?tiktok\.com$/.test(url.hostname)) return null;
  const match = url.pathname.match(/^\/(?:@[\w.-]*\/video|v)\/(\d+)/);
  return match
    ? link("tiktok", match[1]!, `https://www.tiktok.com/@/video/${match[1]}`)
    : null;
};

const CANONICALISERS = [youtube, instagram, x, pinterest, tiktok];

function toUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** Reduces a pasted Link to its canonical form (platform + media ID), or null when unsupported. */
export function parseLink(raw: string): Link | null {
  const url = toUrl(raw);
  if (!url) return null;
  for (const canonicalise of CANONICALISERS) {
    const found = canonicalise(url);
    if (found) return found;
  }
  return null;
}

/** Share links that only reveal their media after following a redirect. */
export function isShortLink(raw: string): boolean {
  const url = toUrl(raw);
  if (!url) return false;
  return (
    url.hostname === "pin.it" ||
    url.hostname === "vm.tiktok.com" ||
    url.hostname === "vt.tiktok.com" ||
    (/^(www\.)?tiktok\.com$/.test(url.hostname) &&
      url.pathname.startsWith("/t/"))
  );
}

export const submitLookupBody = z.object({ link: z.string().min(1).max(2048) });
