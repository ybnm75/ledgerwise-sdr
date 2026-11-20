# Ledgerwise delivery plan

## Outcome

A deployed sales workspace where Ledgerwise can inspect sourced leads, understand qualification scores, approve or edit outreach, take over conversations, and see calendar bookings. AI actions are constrained by explicit policy and written to an audit trail.

## Build order

1. Lead workbench: sourced evidence, deterministic qualification, grounded draft, approve/edit/reject.
2. Conversation desk: intent classification, safe response drafting, stop-list enforcement, human handoff.
3. Booking: Cal.com availability adapter and booking flow with a local test double.
4. Persistence and access: LibSQL/Turso data layer, seed data, shared-password demo login.
5. Verification: policy unit tests, 30-reply evaluation set, accessibility and production build checks.
6. Delivery: deploy, public repository, HOW_I_WORKED.md, walkthrough script, session export checklist.

## Non-negotiable policies

- No price quotes.
- Every company-specific claim must cite stored evidence.
- Stop, unsubscribe, and not-interested intents suppress all future outreach immediately.
- Bot questions receive an honest answer.
- Low-confidence or policy-sensitive replies are handed to a human.
- No outbound message is sent without explicit approval in this case-study build.

## Production adapters

- AI: OpenAI through the AI SDK with structured Zod outputs.
- Calendar: Cal.com API behind a narrow adapter.
- Database: Drizzle over LibSQL/Turso.
- Deployment target: Vercel, with environment variables documented in `.env.example`.

The app has deterministic local fallbacks for development and evaluation; production integrations fail closed when credentials are absent.
