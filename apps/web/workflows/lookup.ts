import type { Clip, FailureReason } from "@shazam/types";
import type { ClipResult } from "@shazam/lookup";
import { lookupService } from "../lib/lookup";

/** Runs one Lookup durably: extract, recognise each Clip, then complete. */
export async function lookupWorkflow(lookupId: string) {
  "use workflow";

  let clips: Clip[] | null;
  try {
    clips = await extractStep(lookupId);
  } catch {
    await failStep(lookupId, "unavailable");
    return;
  }
  if (!clips) return;

  try {
    const results: ClipResult[] = [];
    for (const clip of clips) results.push(await recogniseStep(clip));
    await completeStep(lookupId, results);
  } catch {
    await failStep(lookupId, "engines_unavailable", clips);
  }
}

async function extractStep(lookupId: string) {
  "use step";
  return lookupService().extract(lookupId);
}

async function recogniseStep(clip: Clip) {
  "use step";
  return lookupService().recognise(clip);
}

async function completeStep(lookupId: string, results: ClipResult[]) {
  "use step";
  await lookupService().complete(lookupId, results);
}

async function failStep(
  lookupId: string,
  reason: FailureReason,
  clips: Clip[] = [],
) {
  "use step";
  await lookupService().fail(lookupId, reason, clips);
}
