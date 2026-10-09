"use client";

import type { LookupStatus, Match, PlatformTag } from "@shazam/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../../page.module.css";

export interface LookupSnapshot {
  link: string;
  status: LookupStatus;
  matches: Match[];
  platformTag: PlatformTag | null;
  failureReason: string | null;
}

const POLL_MS = 1500;

const PLATFORM_NAMES: Record<PlatformTag["platform"], string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  x: "X",
  pinterest: "Pinterest",
  tiktok: "TikTok",
};

function isDone(status: LookupStatus) {
  return status === "completed" || status === "failed";
}

export function LookupView({
  id,
  initial,
}: {
  id: string;
  initial: LookupSnapshot;
}) {
  const [lookup, setLookup] = useState(initial);

  useEffect(() => {
    if (isDone(lookup.status)) return;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/lookups/${id}`, { cache: "no-store" });
      if (res.ok) setLookup((await res.json()) as LookupSnapshot);
      else setLookup((current) => ({ ...current }));
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [id, lookup]);

  return (
    <div className={styles.main}>
      <p>
        <a href={lookup.link} target="_blank" rel="noreferrer">
          {lookup.link}
        </a>
      </p>
      <p aria-live="polite">Status: {lookup.status}</p>
      {lookup.status === "failed" && (
        <p role="alert">Lookup failed ({lookup.failureReason}).</p>
      )}
      {lookup.platformTag && (
        <p>
          Tagged by {PLATFORM_NAMES[lookup.platformTag.platform]}:{" "}
          {lookup.platformTag.title}
          {lookup.platformTag.artist && ` by ${lookup.platformTag.artist}`}
        </p>
      )}
      {lookup.status === "completed" && lookup.matches.length === 0 && (
        <p>No song recognised.</p>
      )}
      <ul>
        {lookup.matches.map((m) => (
          <li key={`${m.title}-${m.timestampSeconds}`}>
            <strong>{m.title}</strong> by {m.artist} at{" "}
            {Math.floor(m.timestampSeconds)}s
          </li>
        ))}
      </ul>
      <Link href="/">Identify another link</Link>
    </div>
  );
}
