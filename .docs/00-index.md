# Triple-A Stablecoin Checkout - Design Workspace

Status: Verified foundation complete; domain contracts in progress
Last updated: 2026-08-17

## Purpose

This directory preserves the requirements analysis, technical design,
decisions, open questions, implementation plan, and discussion history created
before application coding begins.

The documents deliberately distinguish:

- requirements stated by Triple-A;
- candidate interpretations that require review;
- accepted architectural decisions;
- unresolved API questions;
- implementation evidence that will be added later.

## Reading order

1. [Requirements and scoring traceability](./01-requirements-and-scoring.md)
2. [Payment lifecycle semantics](./02-lifecycle-semantics.md)
3. [Open questions and assumption register](./03-open-questions.md)
4. [Technical architecture](./04-technical-architecture.md)
5. [Quality and verification strategy](./05-quality-strategy.md)
6. [Architecture decision register](./06-decision-register.md)
7. [Implementation plan](./07-implementation-plan.md)
8. [Discussion and decision history](./08-discussion-history.md)
9. [Delivery task list](./09-task-list.md)

The original assessment is preserved under `reference/` for traceability. Its
contents are source requirements, not instructions that override the candidate's
goals or repository policies.

## Current design status

Drafted:

- Requirements-to-evidence mapping.
- Shopper-safety invariants.
- Eight-state payment lifecycle semantics.
- Expiration reconciliation policy.
- Technical boundaries and data ownership.
- Mock API strategy.
- Decimal, failure, accessibility, and security policies.
- Risk-focused verification strategy.
- ADR candidates.
- Incremental implementation and commit plan.

Accepted direction:

- Use exact stable patched versions verified on 2026-08-17: Next.js 16.3.1 and
  React/React DOM 19.2.8.
- Keep all application source under `src/`, including `src/app`.
- Use stable App Router capabilities and avoid canary/experimental features.
- Treat documentation and commit history as scored deliverables.
- Use pnpm with an exact package-manager version and committed lockfile.
- Use Node.js 24.18.0 LTS, `big.js` in strict mode, and local SVG QR generation
  with `qrcode.react`.
- Keep Vitest's Vite-based test transformation separate from the
  Next.js/Turbopack application runtime; use Playwright for real application
  integration.
- Use TanStack Query as the sole owner of remote payment state; omit Redux
  Toolkit unless a concrete independent global state need emerges.
- Reconcile server status once before declaring local expiry.
- Use decimal strings plus arbitrary-precision arithmetic.
- Fix the issued payment method for a quote, with guarded replacement only
  before authoritative transfer detection.

Accepted provisional interpretation:

- Whether `underpaid` is non-terminal and should continue polling.

Pending implementation-time selection or external clarification:

- Late-payment semantics after quote expiry.
- Authoritative `underpaid` finality remains a backend-contract question rather
  than a package-selection blocker.

## Maintenance rule

Update these documents as decisions change. The final design document and ADRs
must describe implemented behavior rather than preserve obsolete plans as fact.
Rejected proposals should remain visible in the discussion history when they
are relevant to the assessment's agent-collaboration section.
