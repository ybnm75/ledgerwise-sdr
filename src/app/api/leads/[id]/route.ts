import { z } from "zod";
import { listAuditEvents, saveLeadDraft } from "@/lib/db";

const Update = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000)
});

type LeadRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: LeadRouteContext) {
  const { id } = await context.params;
  const parsed = Update.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "The draft update is invalid." }, { status: 400 });
  try {
    const saved = await saveLeadDraft({ id, ...parsed.data });
    return Response.json({ data: saved });
  } catch (error) {
    console.error("Lead persistence failed", error);
    return Response.json({ error: "The update was not saved. Try again before leaving this record." }, { status: 503 });
  }
}

export async function GET(_request: Request, context: LeadRouteContext) {
  const { id } = await context.params;
  try {
    return Response.json({ data: await listAuditEvents(id) });
  } catch (error) {
    console.error("Audit retrieval failed", error);
    return Response.json({ error: "The audit ledger is unavailable." }, { status: 503 });
  }
}
