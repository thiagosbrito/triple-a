# Implementation Plan

Status: Draft; implementation must not start before design approval

## Working method

Each implementation slice should:

1. Satisfy a named requirement or safety invariant.
2. Add verification proportional to its risk.
3. Update documentation when behavior or reasoning changes.
4. Produce a focused commit with an honest message.
5. Record material rejected agent output or corrected reasoning when it occurs.

## Slice 0: Repository contract

Deliverables:

- Next.js 16.3.1, React/React DOM 19.2.8, TypeScript, and Tailwind
  project foundation, updated if a newer stable security release supersedes
  this baseline before scaffolding.
- `AGENTS.md` containing payment invariants, money rules, quality gates, and
  documentation expectations.
- Formatting, linting, unit-test, and browser-test commands.
- Initial README skeleton and documentation index.

Exit criteria:

- Development and verification commands work from a clean checkout.
- Exact direct dependency versions and the lockfile are committed, and the
  initial dependency audit is reviewed.
- Agent instructions prohibit floats for money and duplicated remote state.

Suggested commit:

> chore: establish checkout project and engineering guardrails

## Slice 1: Contract and domain core

Deliverables:

- Runtime schemas for currencies, payment creation, all status variants,
  requote, and problem responses.
- Status taxonomy and exhaustive presentation mapping.
- Decimal-value abstraction and formatting policy.
- Quote-expiration pure functions.
- Fixtures validated against the contracts.

Exit criteria:

- All eight statuses validate and classify exhaustively.
- Decimal boundary tests pass for six- and eighteen-decimal assets.
- No React component or endpoint is needed to test the domain core.

Suggested commit:

> feat: define payment contracts and lifecycle domain

## Slice 2: Deterministic mock API

Deliverables:

- `GET /api/currencies`.
- `POST /api/payments`.
- `GET /api/payments/:reference`.
- `POST /api/payments/:reference/requote`.
- Exact-state and progression scenarios.
- Slow response and failure controls.

Exit criteria:

- Every assessment fixture is triggerable.
- Invalid combinations and early requote return typed problem responses.
- Request instrumentation can verify maximum polling concurrency.

Suggested commit:

> feat: add controllable stablecoin payment mock API

## Slice 3: Safe quote creation experience

Deliverables:

- Merchant/order summary.
- Currency and network selection from API metadata.
- Quote creation and selection-race protection.
- Total due, fee explanation, address, QR, copy action, and prominent network
  safety treatment.
- Responsive and keyboard-accessible base layout.

Exit criteria:

- All supported combinations create internally consistent instructions.
- Stale responses cannot overwrite the latest selection.
- Visible address and QR payload always match.
- Network is unmissable at every transfer decision point.

Suggested commit:

> feat: build network-safe payment instructions

## Slice 4: Countdown and requote

Deliverables:

- Absolute timestamp countdown.
- Visibility/focus recomputation.
- Zero-time status reconciliation.
- Expired and requote presentations.
- 409 problem recovery.

Exit criteria:

- A two-minute simulated background jump is immediately correct.
- Exactly one reconciliation occurs at zero.
- Requote atomically replaces all quote data.

Suggested commit:

> feat: make quote expiration resilient to background tabs

## Slice 5: Payment polling and lifecycle UI

Deliverables:

- Non-overlapping status polling.
- Detected and confirmation progress.
- Shopper-action taxonomy and presentations for all eight statuses.
- Lock selection once funds arrive.
- Stop policy for terminal states.

Exit criteria:

- A detected payment never becomes locally expired.
- Polling stops and cleans up correctly.
- Every state answers what happened and what the shopper should do next.

Suggested commit:

> feat: handle the complete payment lifecycle

## Slice 6: Adverse transport conditions

Deliverables:

- Slow-response behavior.
- Retry/backoff policy.
- Persistent and one-shot error behavior.
- Connectivity notice and manual retry.
- Preservation of last known authoritative state.

Exit criteria:

- A 500/offline condition never appears as payment `failed`.
- Slow polls never overlap.
- Recovery is automatic while the payment remains active.

Suggested commit:

> fix: preserve payment safety during transport failures

## Slice 7: Evaluator controls and critical journeys

Deliverables:

- Clearly separated development scenario panel.
- High-value browser journeys from the quality strategy.
- Accessibility scan and keyboard walkthrough fixes.

Exit criteria:

- Evaluators can trigger every requested condition without editing code.
- README instructions match the actual controls.
- Critical shopper journeys pass consistently.

Suggested commit:

> test: cover payment races and evaluator scenarios

## Slice 8: Documentation and submission review

Deliverables:

- Final design document reflecting implemented behavior.
- Accepted ADRs with real consequences.
- README run/scenario/drop/agent sections.
- State diagram and component/data-flow diagram.
- Honest record of rejected agent work and candidate-owned improvements.

Exit criteria:

- No document describes behavior the code does not implement.
- Every deliberate omission explains the prioritization decision.
- Full commit history remains unsquashed and understandable.
- The candidate can explain each critical invariant without relying on the
  agent transcript.

Suggested commit:

> docs: explain checkout design and delivery decisions

## Time-budget policy

The assessment is explicitly time-boxed. If the implementation must be cut,
cut from the bottom of this list first:

1. Decorative animation and advanced visual polish.
2. Non-critical browser-test duplication.
3. Server-clock offset enhancement beyond the required absolute timestamp.
4. Automatic happy-path progression if exact state controls already work.
5. Optional transaction-hash conveniences.

Do not cut:

- Network safety.
- Detection/expiry protection.
- Non-overlapping polling.
- All documented statuses.
- Decimal correctness.
- Triggerable slow/error states.
- Required documentation.
