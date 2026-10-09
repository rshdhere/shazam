const MAX_HOPS = 5;

/** Follows HTTP redirects (without downloading pages) and returns the final URL. */
export async function followRedirects(
  url: string,
  http: typeof fetch = fetch,
): Promise<string> {
  let current = url;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const res = await http(current, {
      method: "GET",
      redirect: "manual",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; ShazamLinkResolver/1.0)",
      },
      signal: AbortSignal.timeout(8000),
    });
    await res.body?.cancel();
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return current;
    current = new URL(location, current).toString();
  }
  return current;
}
