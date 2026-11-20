# Loom walkthrough script (under 10 minutes)

## 0:00–0:45 — Product boundary

“Ledgerwise Sales Desk researches ecommerce brands, prepares evidence-grounded outreach, supervises replies, and books calls while keeping consequential actions under explicit policy.”

Open **Today**. Point out the task queue, demo-data label, provider status, and the distinction between local proof and pending live-provider verification.

## 0:45–3:00 — Research and outreach

Open **Research** and select a lead. Show the weighted score, source links, exact excerpts, and visible verification gaps. Explain that unknown revenue, headcount, or contacts are never guessed.

Open **Outreach**. Generate a draft, show its cited evidence, edit it, and approve the current revision. Explain that another edit makes it pending again. Show that sending is restricted to the configured Resend sandbox recipient and requires server-side approval.

## 3:00–5:45 — Conversation safety

Open **Conversations** and submit these Demo Inbox messages:

- “Are you a bot?” — honest AI disclosure.
- “Please remove me.” — durable suppression with no outgoing reply.
- “Can we talk Tuesday?” — calendar action, not an invented time.
- A pricing, compliance, or prompt-injection request — human handoff.

Take over a thread and show that the agent can no longer send. Return ownership only after the operator is finished.

## 5:45–7:00 — Booking

Open **Bookings**, request live availability, and choose a returned slot. Explain that business hours, notice, buffer, and time-zone handling are deterministic. The application rechecks Google Calendar immediately before creating the event and records nothing as confirmed until Google succeeds.

## 7:00–8:30 — Audit and architecture

Open **Activity** and show the approval, ownership, suppression, reply, send, and booking records. Then show `ARCHITECTURE.md`: deterministic gates surround Gemini, provider calls are idempotent, secrets stay server-side, and Turso provides durable state.

## 8:30–9:30 — Evidence and limitations

State the verified results: 40 automated tests, successful production build, six fresh migrations, zero known dependency vulnerabilities, and 20/20 local benchmark smoke cases.

Be explicit that the 150-case Gemini/LangSmith run and live Firecrawl, Resend, Turso, and Google Calendar checks remain pending until free provider credentials are configured. Finish with the zero-cost deployment steps in `DEPLOYMENT.md`.
