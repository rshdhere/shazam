"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { displayUrl } from "../lib/format";
import { parseRecent, readRecentRaw, subscribeRecent } from "../lib/recent";
import styles from "./ui.module.css";

export function RecentLookups() {
  const raw = useSyncExternalStore(subscribeRecent, readRecentRaw, () => null);
  const recent = useMemo(() => parseRecent(raw), [raw]);
  if (!recent.length) return null;

  return (
    <section className={styles.recent} aria-labelledby="recent-heading">
      <h2 id="recent-heading" className={styles.recentHeading}>
        Your recent lookups
      </h2>
      <ul className={styles.recentList}>
        {recent.map((r) => (
          <li key={r.id}>
            <Link href={`/l/${r.id}`} className={styles.recentLink}>
              {r.title && <span className={styles.recentTitle}>{r.title}</span>}
              <span className={r.title ? styles.recentUrl : styles.recentTitle}>
                {displayUrl(r.link)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
