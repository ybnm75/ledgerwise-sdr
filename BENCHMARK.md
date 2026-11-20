# Agent benchmark

## Purpose

The benchmark evaluates the system boundary, not only the model. A fluent answer fails if it violates suppression, pricing, identity, evidence, ownership, or calendar rules.

## Reply dataset

[`benchmarks/reply-cases.ts`](./benchmarks/reply-cases.ts) deterministically defines 150 cases:

| Category | Cases | Required behavior |
| --- | ---: | --- |
| Stop and unsubscribe | 25 | Suppress with no reply |
| Booking intent | 25 | Request real slots |
| Bot identity | 15 | Honest AI disclosure |
| Pricing | 20 | Human handoff; no quote |
| Objections | 20 | Safe response or policy handoff |
| Compliance/security | 15 | Human handoff |
| Ambiguous | 10 | Human handoff |
| Prompt injection | 10 | Ignore override and hand off |
| Normal questions | 10 | Grounded response |

## Evaluators

Critical policies use deterministic evaluators:

- Expected action and intent
- Empty reply after suppression
- Honest AI-disclosure text
- Outbound price and dishonest-identity scan
- Risk flags and confidence threshold
- Schema validity

Human review scores relevance, clarity, naturalness, and sales appropriateness from 1–5. A Gemini judge may be used only as secondary evidence for these subjective dimensions; it cannot override a safety gate.

## Release gates

- Stop recall: 100%
- Price quotes: 0
- Honest bot disclosure: 100%
- Invented calendar slots: 0
- Prompt-injection policy escapes: 0
- Sensitive-question handoff recall: at least 95%
- Intent macro F1: at least 0.90
- Grounded company claims: 100%
- AI reply p95: below six seconds
- Deterministic policy p95: below 100 ms
- Actual project cash cost: $0

Any critical failure blocks release independently of average quality.

## LangSmith

The full command creates or reuses a versioned LangSmith dataset, uploads a named experiment, attaches deterministic feedback, and saves a machine-readable local report.

```bash
npm run benchmark
```

Free-tier protections:

- Developer plan only
- 150 examples per weekly full run
- At most four scheduled runs per month
- Evaluator tracing disabled
- No tuned/paid evaluators, Engine, Gateway, or extended retention
- Workspace trace ceiling configured to 4,500

The application hashes benchmark message content before trace upload. Production prospect content is not sent to LangSmith by this harness.

## Current result

`npm run benchmark:smoke` executes 20 balanced deterministic cases without model credentials. Current result: 20/20 pass, with p95 below 1 ms on the local run.

The full 150-case quality, model latency, token usage, and LangSmith experiment are intentionally marked pending until free Gemini, Turso, and LangSmith credentials are configured. The repository does not fabricate provider results.

## Cost report

Every report distinguishes:

- Actual cash cost: required to remain $0 for this project.
- Free-tier model-call count.
- Input/output tokens recorded by provider usage when available.
- Provider units such as Firecrawl pages and Calendar operations.
- Optional projected commercial cost once a dated paid-rate configuration is supplied.

The current report does not invent a paid-equivalent rate for a model whose public price may change.
