# Architecture and safety model

## Deployment boundary

```text
GitHub Actions                    Vercel
  scheduled research ----------> Next.js operator workspace
  weekly benchmark                 authenticated route handlers
          |                                  |
          +---------------- Turso -----------+
                              |
          Gemini · Firecrawl · Google Calendar · Resend sandbox · LangSmith
```

Vercel serves the application and synchronous APIs. Long research runs execute in GitHub Actions. Turso is the durable source of truth; a file database is rejected on Vercel.

## Application layers

1. Operator UI: task queues and evidence, not provider internals.
2. Route handlers: authentication, origin checks, schema validation, and authorization.
3. Policy core: deterministic approval, suppression, identity, pricing, confidence, and booking rules.
4. Provider adapters: Gemini, Firecrawl, Google Calendar, Resend sandbox, and LangSmith.
5. Persistence: migrations, immutable revisions, audit events, quota counters, and recovery states.

## Research pipeline

```text
schedule/manual trigger
  -> create research run
  -> deduplicate canonical domains
  -> fetch at most five public pages
  -> reject private network targets
  -> structured evidence extraction
  -> verify excerpt occurs in captured text
  -> deterministic qualification
  -> human review queue
```

The model cannot directly qualify a company. It proposes structured evidence. Application code validates the source index and exact excerpt, then calculates the score from unique evidence classes.

Mandatory qualification gates are ecommerce activity, US location, a current trigger, and a decision-maker. Revenue and employee evidence contribute to fit and remain explicit gaps when absent.

## Outreach state machine

```text
generated -> pending review -> approved -> sending -> sent
     |              |             |
     |              +-> rejected  +-> edited -> new pending revision
     +-> superseded
```

Every revision is immutable and content-hashed. Sending reloads the latest database revision, verifies approval, checks qualification and suppression, restricts the recipient to the sandbox address, and reserves a persistent idempotency key before contacting Resend.

## Reply state machine

```text
inbound
  |-- stop language ----------------------> suppress permanently
  |-- bot question -----------------------> honest fixed disclosure
  |-- booking intent ---------------------> scheduling requested
  |-- human owns thread ------------------> handoff
  |-- everything else -> structured Gemini decision
                         |-- risk flag ----> handoff
                         |-- confidence < .80 -> handoff
                         |-- policy failure --> handoff
                         |-- safe reply ------> simulated auto reply
```

Prospect text is untrusted data, never a system instruction. Deterministic checks run before and after inference. Ownership is stored in the database, so clicking Take over prevents later automatic replies at the API layer.

## Booking state machine

```text
intent -> free/busy -> calculated slots -> selected slot
                                      -> recheck exact interval
                                      -> Google event
                                      -> confirmed database record
```

Slots are calculated in `America/New_York` using weekdays, 09:00–17:00 hours, 30-minute duration, 15-minute buffers, and 24-hour minimum notice. All stored instants are UTC. Google Calendar is rechecked immediately before event creation. Confirmation requires a provider event ID.

## Data model

- Research: `research_runs`, `research_tasks`, `companies`, `evidence`, `contacts`, `qualification_results`, `source_snapshots`.
- Outreach: `drafts`, `send_attempts`, `suppressions`.
- Conversations: `threads`, `messages`, `agent_decisions`, `thread_ownership`.
- Booking: `bookings`.
- Operations: `audit_events`, `auth_events`, `provider_usage`, `quota_usage`, `schema_migrations`.

Legacy `lead_state` remains for migration compatibility but is no longer the authoritative outreach store.

## Authentication and request security

- Shared case-study reviewer password stored only in Vercel secrets.
- HMAC-signed, HTTP-only, Secure, SameSite session cookie.
- Constant-time password and signature comparison.
- Five login attempts per 15-minute database-backed window.
- Authentication on every application API.
- Same-origin validation for mutations.
- Zod input limits and unexpected-field rejection.
- CSP, frame denial, referrer, content-type, and permissions headers.

This shared account is intentionally limited to the case-study review. A real organization requires individual identities, SSO, roles, and revocation.

## Free-tier protection

- Maximum 40 research companies and five pages each.
- Maximum 800 Firecrawl credits per research run.
- 500 internal Gemini calls per 30-day operation window.
- Weekly research and benchmark schedules.
- LangSmith experiment size capped at 150 examples and workspace target capped at 4,500 traces.
- Resend restricted to one configured test address.
- No automatic paid-overage configuration.

## Failure behavior

- Missing Gemini: nuanced messages hand off; drafting and research fail visibly.
- Missing Firecrawl: research uses the public direct-fetch fallback where safe.
- Missing Google Calendar: availability and booking return configuration errors.
- Missing Resend: no email is sent.
- Missing Turso on Vercel: health is degraded and data operations fail.
- Provider response uncertainty: operation remains failed or requires reconciliation; success is never invented.
- Low confidence, risk flags, price language, or dishonest bot language: human handoff.

## Remaining production hardening beyond the case study

- Organization SSO and role-based approval permissions.
- Real inbound-email webhook with signature verification and owned sending domain.
- Commercial provider/privacy terms for real prospect data.
- Queue-backed send reconciliation and alerts.
- Source-snapshot retention policy and deletion tooling.
- Legal review for consent, identification, and unsubscribe obligations.
