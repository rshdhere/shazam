import type { Match } from "@shazam/types";
import { formatTimestamp } from "../../../lib/format";
import styles from "../../ui.module.css";

export function MatchRow({ match }: { match: Match }) {
  const links = [
    { label: "Spotify", href: match.spotifyUrl },
    { label: "Apple Music", href: match.appleMusicUrl },
    { label: "YouTube", href: match.youtubeUrl },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href));

  return (
    <li className={styles.match}>
      {match.artworkUrl ? (
        // Artwork comes from whichever engine matched, so any host is possible.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={match.artworkUrl}
          alt={`Cover of ${match.album ?? match.title}`}
          className={styles.artwork}
          width={96}
          height={96}
          loading="lazy"
        />
      ) : (
        <span className={styles.record} aria-hidden="true" />
      )}
      <div className={styles.matchBody}>
        <h3 className={styles.matchTitle}>{match.title}</h3>
        <p className={styles.matchArtist}>{match.artist}</p>
        <p className={styles.matchWhen}>
          Plays at{" "}
          <time dateTime={`PT${Math.floor(match.timestampSeconds)}S`}>
            {formatTimestamp(match.timestampSeconds)}
          </time>
        </p>
        {links.length > 0 && (
          <ul className={styles.listen} aria-label={`Listen to ${match.title}`}>
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.href} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
