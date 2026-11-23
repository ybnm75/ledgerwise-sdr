# Submission package

## Links to send

- Live platform: https://ledgerwise-sdr.vercel.app
- Public code: https://github.com/ybnm75/ledgerwise-sdr
- Reviewer password: send the current `APP_PASSWORD` privately in the email; do not add it here or to GitHub.
- Walkthrough: record the final Loom from [`LOOM_SCRIPT.md`](./LOOM_SCRIPT.md) and paste its URL in the email.
- AI session export: attach the original, unedited Codex session files from `%USERPROFILE%\.codex\sessions\`.

## Requirements traceability

| Case requirement | Delivered evidence | Status |
| --- | --- | --- |
| Research at least 30 real companies that fit | `research-candidates.json` contains 30 named domains and all 30 were processed. Production stores 29 exact-source records; one candidate was safely rejected because ecommerce activity was not supported. A literal set of 30 evidence-backed fits is not demonstrated. | Partially met; disclose clearly |
| Qualify and explain fit | Deterministic weighted gates, linked excerpts, visible gaps, score, rationale, and one currently qualified Nulo record. The other 28 sourced records remain in review because one or more mandatory facts are unverified. | Met functionally; limited qualified volume |
| Draft grounded first emails | Bounded SDR agent creates an immutable revision only from verified citations; the UI exposes the subject, body, evidence, and grounding result. | Met |
| Answer prospect replies | Persistent Demo Inbox applies rules before Groq, handles safe replies, and hands pricing, compliance, injection, risk, and uncertainty to a person. It is simulated and not connected to a real inbound-email webhook. | Partially met in supervised demo mode |
| Stop permanently | Stop/not-interested language writes durable suppression before any model call and sends no reply. | Met |
| Honest bot disclosure | Bot questions receive a fixed honest disclosure. | Met |
| Book real calls | Google free/busy, deterministic slots, last-moment recheck, idempotent event insertion, stored provider ID, and received invitation. | Met |
| Human-controlled daily platform | Today, Research, Outreach, Conversations, Bookings, and Activity desks; approve/edit/reject, takeover, and audit controls. | Met |
| UI quality | Responsive semantic design system, accessible labels/focus states, status feedback, and automated desktop/mobile browser verification. | Met |
| Live deployment | Vercel production health and authenticated six-desk browser smoke pass. | Met |
| Public code | GitHub repository with CI, schedules, migrations, tests, architecture, benchmark, and runbook. The final documentation commit must still be pushed from the local branch. | Core code met; final push pending |
| HOW_I_WORKED.md | Tools, decisions, plan changes, AI mistakes, quantitative evaluation, costs, privacy, and next steps. | Met |
| AI session export | Must be attached unedited from the local Codex sessions directory; it should not be committed to the public repository. | Human submission step |
| Loom under 10 minutes | A timed script is ready in `LOOM_SCRIPT.md`; recording and uploading require the applicant. | Human submission step |

## Strict audit conclusion

The deployed project covers the five requested product capabilities and the non-technical sales workspace end to end. Research, qualification, grounded drafting, supervised replies, calendar booking, human approval, takeover, policy enforcement, auditability, hosting, testing, and quantitative evaluation are implemented.

It should not be described as having zero remaining gaps. The strict limitations are:

1. The 30-company corpus was processed, but only 29 companies produced acceptable exact-source records and only Nulo currently passes every mandatory qualification gate.
2. Reply handling is exercised through a persistent supervised Demo Inbox, not a verified real inbound-email webhook.
3. The SDR agent is a bounded orchestration workflow rather than the deeper durable autonomous agent described as future work in `HOW_I_WORKED.md`.
4. The Loom recording, unedited Codex export, private password delivery, submission email, and two-week uptime obligation are human-owned submission steps.

## Quantitative evidence

- 74 JavaScript/TypeScript tests and five Python crawler tests pass.
- The optimized Next.js production build passes.
- GitHub verification passes on Node 24 action runtimes.
- Production dependency audit: zero known vulnerabilities.
- Browser smoke: authentication, six desks, accessible control names, desktop/mobile overflow, mobile action order, console errors, and HTTP 5xx checks pass locally and on Vercel.
- Research: 30 candidates processed, 29 accepted with durable exact-source evidence, one safe rejection, one qualified lead, and 28 honest review records.
- Benchmark: 150/150 total and 110/110 critical cases pass; 30 model calls; 5.15-second p95 including deliberate free-tier pacing; $0 actual cash cost.
- Calendar invite and Resend sandbox email were received successfully.

## Submission email template

Subject: `Unscale AI Engineer Case Study — Ledgerwise Sales Desk`

```text
Hi Unscale team,

Here is my completed AI Engineer case study:

Live platform: https://ledgerwise-sdr.vercel.app
Reviewer password: [paste privately here]
Public repository: https://github.com/ybnm75/ledgerwise-sdr
Loom walkthrough: [paste Loom URL here]

I have attached the complete, unedited Codex session export. HOW_I_WORKED.md is included in the repository.

The deployed system is intentionally supervised: first outreach requires approval, delivery is restricted to the configured sandbox recipient, replies fail closed to a human, and calendar slots come from the live Google Calendar integration.

Best,
Ahmed
```

## Final human-only checklist

- [ ] Record and upload the Loom using `LOOM_SCRIPT.md` (maximum 10 minutes).
- [ ] Export and attach every unedited Codex session file.
- [ ] Paste the private reviewer password into the email.
- [ ] Send the email and keep the Vercel deployment online for at least two weeks.
