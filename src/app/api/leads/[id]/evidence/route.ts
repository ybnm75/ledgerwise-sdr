import { z } from "zod";
import { requireApiSession } from "@/lib/auth";
import { verifyAndSaveEvidence } from "@/lib/evidence-review";
import { SourceVerificationError } from "@/lib/public-source";

const EvidenceInput = z.object({
  kind: z.enum(["commerce", "location", "size", "revenue", "scale", "trigger", "contact"]),
  claim: z.string().trim().min(5).max(500),
  excerpt: z.string().trim().min(20).max(1000),
  sourceUrl: z.string().trim().url().max(2048),
  contactName: z.string().trim().min(2).max(160).optional(),
  contactRole: z.string().trim().min(2).max(160).optional()
}).strict().superRefine((value, context) => {
  if (value.kind === "contact" && (!value.contactName || !value.contactRole)) {
    context.addIssue({ code: "custom", path: ["contactName"], message: "A verified name and business role are required for contact evidence." });
  }
});

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const auth = requireApiSession(request, { mutation: true });
  if (auth.response) return auth.response;
  const parsed = EvidenceInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Complete every required evidence field.", details: parsed.error.flatten() }, { status: 400 });
  }
  const { id } = await context.params;
  try {
    const data = await verifyAndSaveEvidence({ companyId: id, ...parsed.data, actorId: auth.session.sub });
    return Response.json({ data }, { status: data.duplicate ? 200 : 201 });
  } catch (error) {
    if (error instanceof SourceVerificationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Human evidence verification failed", error);
    return Response.json({ error: "The evidence could not be verified or saved." }, { status: 503 });
  }
}
