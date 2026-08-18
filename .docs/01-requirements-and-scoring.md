# Requirements and Scoring Traceability

Status: Final implementation traceability review
Scope: Assessment requirements, implementation evidence, and explicit omissions

## Purpose

This document converts the assessment brief into verifiable product and
engineering outcomes. The final review distinguishes:

- **Requirement**: stated explicitly by the assessment.
- **Interpretation**: a product or engineering decision derived from
  the requirement.
- **Open question**: behavior that the supplied contract does not define well
  enough to treat as fact.

Accepted interpretations are recorded in the technical design and ADRs.
Unresolved contract semantics remain explicit assumptions rather than being
presented as Triple-A API guarantees.

## Decision priority

When requirements compete for time, make decisions in this order:

1. Prevent the shopper from losing funds.
2. Preserve payment-lifecycle correctness.
3. Behave safely under timing and transport failures.
4. Preserve exact monetary values.
5. Make behavior understandable and accessible to the shopper.
6. Keep the solution explainable and easy to extend during the follow-up call.
7. Improve visual polish.

This order follows the assessment's scoring criteria. It is not permission to
omit a mandatory requirement; it determines implementation and testing effort.

## Product requirements

| ID | Requirement | Source | Final evidence | Priority |
| --- | --- | --- | --- | --- |
| PR-01 | Show merchant name, order reference, and EUR 149.90 formatted for the shopper's locale. | What to build: Summary | `order-summary.tsx`, checkout-session configuration, and `issued-payment-flow.test.tsx` | Required |
| PR-02 | Support every documented currency/network combination. | What to build: Currency and network | API-driven selector, currency contract tests, and `mock-api.spec.ts` | Required |
| PR-03 | Fetch a new quote when currency or network changes. | What to build: Currency and network | `use-create-payment.ts`, direct awaiting-state method-change flow, API race tests, and `payment-method-commitment.spec.ts` | Critical |
| PR-04 | Make the selected network impossible to miss. | What to build; Shopper safety score | Selector cards, commitment summary, instructions, network warning, QR caption, and `quote-accessibility.spec.ts` | Critical |
| PR-05 | Show the exact crypto amount, address, QR code, and copy action. | What to build: Quote | `payment-instructions.tsx`, local QR generation, address-copy tests, and QR/address browser assertions | Critical |
| PR-06 | Show a countdown to the absolute `expires_at` value. | What to build: Quote | Absolute-deadline hook/component with fake-time tests | Critical |
| PR-07 | Keep the countdown correct after the tab has been backgrounded. | What to build; Correct when things go wrong score | Focus/visibility recomputation tests and `expiry-race.spec.ts` background time jump | Critical |
| PR-08 | At zero, show an expired state and a way to request a new quote. | What to build: Quote | Deadline reconciliation, expired presenter, requote hook, component tests, and `requote.spec.ts` | Critical |
| PR-09 | Poll `GET /api/payments/:reference` while the payment is active. | What to build: Waiting | Reference-scoped TanStack Query polling, lifecycle tests, and `happy-path.spec.ts` | Critical |
| PR-10 | Interpret `detected` as funds received with zero confirmations. | What to build: Waiting | Exhaustive presenter copy/tests and detected Axe/browser coverage | Critical |
| PR-11 | Once funds are detected, prevent quote expiration from replacing the payment state. | What to build: Waiting | Deadline-reconciliation tests and detected-wins branch in `expiry-race.spec.ts` | Critical |
| PR-12 | Stop polling on terminal states. | What to build: Waiting | Polling-policy tests and paid request-count assertion in `happy-path.spec.ts` | Critical |
| PR-13 | Do not leak intervals or issue overlapping polling requests. | What to build; Correct when things go wrong score | Hook cleanup tests and maximum-concurrency assertion in `adverse-transport.spec.ts` | Critical |
| PR-14 | Present all documented API states meaningfully to the shopper. | Edge cases | Exhaustive status contracts/presenters plus all-eight-state API and accessibility matrices | Required |
| PR-15 | Visually and semantically distinguish outcomes the shopper can fix from outcomes they cannot fix. | Edge cases; What the shopper can fix score | Action taxonomy, semantic headings/status regions, presenter tests, and zero-violation Axe matrix | Critical |
| PR-16 | Handle slow responses and transport/server failure safely. | Mock API; scoring | Deterministic delay/failure controls, bounded retry, connectivity notice, and `adverse-transport.spec.ts` | Critical |
| PR-17 | Allow every payment state, a network error, and a slow response to be triggered on demand. | Mock API | Compact development drawer, HTTP evaluator endpoints, `mock-api.spec.ts`, and README scenario guide | Required |
| PR-18 | Implement only the hosted shopper payment page. | Context and out of scope | Repository contains no auth, wallet integration, merchant dashboard, production persistence, or separate backend | Scope guard |

## Monetary correctness requirements

| ID | Requirement | Final evidence |
| --- | --- | --- |
| MR-01 | Preserve all API money amounts as decimal strings at the transport boundary. | Zod decimal-string primitives, inferred contract types, and contract tests |
| MR-02 | Never use binary floating-point arithmetic for money. | `money.ts` uses `big.js` strict mode; money tests and final source audit |
| MR-03 | Support six decimal places for USDT/USDC and eighteen for ETH. | Catalog-driven precision validation and six/eighteen-decimal boundary tests |
| MR-04 | Never render transfer values in scientific notation. | Exact crypto formatter and minimum-unit ETH tests |
| MR-05 | Do not silently round an exact amount that the shopper must transfer. | Precision rejection and authoritative-value display tests |

## Documentation requirements

| ID | Deliverable | Final evidence |
| --- | --- | --- |
| DR-01 | Design document: payment lifecycle state model | Implemented lifecycle diagram and authority rules in `04-technical-architecture.md` |
| DR-02 | Design document: component structure and data flow | Implemented module tree and component/data-flow diagram in `04-technical-architecture.md` |
| DR-03 | Design document: background-tab-safe countdown | Countdown and expiry-race design in `04-technical-architecture.md`; ADR-0003 |
| DR-04 | Design document: decimal precision strategy | Money section in `04-technical-architecture.md`; ADR-0004 |
| DR-05 | Design document: shopper-facing failure handling | Failure-handling matrix in `04-technical-architecture.md` |
| DR-06 | Design document: one defended decision or first future change | Status-before-expiry reconciliation decision in `04-technical-architecture.md` |
| DR-07 | ADRs | Five accepted, implementation-reviewed ADRs linked from `06-decision-register.md` |
| DR-08 | README | Exact prerequisites, install, run, and verification commands |
| DR-09 | README | UI and HTTP instructions for every status, slow response, and network failure |
| DR-10 | README | Explicit omission and prioritization table |
| DR-11 | README | Three factual rejected/corrected outputs, candidate improvement, and lifecycle clarification |
| DR-12 | Repository | Unsquashed focused history and committed living `AGENTS.md` |

## Shopper-safety invariants

The following are accepted acceptance criteria derived directly from the
scoring section:

1. The visible amount, asset, network, address, and QR payload always belong to
   the same quote.
2. A stale quote response can never overwrite a newer selection.
3. Once a quote is issued, currency and network are presented as fixed quote
   attributes rather than live selectors. While status remains
   `awaiting_payment`, changing them directly invalidates the displayed
   instructions and returns to selection. After any funds are detected,
   changing them is unavailable.
4. A payment reported as `detected` or later can never be replaced by a local
   quote-expired screen.
5. A transport error can never be presented as a blockchain/payment failure.
6. The interface never promises an overpayment refund because the API contract
   does not provide that guarantee.
7. The interface never asks the shopper to submit another full payment after a
   settlement failure without an explicit safe backend instruction.
8. Copy and QR actions use the exact currently visible payment instruction.
9. Color is never the only indication of payment status or required action.
10. Copying an address or scanning a QR code is not treated as evidence that a
    blockchain transaction started; only an authoritative payment-status
    response can establish detection.

## Scope exclusions

Explicitly out of scope:

- Authentication.
- Real blockchain or wallet integration.
- Merchant dashboard.
- Persistence.
- Pixel-perfect replication of an existing design.
- Real translation infrastructure.

Deliberate exclusions unless later justified:

- WebSocket or server-sent-event transport.
- Automatic wallet connection.
- Transaction explorer integration.
- Analytics and telemetry backends.
- A generic reusable workflow engine.
- A separate production backend.

## Completion gate

Implementation is not complete merely when every status can be displayed. It is
complete when every critical row above has observable UI evidence, automated
verification proportional to its risk, and corresponding design documentation.
