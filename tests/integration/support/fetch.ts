export interface RecordedRequest {
  url: string;
  init: RequestInit | undefined;
}

/** A fetch that replays canned responses by URL prefix and records requests. */
export function replayFetch(routes: Record<string, () => Response>) {
  const requests: RecordedRequest[] = [];
  const fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    requests.push({ url, init });
    const prefix = Object.keys(routes).find((p) => url.startsWith(p));
    if (!prefix) throw new Error(`unexpected request to ${url}`);
    return routes[prefix]!();
  };
  return { fetch: fetch as typeof globalThis.fetch, requests };
}

export const json =
  (body: unknown, status = 200) =>
  () =>
    Response.json(body, { status });
export const audio = () => () =>
  new Response(new Uint8Array([0xff, 0xfb, 0x90, 0x00]));
