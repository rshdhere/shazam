"use client";

import type {
  FailureReason,
  LookupStatus,
  Match,
  PlatformTag,
} from "@shazam/types";
import { useEffect, useState } from "react";
import { PLATFORM_NAMES, shortLink } from "../../../lib/format";
import { rememberLookup } from "../../../lib/recent";
import styles from "../../ui.module.css";
import { MatchRow } from "./match-row";
import { StageDial } from "./stage-dial";

export interface LookupSnapshot {
  link: string;
  status: LookupStatus;
  matches: Match[];
  platformTag: PlatformTag | null;
  failureReason: FailureReason | null;
}

const POLL_MS = 1500;

const FAILURE_MESSAGES: Record<FailureReason, string> = {
  unavailable:
    "We couldn't open that post. It may be private, deleted or not available in our region.",
  blocked:
    "The platform blocked us from fetching that post. Try again later, or paste a different link to the same video.",
  too_long: "That video is longer than 10 minutes. Try a shorter clip.",
  engines_unavailable:
    "Our song recognition services are down right now. Try again in a few minutes.",
};

function isDone(status: LookupStatus) {
  return status === "completed" || status === "failed";
}

function stageSentence(lookup: LookupSnapshot) {
  switch (lookup.status) {
    case "queued":
      return "Waiting to start.";
    case "fetching":
      return "Fetching the audio.";
    case "listening":
      return "Listening for songs.";
    case "failed":
      return FAILURE_MESSAGES[lookup.failureReason ?? "unavailable"];
    case "completed": {
      const n = lookup.matches.length;
      if (n === 0)
        return "No song recognised. We listened to several moments of the video and none of our recognition services knew the music.";
      return n === 1 ? "Found 1 song." : `Found ${n} songs.`;
    }
  }
}

export function LookupView({
  id,
  initial,
}: {
  id: string;
  initial: LookupSnapshot;
}) {
  const [lookup, setLookup] = useState(initial);
  const firstTitle = lookup.matches[0]?.title ?? null;

  useEffect(() => {
    if (isDone(lookup.status)) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/lookups/${id}`, { cache: "no-store" });
        if (res.ok) {
          setLookup((await res.json()) as LookupSnapshot);
          return;
        }
      } catch {
        // Offline for a moment; poll again.
      }
      setLookup((current) => ({ ...current }));
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [id, lookup]);

  useEffect(() => {
    rememberLookup({ id, link: lookup.link, title: firstTitle });
  }, [id, lookup.link, firstTitle]);

  const tag = lookup.platformTag;

  return (
    <>
      <p className={styles.source}>
        <a href={lookup.link} target="_blank" rel="noreferrer">
          {shortLink(lookup.link)}
        </a>
      </p>

      <StageDial status={lookup.status} />
      <p
        className={lookup.status === "failed" ? styles.error : styles.stage}
        aria-live="polite"
        role="status"
      >
        {stageSentence(lookup)}
      </p>

      {lookup.matches.length > 0 && (
        <section aria-labelledby="songs-heading">
          <h2 id="songs-heading" className="visually-hidden">
            Songs
          </h2>
          <ol className={styles.matches}>
            {lookup.matches.map((m) => (
              <MatchRow key={`${m.title}-${m.timestampSeconds}`} match={m} />
            ))}
          </ol>
        </section>
      )}

      {tag && (
        <p className={styles.tag}>
          {PLATFORM_NAMES[tag.platform]} labels this audio &ldquo;{tag.title}
          &rdquo;
          {tag.artist && ` by ${tag.artist}`}. That&rsquo;s the platform&rsquo;s
          own credit, not something we heard.
        </p>
      )}
    </>
  );
}
