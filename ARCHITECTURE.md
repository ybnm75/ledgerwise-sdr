# Architecture and safety model

## Boundaries

The system has four replaceable adapters and a policy core:

- OpenAI Responses API: classifies non-obvious replies and drafts short answers as structured output.
- Resend: sends an email only after the stored draft status is `approved`.
- Cal.com v2: returns real slots and creates the booking.
- LibSQL/Turso: persists review state, suppression records, bookings, and audit events.
- Policy core: deterministic rules run before and after model inference.

## Reply state machine

```text
received
  |-- stop language --------------------------> suppressed
  |-- asks if bot ----------------------------> honest AI disclosure
  |-- asks to meet ---------------------------> fetch live slots
  |-- everything else -> structured model
                         |-- confidence < .80 -> human handoff
                         |-- policy violation -> human handoff
                         |-- safe answer ------> proposed reply
```

No model can reverse a suppression. No availability is generated from memory. No outbound message can quote pricing. A provider or database error returns a failure state instead of a fake success.

## Data model

- `lead_state`: the latest draft body, subject, and human decision.
- `audit_events`: append-only action records for drafts, agent decisions, and sends.
- `suppressions`: unique contact keys that block future delivery.
- `bookings`: calendar-confirmed calls.

The 30-company research seed stays in version control for reviewer visibility. Mutable operator actions live in the database.

## Grounding

Each lead stores evidence items with a source URL, source title, capture time, claim, and source note. Email generation receives only those claims. The UI keeps unresolved size, revenue, and contact details visible instead of filling them with estimates.

## Failure behavior

- No OpenAI key: uncertain replies go to a human.
- No Cal.com configuration: the slot endpoint returns a visible configuration error.
- No Resend configuration: send is blocked.
- No database: approvals and side effects return an error; the UI does not claim they were saved.
- Model response missing or low confidence: human handoff.
- Price or dishonest bot language after generation: human handoff.

## Production hardening next

1. Organisation SSO and role-based access.
2. Inbound email webhooks with signature verification.
3. Queue-backed sending and retry policy.
4. Evidence snapshot storage and scheduled recrawling.
5. Rate limits, abuse controls, and per-tenant encryption.
6. OpenTelemetry traces and alerting on handoff, send, and booking failures.
