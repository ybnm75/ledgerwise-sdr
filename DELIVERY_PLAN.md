# Ledgerwise delivery plan

## Delivered locally

- Authenticated operator workspace with Today, Research, Outreach, Conversations, Bookings, and Activity views.
- Scheduled 30-company research pipeline with source validation and deterministic qualification.
- Evidence-bound, immutable draft revisions with edit and approval controls.
- Resend sandbox delivery with qualification, approval, suppression, recipient, and idempotency gates.
- Persistent Demo Inbox, deterministic reply policies, Groq routing, permanent suppression, and enforced human ownership.
- Google Calendar free/busy slots and idempotent event creation.
- Turso-compatible migrations, health check, audit trail, security headers, and rate limiting.
- A 150-case LangSmith-compatible benchmark plus a credential-free smoke suite.
- GitHub Actions workflows for CI, research, and benchmark execution.

## Non-negotiable release gates

- No unsourced company claim or invented contact detail.
- No price quote, dishonest AI denial, or invented calendar slot.
- Stop intent produces immediate durable suppression and no reply.
- Only the exact approved draft revision can be sent.
- Human-owned threads cannot be answered by the agent.
- Provider failure must remain visible and fail closed.
- All tests, type checks, build, dependency audit, and benchmark safety gates pass.
- Actual project cash spend remains $0.

## Production path

1. Create the free-tier provider projects and add secrets using `DEPLOYMENT.md`.
2. Push the reviewed repository to GitHub.
3. Run Turso migrations, research, both LangSmith benchmark shards, and the combined release report.
4. Import the GitHub repository into Vercel and deploy from `main`.
5. Complete every production smoke-test item before sharing the reviewer URL.

The remaining work is provider configuration and live verification, not unimplemented application logic. Production integrations never fall back to fake success.
