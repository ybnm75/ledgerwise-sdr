# Ledgerwise Sales Desk

An audit-first AI SDR workspace built for the Unscale AI Engineer case study. It gives a non-technical sales team one place to review sourced ecommerce leads, approve grounded outreach, supervise replies, stop contact immediately, and book calls against live calendar availability.

## What works

- 30 real ecommerce companies with linked commerce and trigger sources.
- Transparent qualification rationale and explicit research gaps.
- Evidence-grounded first-email drafts with approve, edit, reject, and send controls.
- A hard approval gate before email delivery.
- Deterministic stop, unsubscribe, bot-identity, booking-intent, and price rules.
- Structured OpenAI Responses API decisions for replies outside the hard-rule layer.
- Automatic human handoff below 0.8 confidence or after a policy failure.
- Cal.com v2 live availability and booking adapters.
- LibSQL/Turso persistence for approvals, suppressions, bookings, and audit events.
- Responsive, keyboard-accessible sales UI.

## Architecture

```text
Research evidence -> deterministic score -> grounded draft -> human approval -> email provider
                                                        |
Prospect reply -> hard policy rules -> structured model decision -> reply / slots / handoff
                     |                      |
                 suppression            audit event
```

The model is never the only enforcement layer. Explicit stop language, bot questions, calendar intent, price language, approval state, and suppression state are checked in application code.

## Local setup

Requirements: Node.js 22 and npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The UI and deterministic policy tests work without external credentials. Missing production credentials fail closed: no email is sent, no booking is invented, and uncertain replies go to a human.

## Environment

| Variable | Purpose |
| --- | --- |
| `TURSO_DATABASE_URL` | Persistent LibSQL database URL. `file:local.db` works locally. |
| `TURSO_AUTH_TOKEN` | Turso authentication token. |
| `OPENAI_API_KEY` | Reply classification and drafting. |
| `OPENAI_MODEL` | Defaults to `gpt-6.2-sol`. |
| `CALCOM_API_KEY` | Creates real bookings. |
| `CALCOM_EVENT_TYPE_ID` | Reads availability for the Ledgerwise call type. |
| `RESEND_API_KEY` | Sends only human-approved outreach. |
| `EMAIL_FROM` | Sender on a Resend-verified domain. |

## Verification

```bash
npm run typecheck
npm test
npm run build
```

Current result: 34 tests pass. The Hallmark app-scope static and browser render tiers also pass at 375, 1280, 1440, and 1920 pixels with no failures, reflex findings, or warnings.

## Production deployment

1. Create a Turso database and set its URL and token.
2. Create a Cal.com event type, connect the host calendar, and set its API key and event type ID.
3. Verify a sending domain in Resend and set `EMAIL_FROM`.
4. Add an OpenAI API key and the configured model.
5. Import the repository into Vercel, add the environment variables, and deploy.
6. Exercise one approval, one stop reply, one bot question, one live slot fetch, one test booking, and one test-domain email before sharing the URL.

For a client deployment, add organisation authentication and use a Vercel Pro or equivalent commercial hosting plan. The case-study build is public by design so reviewers do not need credentials.

## Honest limitations

- Employee count, revenue band, and a named decision-maker are deliberately shown as gaps when the public research did not establish them. The agent must not turn assumptions into facts.
- The repository ships no secrets. OpenAI, Cal.com, Resend, Turso, Vercel, and GitHub must be connected by the account owner.
- The included research dataset is a case-study seed. A production researcher should refresh evidence on a schedule and store page snapshots or hashes for traceability.
- Cold outreach must be reviewed for applicable consent, identification, and unsubscribe requirements before real sending.

See [HOW_I_WORKED.md](./HOW_I_WORKED.md), [ARCHITECTURE.md](./ARCHITECTURE.md), and [LOOM_SCRIPT.md](./LOOM_SCRIPT.md).
