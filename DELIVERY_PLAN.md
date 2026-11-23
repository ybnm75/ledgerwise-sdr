# Ledgerwise delivery plan

## Delivered and deployed

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

## Production evidence

1. Free-tier provider projects and secrets are configured without paid overages.
2. The reviewed public repository deploys automatically from `main`.
3. Turso migrations, the 30-company research corpus, and the 150-case LangSmith release benchmark have run successfully.
4. Vercel serves the authenticated application at `https://ledgerwise-sdr.vercel.app`.
5. Local and production browser smoke tests cover authentication, all six desks, accessibility names, responsive overflow, console errors, and HTTP failures.

The remaining tasks are the applicant-owned Loom recording, unedited Codex session export, and submission email listed in `SUBMISSION.md`. Production integrations never fall back to fake success.
