import type { LookupStatus } from "@shazam/types";
import styles from "../../ui.module.css";

const STAGES = [
  { status: "queued", label: "Waiting" },
  { status: "fetching", label: "Fetching" },
  { status: "listening", label: "Listening" },
  { status: "completed", label: "Done" },
] as const;

const TICKS = 48;

/** A tuning dial whose needle moves through the Lookup's stages. */
export function StageDial({ status }: { status: LookupStatus }) {
  const failed = status === "failed";
  const index = failed
    ? STAGES.length - 1
    : STAGES.findIndex((s) => s.status === status);
  const position = index / (STAGES.length - 1);

  return (
    <div
      className={styles.dial}
      data-status={status}
      aria-hidden="true"
      style={{ "--needle": position } as React.CSSProperties}
    >
      <div className={styles.dialTicks}>
        {Array.from({ length: TICKS + 1 }, (_, i) => (
          <span
            key={i}
            className={styles.tick}
            data-major={i % (TICKS / 3) === 0 || undefined}
            data-passed={(!failed && i / TICKS <= position) || undefined}
            style={{ "--i": i } as React.CSSProperties}
          />
        ))}
        <span className={styles.needle} />
      </div>
      <ol className={styles.dialLabels}>
        {STAGES.map((s, i) => (
          <li key={s.status} data-current={i === index || undefined}>
            {failed && i === index ? "Stopped" : s.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
