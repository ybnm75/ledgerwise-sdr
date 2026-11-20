# Zero-cost deployment runbook

## Accounts

Create free accounts or projects for:

1. Turso
2. Google AI Studio / Gemini Developer API
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

## 3. Gemini

Create a free API key in Google AI Studio. Add `GEMINI_API_KEY` and `GEMINI_MODEL` to Vercel and GitHub Actions. Keep billing disabled.

This free tier is suitable for public-company research and synthetic case-study messages. Do not use it for confidential client messages without an appropriate data agreement.

## 4. Firecrawl

Create the no-card free key and add `FIRECRAWL_API_KEY` to GitHub Actions. The code stops at 800 credits per run. Trigger the research workflow manually once before enabling the weekly schedule.

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

Run shard `1/2`, wait for Gemini's next daily free-tier reset, then run shard `2/2`. Combine their LangSmith experiment names into the 150-case release report and preserve the artifacts before the 14-day base-trace retention expires.

## 8. Vercel

Import the public GitHub repository, add all Vercel environment variables, and deploy from `main`. Use the free `vercel.app` URL.

After deployment verify `/api/health` returns:

```json
{"status":"healthy"}
```

## 9. Production smoke test

1. Log in with the reviewer password.
2. Open Research and confirm the latest run and source excerpts.
3. Generate, edit, approve, and reload one draft.
4. Verify an edit after approval returns the revision to pending.
5. Send one message to the configured sandbox recipient.
6. Submit bot, stop, booking, compliance, and prompt-injection Demo Inbox messages.
7. Take over a thread and verify the agent cannot send.
8. Fetch live Google slots and create one test event.
9. Confirm the event appears in Bookings.
10. Confirm Activity contains the approval, reply, ownership, suppression, and booking records.
11. Run both benchmark shards, combine them, and review every blocker.

## Rollback

Use Vercel’s previous deployment. Migrations are additive, so the earlier application remains compatible. Disable scheduled workflows if a provider or schema problem is detected. Never delete suppression or audit data during rollback.
