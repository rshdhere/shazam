"use client";

import type {
  FailureReason,
  LookupStage,
  LookupStatus,
  Match,
  PlatformTag,
} from "@shazam/types";
import { useEffect, useState } from "react";
import { displayUrl, PLATFORM_NAMES } from "../../../lib/format";
import { rememberLookup } from "../../../lib/recent";
import styles from "../../ui.module.css";
import { MatchRow } from "./match-row";
import { StageDial } from "./stage-dial";

export interface LookupSnapshot {
  link: string;
  status: LookupStatus;
  stage: LookupStage;
  matches: Match[];
  platformTag: PlatformTag | null;
  failureReason: FailureReason | null;
}

const POLL_MS = 1500;

/** What went wrong, and whether trying again could help. */
const FAILURE_MESSAGES: Record<FailureReason, string> = {
  unavailable:
    "We couldn't open that post. It may be private, deleted or not available in our region. Trying again won't help unless the post becomes public.",
  blocked:
    "The platform blocked us from fetching that post. This is usually temporary, so try again in an hour, or paste a different link to the same video.",
  too_long:
    "That video is longer than 10 minutes, which is more than we listen to. Trying again won't help; paste a link to a shorter video.",
  extractor_unavailable:
    "Our video fetcher is down right now. It isn't your link; try again in an hour.",
  engines_unavailable:
    "Our song recognition services are down right now. It isn't your link; try again in an hour.",
};

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
    if (lookup.stage === "done") return;
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
      <p className={styles.lookupUrl}>
        <a href={lookup.link} target="_blank" rel="noreferrer">
          {displayUrl(lookup.link)}
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
        <section className={styles.tag} aria-labelledby="tag-heading">
          <h2 id="tag-heading" className={styles.tagHeading}>
            Tagged by {PLATFORM_NAMES[tag.platform]}
          </h2>
          <p className={styles.tagSong}>
            {tag.title}
            {tag.artist && ` by ${tag.artist}`}
          </p>
          <p className={styles.tagNote}>
            The platform&rsquo;s own label for this audio, not something we
            heard.
          </p>
        </section>
      )}
    </>
  );
}
