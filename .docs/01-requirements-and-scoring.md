# Requirements and Scoring Traceability

Status: Draft for review
Scope: Pre-implementation analysis only

## Purpose

This document converts the assessment brief into verifiable product and
engineering outcomes. It distinguishes:

- **Requirement**: stated explicitly by the assessment.
- **Interpretation**: a proposed product or engineering decision derived from
  the requirement.
- **Open question**: behavior that the supplied contract does not define well
  enough to treat as fact.

No interpretation becomes an implementation requirement until it is accepted
in the technical design or confirmed by Triple-A.

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

| ID | Requirement | Source | Evidence in the finished solution | Priority |
| --- | --- | --- | --- | --- |
| PR-01 | Show merchant name, order reference, and EUR 149.90 formatted for the shopper's locale. | What to build: Summary | Order summary UI; locale-formatting test | Required |
| PR-02 | Support every documented currency/network combination. | What to build: Currency and network | Selector options derived from `GET /api/currencies`; contract test | Required |
| PR-03 | Fetch a new quote when currency or network changes. | What to build: Currency and network | Quote mutation integration test; stale-response race test | Critical |
| PR-04 | Make the selected network impossible to miss. | What to build; Shopper safety score | Network shown at selection, amount, address, QR/instructions; usability review | Critical |
| PR-05 | Show the exact crypto amount, address, QR code, and copy action. | What to build: Quote | Payment instruction UI; copy and QR-content tests | Critical |
| PR-06 | Show a countdown to the absolute `expires_at` value. | What to build: Quote | Countdown UI; fake-clock tests | Critical |
| PR-07 | Keep the countdown correct after the tab has been backgrounded. | What to build; Correct when things go wrong score | Recompute from `expires_at` and current time; resume test | Critical |
| PR-08 | At zero, show an expired state and a way to request a new quote. | What to build: Quote | Expired-state and requote integration tests | Critical |
| PR-09 | Poll `GET /api/payments/:reference` while the payment is active. | What to build: Waiting | Query integration tests and request log | Critical |
| PR-10 | Interpret `detected` as funds received with zero confirmations. | What to build: Waiting | Detected-state copy and lifecycle test | Critical |
| PR-11 | Once funds are detected, prevent quote expiration from replacing the payment state. | What to build: Waiting | Detection/expiration race test | Critical |
| PR-12 | Stop polling on terminal states. | What to build: Waiting | Per-state polling tests | Critical |
| PR-13 | Do not leak intervals or issue overlapping polling requests. | What to build; Correct when things go wrong score | Slow-response concurrency test; unmount/reference-change test | Critical |
| PR-14 | Present all documented API states meaningfully to the shopper. | Edge cases | Exhaustive status presenter and state tests | Required |
| PR-15 | Visually and semantically distinguish outcomes the shopper can fix from outcomes they cannot fix. | Edge cases; What the shopper can fix score | Action taxonomy; headings, instructions, and accessible status semantics | Critical |
| PR-16 | Handle slow responses and transport/server failure safely. | Mock API; scoring | Controllable mock; retry/recovery tests; non-destructive error UI | Critical |
| PR-17 | Allow every payment state, a network error, and a slow response to be triggered on demand. | Mock API | Development scenario controls and README instructions | Required |
| PR-18 | Implement only the hosted shopper payment page. | Context and out of scope | No auth, wallet integration, merchant dashboard, or persistence | Scope guard |

## Monetary correctness requirements

| ID | Requirement | Evidence |
| --- | --- | --- |
| MR-01 | Preserve all API money amounts as decimal strings at the transport boundary. | Runtime schemas and type definitions |
| MR-02 | Never use binary floating-point arithmetic for money. | Decimal utility; unit tests; code-review rule |
| MR-03 | Support six decimal places for USDT/USDC and eighteen for ETH. | Boundary-value formatting and arithmetic tests |
| MR-04 | Never render transfer values in scientific notation. | Formatting tests |
| MR-05 | Do not silently round an exact amount that the shopper must transfer. | Display-policy tests |

## Documentation requirements

| ID | Deliverable | Required content |
| --- | --- | --- |
| DR-01 | Design document | Payment lifecycle state model |
| DR-02 | Design document | Component structure and data flow |
| DR-03 | Design document | Background-tab-safe countdown |
| DR-04 | Design document | Decimal precision strategy |
| DR-05 | Design document | Shopper-facing failure handling |
| DR-06 | Design document | One decision the candidate would defend, or the first change they would make with more time |
| DR-07 | ADRs | A small number of consequential decisions in context/options/decision/consequences format |
| DR-08 | README | Installation and run instructions |
| DR-09 | README | How to trigger every payment state, a slow response, and a network error |
| DR-10 | README | What was dropped, with prioritization rationale |
| DR-11 | README | Honest account of agent collaboration: three rejected outputs, one candidate-owned improvement, and any lifecycle mistake |
| DR-12 | Repository | Real, unsquashed commit history and committed agent instructions |

## Shopper-safety invariants

The following are proposed acceptance criteria derived directly from the scoring
section:

1. The visible amount, asset, network, address, and QR payload always belong to
   the same quote.
2. A stale quote response can never overwrite a newer selection.
3. Once a quote is issued, currency and network are presented as fixed quote
   attributes rather than live selectors. While status remains
   `awaiting_payment`, changing them requires explicit confirmation that the
   shopper has not sent funds and invalidates the displayed instructions. After
   any funds are detected, changing them is unavailable.
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

Proposed exclusions unless later justified:

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
