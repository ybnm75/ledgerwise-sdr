# Loom walkthrough script (under 10 minutes)

## 0:00–0:45 — Product boundary

“Ledgerwise Sales Desk researches ecommerce brands, prepares evidence-grounded outreach, supervises replies, and books calls while keeping consequential actions under explicit policy.”

Open the live URL and sign in. On **Today**, point out the human-decision queue, policy-active state, and the explicit demonstration boundary.

## 0:45–3:00 — Research and outreach

Open **Research** and select a lead. Show the weighted score, source links, exact excerpts, and visible verification gaps. Open **Verify public evidence** and explain that a reviewer can supply an approved public source, but the server re-fetches it and accepts only an exact matching excerpt. Unknown facts are never guessed.

Open **Outreach**. Show that incomplete research disables generation and approval instead of presenting a false success state. If a qualified lead is available, generate a draft, show its current evidence, edit it, and approve that exact revision. Explain that another edit makes it pending again and that delivery is restricted to the configured Resend sandbox recipient.

Run the **SDR Agent** for the qualified lead. Walk through its visible inspect, retrieval, qualification, generation, policy, and human-approval steps. Point out citations, model, tokens, latency, zero cash cost, and LangSmith trace status. Emphasize that the agent stops before delivery.

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

Open **Activity** and show the approval, ownership, suppression, reply, send, and booking records. Then show `ARCHITECTURE.md`: deterministic gates surround Groq, provider calls are idempotent, secrets stay server-side, and Turso provides durable state.

## 8:30–9:30 — Evidence and limitations

State the verified results: 74 JavaScript/TypeScript tests plus five Python crawler tests, successful production build, six fresh migrations, zero known production dependency vulnerabilities, 20/20 local benchmark smoke cases, 150/150 LangSmith release cases, and automated desktop/mobile production verification across all six desks.

Be explicit that all 30 named research candidates were processed: 29 have durable exact-source evidence, while one was safely rejected because ecommerce activity was not supported. Show Nulo as the qualified example, then finish with the zero-cost deployment architecture and the remaining demo-only limitations in `DEPLOYMENT.md`.
