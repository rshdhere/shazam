import { lookupService } from "../../../../lib/lookup";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const lookup = await lookupService().get((await params).id);
  if (!lookup) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(
    {
      id: lookup.id,
      link: lookup.link.url,
      status: lookup.status,
      matches: lookup.matches,
      platformTag: lookup.platformTag,
      failureReason: lookup.failureReason,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
