# Loom walkthrough script (under 10 minutes)

## 0:00 to 0:45 - What this is

“This is the Ledgerwise Sales Desk. It helps the sales team research ecommerce brands, review grounded outreach, supervise replies, and book calls while keeping a human in control.”

Show the four task tabs and the active policy indicator.

## 0:45 to 3:15 - Lead review

Open a lead. Show the score, rationale, direct source links, source notes, and the “Verify before sending” gaps. Explain that unknown revenue, headcount, and contacts are not guessed.

Show the draft beside its evidence. Edit one line, reject it, then approve it. Explain that approval is stored in the audit ledger and is required server-side before sending.

Show the verified recipient field. Explain that the repository contains no invented addresses and Resend is blocked until a verified recipient and provider credentials exist.

## 3:15 to 6:15 - Conversation safety

Open Conversations. Show an interested reply, an unsubscribe reply, and a compliance question routed to a human.

Use the policy test with:

- “Are you a bot?” Show the honest fixed disclosure.
- “Please remove me.” Show suppression and no outgoing reply.
- “Can we talk Tuesday?” Show the live-slot action.
- A nuanced objection. Explain the 0.8 confidence threshold and handoff.

## 6:15 to 7:30 - Booking

Open Bookings and click “Check live slots.” With Cal.com configured, show actual availability. Explain that no time is invented and no meeting appears until Cal.com confirms it.

## 7:30 to 9:00 - Under the hood

Show the architecture diagram in the README. Emphasise deterministic rules before and after the model, structured outputs, server-side approval, suppression storage, idempotent email delivery, and audit events.

Mention the 34 passing tests, clean production build, zero dependency vulnerabilities, and clean desktop/mobile render sweep.

## 9:00 to 9:45 - Honest limitations and next step

State that service credentials and verified contacts are intentionally absent from the public repository. Explain the next production steps: connect accounts, add organisation authentication, verify the 30 contacts, and run end-to-end provider tests.
