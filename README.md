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
Inbound demo reply -> hard rules -> structured Groq decision -> reply / handoff / scheduling
                           |                                |
                       suppression                     audit event
```

Scheduled research uses free, robots-aware Scrapy discovery for first-party leadership, press, location, hiring, and company pages. Firecrawl is retained only as a capped fallback for JavaScript-only content. Qualification requires exact excerpts for ecommerce activity, US location, a current trigger, a named decision-maker, and a verified scale signal.

When public crawling cannot establish a gate, the Research workspace includes a human evidence-review flow. The reviewer supplies an approved public URL, supported claim, and exact excerpt; the server independently re-fetches the page, blocks private targets, verifies the excerpt, stores the snapshot, recalculates qualification, and records the action in the audit ledger.

## What is implemented

- Versioned SQL migrations and durable LibSQL/Turso persistence.
- A bounded SDR Agent with explicit tools, qualification and policy gates, human approval, visible step traces, latency/token reporting, and optional LangSmith runtime tracing.
- Signed HTTP-only reviewer sessions, origin checks, login throttling, and security headers.
- Weekly/manual GitHub Actions research pipeline capped at 20 companies, eight Scrapy pages per company, and 200 fallback Firecrawl credits.
- Robots-aware, same-site Scrapy discovery with capped Firecrawl and direct-fetch fallbacks.
- Groq strict-schema extraction; excerpts are stored only when they occur in the captured source text.
- Deterministic qualification with mandatory evidence gates and visible gaps.
- Immutable outreach revisions; editing changes the content hash and requires a new approval.
- Sandbox-only Resend delivery with persisted idempotency and failure states.
- Persistent Demo Inbox, rules-first replies, human ownership, suppression, and duplicate-message protection.
- Google Calendar free/busy calculation, working hours, buffers, minimum notice, DST handling, availability recheck, and idempotent event creation.
- Today, Research, Outreach, Conversations, Bookings, and Activity operator screens.
- LangSmith-compatible 150-case reply benchmark, paced for the free provider token limit, with latency, safety, quality, and zero-cash cost reporting.
- Public health status, CI verification, scheduled research, and scheduled benchmark workflows.

## Honest current state

Local and production provider checks have verified Turso migrations, Groq strict JSON output, Firecrawl-backed research ingestion, Google Calendar booking and invitation delivery, Resend sandbox delivery, and LangSmith authentication. The Groq-backed LangSmith release experiment passed 150/150 cases. The first complete scheduled research run processed 20 companies, accepted 17 evidence-backed records, and safely rejected three unsupported records.

The repository includes 30 real-company candidates as a reproducible fallback. They are not automatically labeled qualified: missing location, current trigger, scale, or decision-maker evidence remains visible until verified.

## Zero-cost stack

| Capability | Service |
| --- | --- |
| Application | Vercel Hobby |
| Repository, CI, schedules | GitHub Free and Actions |
| Database | Turso Free |
| Model | Groq Free Tier (`openai/gpt-oss-20b`) |
| Web extraction | Open-source Scrapy plus capped Firecrawl/direct HTTP fallback |
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
npm run benchmark       # Complete paced 150-case LangSmith evaluation
npm run check            # TypeScript, unit tests, production build
```

## Environment

Copy [.env.example](./.env.example). Production requires durable Turso credentials, a unique reviewer password, and a random signing secret. Each external adapter has its own documented key. No secret belongs in the repository, browser, audit payload, trace, or session export.

## Verification

Current credential-free result:

- 74 JavaScript/TypeScript tests and five Python crawler tests pass.
- All six migrations apply to an empty in-memory database.
- TypeScript passes.
- The optimized Next.js production build passes.
- The deterministic benchmark passes 20/20 cases.
- Dependency audit reports zero known vulnerabilities.
- Authentication smoke test: unauthenticated 401, signed login cookie, protected 200.
- Conversation smoke test: bot disclosure, suppression, human takeover, and handoff all pass.

The 150-case LangSmith release result, focused research smoke test, complete scheduled research run, and production calendar flow pass.

See [ARCHITECTURE.md](./ARCHITECTURE.md), [BENCHMARK.md](./BENCHMARK.md), [DEPLOYMENT.md](./DEPLOYMENT.md), [HOW_I_WORKED.md](./HOW_I_WORKED.md), and [LOOM_SCRIPT.md](./LOOM_SCRIPT.md).
