import { describe, expect, it } from "vitest";

// Runs against a deployed URL: SMOKE_BASE_URL=https://shazam-xyz.vercel.app pnpm test:e2e
const baseUrl = process.env.SMOKE_BASE_URL;
const headers: Record<string, string> = { "content-type": "application/json" };
if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
  headers["x-vercel-protection-bypass"] =
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
}

describe.skipIf(!baseUrl)("deployed site", () => {
  it("identifies the song in a known YouTube Link", async () => {
    const submitted = await fetch(`${baseUrl}/api/lookups`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        link: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      }),
    });
    expect(submitted.ok).toBe(true);
    const { lookupId } = (await submitted.json()) as { lookupId: string };

    let lookup: {
      status: string;
      failureReason: string | null;
      matches: { title: string }[];
    };
    const deadline = Date.now() + 170_000;
    do {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      lookup = await (
        await fetch(`${baseUrl}/api/lookups/${lookupId}`, { headers })
      ).json();
    } while (
      lookup.status !== "completed" &&
      lookup.status !== "failed" &&
      Date.now() < deadline
    );

    expect(lookup.failureReason).toBeNull();
    expect(lookup.status).toBe("completed");
    expect(lookup.matches.map((m) => m.title)).toContain(
      "Never Gonna Give You Up",
    );
  });
});
