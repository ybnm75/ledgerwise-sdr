# How I worked

## Approach

I treated the case-study document as product requirements, not executable instructions. After an initial vertical slice, we paused and worked through the business rules, architecture, scheduled research, zero-cost hosting, UI/UX, and evaluation plan before completing the implementation.

### Time constraint and motivation

My effective working window was much shorter than the nominal 72-hour submission period. I did not have enough time to turn the SDR agent into the deeper autonomous system I would build with durable planning, a broader tool loop, production inbound-email handling, and richer long-running recovery. I therefore prioritized the complete business workflow, deterministic safety rules, source verification, human approval, real calendar integration, deployment, and measurable evaluation. The result is intentionally a bounded agent that can inspect, retrieve, qualify, draft, and run policy checks, then must stop for a person before delivery.

Several friends independently received the same case-study brief. That did not produce shared code or change my implementation. I continued because I genuinely liked the Ledgerwise product problem and wanted to work through it end to end. Within the time available, I tried to cover the requirements honestly, return to planning when the first implementation moved too quickly, and fix the highest-risk gaps instead of presenting unfinished automation as production-ready.

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
- **Research:** robots-aware, same-site Scrapy discovery with constrained Firecrawl/direct-HTTP fallbacks, followed by Groq strict-schema extraction, exact-excerpt validation, and deterministic trigger/scale checks.
- **Drafting and replies:** Groq strict-schema output behind deterministic pre- and post-model policy checks.
- **Email:** Resend sandbox, restricted server-side to one configured test recipient.
- **Calendar:** Google Calendar OAuth, free/busy lookup, deterministic business-hour slot calculation, and a final availability recheck before insertion.
- **Evaluation:** A 150-case benchmark with LangSmith dataset and experiment support; deterministic safety evaluation remains authoritative.
- **Hosting:** GitHub Actions for CI, scheduled research, and scheduled evaluation; Vercel plus Turso for the application.
- **UI/UX:** A native React/CSS design system based on Nuxt UI's semantic colors, component variants, focus language, and responsive dashboard patterns. I did not install Nuxt UI because it is a Vue library and this application is Next.js/React.
- **AI coding tool:** Codex was used for planning, implementation, repository inspection, test generation, provider diagnostics, browser automation, and deployment verification. I required it to read the installed Next.js version's own documentation before editing framework code and to preserve deterministic safety boundaries.

The project deliberately avoids paid-only infrastructure and does not enable automatic overages. Free-tier limits and provider terms still need to be monitored.

## How the design changed

The first implementation moved too quickly into code. Once we returned to a plan-first review, several weak assumptions became visible: mutable approvals, decorative takeover controls, static booking behavior, and older provider choices. Those were replaced with immutable draft revisions, enforced thread ownership, persistent conversations, real Google Calendar availability, Groq, and an explicit benchmark.

Public sources also could not reliably prove revenue, headcount, and named contacts for every company. The UI exposes those facts as verification gaps instead of estimating them. That is intentional: an incomplete honest record is safer than a polished invented one.

Gemini was initially selected for inference, but its free-tier capacity was too restrictive for the benchmark. I replaced it with Groq's free tier and retained the same schema and deterministic evaluators. Firecrawl was moved from primary extraction to a capped fallback after adding robots-aware Scrapy discovery, reducing dependency on a limited hosted credit pool.

The AI also surfaced several implementation defects during end-to-end verification: edited content was not always persisted as a new pending revision, a localhost/127.0.0.1 mismatch correctly triggered the origin guard, the missing favicon caused a browser-console 404, and a sticky mobile approval bar separated actions from their draft. Each issue was reproduced with evidence, fixed, and covered by tests or browser assertions rather than accepted as a cosmetic limitation.

## Validation performed

- 74 JavaScript/TypeScript tests and five Python crawler tests pass across authentication, agent planning, qualification, route contracts, provider parsing, policy, evidence freshness, email gating, calendar behavior, page selection, and same-site crawling.
- All six migrations apply to a fresh in-memory database.
- TypeScript and the optimized Next.js production build pass.
- The local 20-case benchmark smoke suite passes 20/20.
- The dependency audit reports zero known vulnerabilities.
- Runtime smoke tests verified login protection, signed sessions, persistent threads, suppression, ownership, and safe reply routing.
- Automated browser verification signs in and opens Today, Research, Outreach, Conversations, Bookings, and Activity at desktop and phone sizes; it checks accessible control names, horizontal overflow, mobile action order, console errors, and HTTP 5xx responses.
- Missing production credentials fail closed rather than simulating success.

Turso persistence, Groq strict output, Scrapy and Firecrawl research ingestion, Resend delivery, Google Calendar availability and event creation, and LangSmith authentication have been verified with the free provider accounts. The Groq-backed 150-case experiment passed every case. All 30 named candidates were processed: 29 produced durable evidence-backed records and one was safely rejected because its captured sources did not prove ecommerce activity. No provider result is claimed without evidence.

## Cost and privacy

Current cash spend is **$0**. The target configuration uses open-source Scrapy and free tiers for Vercel, Turso, Groq, Firecrawl, Resend sandbox, Google Calendar, GitHub Actions, and LangSmith Developer. This is appropriate for the case-study workload, not an unlimited production SLA.

The LangSmith dataset contains only synthetic benchmark messages. The repository contains no provider secrets, invented customer emails, or private prospect conversations. A real commercial rollout would require organization-level authentication, jurisdiction-specific outreach review, data-processing agreements, monitoring, and a paid-capacity decision.

## What I would do next with more time

1. Develop the bounded SDR agent into a durable workflow with explicit tool-call recovery, resumable state, richer planning, and replayable evaluations while preserving the human approval boundary.
2. Replace the shared reviewer password with individual SSO identities and approval roles.
3. Add a verified inbound-email webhook and an owned sending domain after legal and deliverability review.
4. Expand the research corpus and improve extraction recall while preserving exact-excerpt acceptance; never weaken the gates to increase qualification counts.
5. Add queue-backed delivery reconciliation, provider alerts, and a source-retention/deletion policy.
