# Zero-cost deployment runbook

## Accounts

Create free accounts or projects for:

1. Turso
2. GroqCloud
3. Firecrawl
4. Google Cloud Calendar API
5. Resend
6. LangSmith Developer

GitHub and Vercel are already the repository and application targets.

Do not enable paid plans, automatic top-ups, or overages.

## 1. Turso

Create one free database and token. Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to GitHub Actions and Vercel. Run:

```bash
npm run db:migrate
```

The production health endpoint stays degraded until migration 006 exists.

## 2. Reviewer authentication

Generate:

- A unique `APP_PASSWORD` of at least ten characters.
- A random `AUTH_SECRET` of at least 32 characters.

Add both to Vercel only. Provide the reviewer password in the submission email, never in the public repository.

## 3. Groq

Create a free GroqCloud API key. Add `GROQ_API_KEY` and `GROQ_MODEL=openai/gpt-oss-20b` to Vercel and GitHub Actions. Do not upgrade to a paid plan.

Enable Zero Data Retention in Groq Data Controls. This free tier is suitable for public-company research and synthetic case-study messages. Do not use it for confidential client messages without an appropriate data agreement.

## 4. Firecrawl

Create the no-card free key and add `FIRECRAWL_API_KEY` to GitHub Actions. The code stops at 200 credits per run. Trigger the research workflow manually once before enabling the weekly schedule.

## 5. Google Calendar

Create a dedicated demo calendar and Google Cloud OAuth client. Enable the Calendar API and authorize only the required calendar scopes. Add:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID`
- `GOOGLE_CALENDAR_TIME_ZONE=America/New_York`

Use a dedicated demo calendar rather than a personal calendar. Do not enable paid quota increases.

## 6. Resend sandbox

Create a free Resend key. Configure:

- `RESEND_API_KEY`
- `EMAIL_FROM` using Resend’s permitted test sender
- `TEST_RECIPIENT_EMAIL` using the account-owner test address

Delivery to any other address is rejected by the server.

## 7. LangSmith

Create a Developer workspace and set its trace limit to 4,500. Add `LANGSMITH_API_KEY` to GitHub Actions. Do not enable paid products or extended retention.

Run the paced 150-case benchmark once, review every blocker, and preserve the artifact before the 14-day base-trace retention expires.

## 8. Vercel

Import the public GitHub repository, add all Vercel environment variables, and deploy from `main`. Use the free `vercel.app` URL.

After deployment verify `/api/health` returns:

```json
{"status":"healthy"}
```

## 9. Production smoke test

1. Log in with the reviewer password.
2. Open Research and confirm the latest run and source excerpts.
3. Confirm unqualified leads cannot be approved. If a qualified lead exists, generate, edit, approve, and reload its current draft.
4. Verify an edit after approval creates a pending revision and that stale evidence blocks delivery.
5. For a qualified, approved lead only, send one message to the configured sandbox recipient. Otherwise verify the sandbox provider separately and preserve the qualification block.
6. Submit bot, stop, booking, compliance, and prompt-injection Demo Inbox messages.
7. Take over a thread and verify the agent cannot send.
8. Fetch live Google slots and create one test event.
9. Confirm the event appears in Bookings.
10. Confirm Activity contains the approval, reply, ownership, suppression, and booking records.
11. Run the complete benchmark and review every blocker.

## Rollback

Use Vercel’s previous deployment. Migrations are additive, so the earlier application remains compatible. Disable scheduled workflows if a provider or schema problem is detected. Never delete suppression or audit data during rollback.
