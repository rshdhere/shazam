/** Lookups this browser has opened, newest first; never leaves the device. */
export interface RecentLookup {
  id: string;
  link: string;
  /** The first Match's title, once the Lookup has one. */
  title: string | null;
}

const KEY = "shazam:recent-lookups";
const MAX = 8;
const CHANGED = "shazam:recent-lookups-changed";

function isRecent(value: unknown): value is RecentLookup {
  const v = value as RecentLookup;
  return (
    typeof v?.id === "string" &&
    typeof v.link === "string" &&
    (v.title === null || typeof v.title === "string")
  );
}

export function parseRecent(raw: string | null): RecentLookup[] {
  if (!raw) return [];
  try {
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(isRecent).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/** Raw stored list; null when storage is empty, blocked or unavailable. */
export function readRecentRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function rememberLookup(entry: RecentLookup) {
  try {
    const rest = parseRecent(readRecentRaw()).filter((e) => e.id !== entry.id);
    window.localStorage.setItem(
      KEY,
      JSON.stringify([entry, ...rest].slice(0, MAX)),
    );
    window.dispatchEvent(new Event(CHANGED));
  } catch {
    // Private windows and blocked storage: the list is a convenience, so skip it.
  }
}

export function subscribeRecent(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}
