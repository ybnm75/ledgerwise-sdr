import { z } from "zod";
import { getDatabase, listAuditEvents } from "@/lib/db";
import { requireApiSession } from "@/lib/auth";
import { saveDraftRevision } from "@/lib/drafts";

const Update = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  evidenceIds: z.array(z.string().min(1).max(200)).max(20).default([])
});

type LeadRouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: LeadRouteContext) {
  const auth = requireApiSession(request, { mutation: true });
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const parsed = Update.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "The draft update is invalid." }, { status: 400 });
  try {
    if (parsed.data.status === "approved") {
      const qualification = await getDatabase().execute({
        sql: "SELECT band FROM qualification_results WHERE company_id = ? LIMIT 1",
        args: [id]
      });
      if (String(qualification.rows[0]?.band || "") !== "qualified") {
        return Response.json({ error: "Approval is locked until this lead passes the qualification gates." }, { status: 409 });
      }
    }
    const saved = await saveDraftRevision({
      companyId: id,
      status: parsed.data.status,
      subject: parsed.data.subject,
      body: parsed.data.body,
      evidenceIds: parsed.data.evidenceIds,
      actorId: auth.session.sub
    });
    return Response.json({ data: saved });
  } catch (error) {
    console.error("Lead persistence failed", error);
    return Response.json({ error: "The update was not saved. Try again before leaving this record." }, { status: 503 });
  }
}

export async function GET(request: Request, context: LeadRouteContext) {
  const auth = requireApiSession(request);
  if (auth.response) return auth.response;
  const { id } = await context.params;
  try {
    return Response.json({ data: await listAuditEvents(id) });
  } catch (error) {
    console.error("Audit retrieval failed", error);
    return Response.json({ error: "The audit ledger is unavailable." }, { status: 503 });
  }
}
