# Triple-A Stablecoin Checkout - Design Workspace

Status: Implemented and release-verified; final review remains
Last updated: 2026-08-18

## Purpose

This directory preserves the requirements analysis, final implemented design,
accepted decisions, open questions, delivery evidence, and discussion history.

The documents deliberately distinguish:

- requirements stated by Triple-A;
- candidate interpretations that require review;
- accepted architectural decisions;
- unresolved API questions;
- final implementation and verification evidence.

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

## Current delivery status

Implemented and verified:

- Requirements-to-evidence mapping.
- Shopper-safety invariants.
- Eight-state payment lifecycle semantics.
- Expiration reconciliation policy.
- Technical boundaries and data ownership.
- Mock API strategy.
- Decimal, failure, accessibility, and security policies.
- Risk-focused verification strategy.
- Five accepted, implementation-reviewed ADRs.
- Critical lifecycle, recovery, method-commitment, and accessibility browser
  journeys.

Final accepted direction:

- Use exact stable patched versions rechecked on 2026-08-18: Next.js 16.3.1,
  React/React DOM 19.2.8, and Node.js 24.19.0 LTS.
- Keep all application source under `src/`, including `src/app`.
- Use stable App Router capabilities and avoid canary/experimental features.
- Treat documentation and commit history as scored deliverables.
- Use pnpm with an exact package-manager version and committed lockfile.
- Use Node.js 24.19.0 LTS, `big.js` in strict mode, and local SVG QR generation
  with `qrcode.react`.
- Keep Vitest's Vite-based test transformation separate from the
  Next.js/Turbopack application runtime; use Playwright for real application
  integration.
- Use TanStack Query as the sole owner of remote payment state; omit Redux
  Toolkit unless a concrete independent global state need emerges.
- Reconcile server status once before declaring local expiry.
- Use decimal strings plus arbitrary-precision arithmetic.
- Fix the issued payment method for a quote, with direct replacement available
  only before authoritative transfer detection.

Accepted contract interpretation:

- `underpaid` is non-terminal. Its `amount_outstanding` and `crypto_address`
  fields define a same-reference top-up on the issued payment method; polling
  continues until the backend reports the next lifecycle state.

Pending external contract clarification:

- Late-payment semantics after quote expiry.
- Triple-A production refund/tolerance policy is outside the supplied
  assessment contract.

## Maintenance rule

Update these documents as decisions change. The final design document and ADRs
must describe implemented behavior rather than preserve obsolete plans as fact.
Rejected proposals should remain visible in the discussion history when they
are relevant to the assessment's agent-collaboration section.
