import type { EngineName } from "@shazam/types";
import type { RecognitionEngine } from "../ports";

/**
 * Builds engines in the configured order (primary first, then fallbacks),
 * e.g. "acrcloud,audd". Unknown names are an error; duplicates are ignored.
 */
export function selectEngines(
  order: string,
  available: Record<EngineName, () => RecognitionEngine>,
): RecognitionEngine[] {
  const names = [
    ...new Set(
      order
        .split(",")
        .map((n) => n.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (!names.length) throw new Error("No recognition engines configured");
  return names.map((name) => {
    if (!(name in available))
      throw new Error(`Unknown recognition engine "${name}"`);
    return available[name as EngineName]();
  });
}
