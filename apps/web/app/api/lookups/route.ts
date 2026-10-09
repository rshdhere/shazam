import { submitLookupBody } from "@shazam/validators";
import { start } from "workflow/api";
import { lookupService } from "../../../lib/lookup";
import { lookupWorkflow } from "../../../workflows/lookup";

export async function POST(request: Request) {
  const parsed = submitLookupBody.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json({ error: "invalid_body" }, { status: 400 });

  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const service = lookupService(async (lookupId) => {
    await start(lookupWorkflow, [lookupId]);
  });
  const result = await service.submit(parsed.data.link, clientIp);
  if (!result.ok)
    return Response.json({ error: result.error }, { status: 400 });
  return Response.json(
    {
      lookupId: result.lookup.id,
      status: result.lookup.status,
      outcome: result.outcome,
    },
    { status: 202 },
  );
}
