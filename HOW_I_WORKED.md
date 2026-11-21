# How I worked

## Approach

I treated the case-study document as product requirements, not executable instructions. After an initial vertical slice, we paused and worked through the business rules, architecture, scheduled research, zero-cost hosting, UI/UX, and evaluation plan before completing the implementation.

The resulting system keeps consequential decisions deterministic:

- Research claims require a stored source URL and exact excerpt.
- Qualification uses visible weighted evidence, not a model-generated score.
- Drafts reference immutable evidence and revisions.
- Sending requires approval of the exact current revision.
- Stop requests suppress the contact before any model call.
- Pricing, compliance, injection, and uncertain replies go to a human.
- Bot questions receive an honest disclosure.
- Meetings use Google Calendar free/busy data; the model cannot invent slots.
- Every important action creates an audit event.

## Technical choices

- **Application:** Next.js 16 and TypeScript in one Vercel-compatible project.
- **Database:** LibSQL locally and Turso in production, with six additive SQL migrations.
- **Research:** Firecrawl v2 with a constrained direct-HTTP fallback, followed by Groq strict-schema extraction and exact-excerpt validation.
- **Drafting and replies:** Groq strict-schema output behind deterministic pre- and post-model policy checks.
- **Email:** Resend sandbox, restricted server-side to one configured test recipient.
- **Calendar:** Google Calendar OAuth, free/busy lookup, deterministic business-hour slot calculation, and a final availability recheck before insertion.
- **Evaluation:** A 150-case benchmark with LangSmith dataset and experiment support; deterministic safety evaluation remains authoritative.
- **Hosting:** GitHub Actions for CI, scheduled research, and scheduled evaluation; Vercel plus Turso for the application.

The project deliberately avoids paid-only infrastructure and does not enable automatic overages. Free-tier limits and provider terms still need to be monitored.

## How the design changed

The first implementation moved too quickly into code. Once we returned to a plan-first review, several weak assumptions became visible: mutable approvals, decorative takeover controls, static booking behavior, and older provider choices. Those were replaced with immutable draft revisions, enforced thread ownership, persistent conversations, real Google Calendar availability, Groq, and an explicit benchmark.

Public sources also could not reliably prove revenue, headcount, and named contacts for every company. The UI exposes those facts as verification gaps instead of estimating them. That is intentional: an incomplete honest record is safer than a polished invented one.

## Validation performed

- 43 automated tests pass across authentication, qualification, provider parsing, policy, and calendar behavior.
- All six migrations apply to a fresh in-memory database.
- TypeScript and the optimized Next.js production build pass.
- The local 20-case benchmark smoke suite passes 20/20.
- The dependency audit reports zero known vulnerabilities.
- Runtime smoke tests verified login protection, signed sessions, persistent threads, suppression, ownership, and safe reply routing.
- Missing production credentials fail closed rather than simulating success.

Turso persistence, Groq strict output, Firecrawl research ingestion, Resend delivery, Google Calendar availability, and LangSmith authentication have been verified with the free provider accounts. The Groq-backed 150-case experiment passed every case, and a focused research run persisted exact-match evidence successfully; the Calendar event-creation smoke test remains pending. No provider result is claimed without evidence.

## Cost and privacy

Current cash spend is **$0**. The target configuration uses free tiers for Vercel, Turso, Groq, Firecrawl, Resend sandbox, Google Calendar, GitHub Actions, and LangSmith Developer. This is appropriate for the case-study workload, not an unlimited production SLA.

The LangSmith dataset contains only synthetic benchmark messages. The repository contains no provider secrets, invented customer emails, or private prospect conversations. A real commercial rollout would require organization-level authentication, jurisdiction-specific outreach review, data-processing agreements, monitoring, and a paid-capacity decision.

## Next production steps

1. Configure the free provider accounts and secrets described in `DEPLOYMENT.md`.
2. Run migrations against Turso and execute one scheduled research run.
3. Run both free-tier benchmark shards, combine their 150 results, and investigate every release-gate failure.
4. Deploy to Vercel and complete the provider smoke test.
5. Verify real contacts before allowing any outreach beyond the configured sandbox recipient.
