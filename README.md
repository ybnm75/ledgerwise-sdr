# Ledgerwise Sales Desk

An audit-first AI SDR workspace for the Unscale AI Engineer case study. It researches ecommerce companies on a schedule, qualifies them with visible evidence, drafts grounded outreach, supervises replies, stops contact immediately, and books against a real calendar while keeping a salesperson in control.

## Product boundary

- First outreach always requires human approval.
- Safe replies may be automatic only above the confidence threshold and after deterministic policy checks.
- Stop requests, bot disclosure, approval, suppression, pricing, and calendar truth never depend on model judgment alone.
- The live review build uses a clearly labeled Demo Inbox and sandbox email recipient. It does not conduct a real cold-email campaign.

## Workflow

```text
Scheduled research -> exact source excerpts -> deterministic qualification
                                              |
                                              v
Grounded draft -> edit/reject/approve exact revision -> sandbox delivery
                                              |
Inbound demo reply -> hard rules -> structured Gemini decision -> reply / handoff / scheduling
                           |                                |
                       suppression                     audit event
```

## What is implemented

- Versioned SQL migrations and durable LibSQL/Turso persistence.
- Signed HTTP-only reviewer sessions, origin checks, login throttling, and security headers.
- Weekly/manual GitHub Actions research pipeline capped at 40 companies, five pages per company, and 800 Firecrawl credits.
- Firecrawl v2 with a direct-fetch fallback and private-network/SSRF rejection.
- Gemini structured extraction; excerpts are stored only when they occur in the captured source text.
- Deterministic qualification with mandatory evidence gates and visible gaps.
- Immutable outreach revisions; editing changes the content hash and requires a new approval.
- Sandbox-only Resend delivery with persisted idempotency and failure states.
- Persistent Demo Inbox, rules-first replies, human ownership, suppression, and duplicate-message protection.
- Google Calendar free/busy calculation, working hours, buffers, minimum notice, DST handling, availability recheck, and idempotent event creation.
- Today, Research, Outreach, Conversations, Bookings, and Activity operator screens.
- LangSmith-compatible 150-case reply benchmark, split into two 75-case free-tier shards, with latency, safety, quality, and zero-cash cost reporting.
- Public health status, CI verification, scheduled research, and scheduled benchmark workflows.

## Honest current state

Local provider checks have verified Turso migrations, Gemini model access, a Firecrawl scrape, Google Calendar availability, Resend sandbox delivery, and LangSmith authentication. The corrected two-shard 150-case model experiment and scheduled research run remain production gates.

The repository includes 30 real-company candidates as a reproducible fallback. They are not automatically labeled qualified: missing revenue, employee count, or decision-maker evidence remains visible.

## Zero-cost stack

| Capability | Service |
| --- | --- |
| Application | Vercel Hobby |
| Repository, CI, schedules | GitHub Free and Actions |
| Database | Turso Free |
| Model | Gemini Developer API Free Tier |
| Web extraction | Firecrawl Free Tier plus direct HTTP fallback |
| Calendar | Google Calendar API |
| Test delivery | Resend Free sandbox |
| Evaluation | LangSmith Developer |

The application has hard internal quotas and no paid overage path. A real commercial client deployment would require appropriate commercial plans, privacy terms, authentication, and outreach-compliance review.

## Local setup

Requirements: Node.js 22 and npm.

```bash
npm install
copy .env.example .env.local
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`. Without `.env.local`, local development uses reviewer password `ledgerwise-demo` and a local database. External providers fail closed.

## Commands

```bash
npm run db:migrate       # Apply versioned migrations
npm run research         # Run capped research pipeline; provider keys required
npm run benchmark:smoke  # 20 deterministic safety cases
npm run benchmark -- --shard=1/2  # First 75-case free-tier shard
npm run benchmark -- --shard=2/2  # Second shard after the daily reset
npm run check            # TypeScript, unit tests, production build
```

## Environment

Copy [.env.example](./.env.example). Production requires durable Turso credentials, a unique reviewer password, and a random signing secret. Each external adapter has its own documented key. No secret belongs in the repository, browser, audit payload, trace, or session export.

## Verification

Current credential-free result:

- 43 unit and policy tests pass.
- All six migrations apply to an empty in-memory database.
- TypeScript passes.
- The optimized Next.js production build passes.
- The deterministic benchmark passes 20/20 cases.
- Dependency audit reports zero known vulnerabilities.
- Authentication smoke test: unauthenticated 401, signed login cookie, protected 200.
- Conversation smoke test: bot disclosure, suppression, human takeover, and handoff all pass.

The combined corrected 150-case LangSmith result and scheduled research output remain deployment gates, not assumed successes.

See [ARCHITECTURE.md](./ARCHITECTURE.md), [BENCHMARK.md](./BENCHMARK.md), [DEPLOYMENT.md](./DEPLOYMENT.md), [HOW_I_WORKED.md](./HOW_I_WORKED.md), and [LOOM_SCRIPT.md](./LOOM_SCRIPT.md).
