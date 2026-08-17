# Architecture Decision Register

Status: Foundation accepted; ADR extraction pending
Scope: Pre-implementation design only

This register identifies decisions important enough to become ADRs. The
foundation was accepted on 2026-08-17. This is not yet the final ADR set:
accepted decisions will be rewritten as individual ADRs and their consequences
will be checked against the implementation.

## ADR-001: Next.js and colocated mock API

### Context

The exercise is frontend-focused but requires committed HTTP fixtures. The
target company uses Next.js and Rust. The assessment permits MSW, json-server,
Express, or another mock approach.

### Options

1. Next.js App Router plus route handlers.
2. React/Vite plus MSW.
3. React frontend plus separate Express mock server.

### Accepted decision

Use Next.js 16.3.1 with React/React DOM 19.2.8, the App Router, and route
handlers. These stable registry versions were verified on 2026-08-17 and
supersede the earlier 16.2.11/19.2.6 baseline. Recheck official security
releases immediately before submission and update to a newer stable patched
release if one supersedes this baseline.

### Rationale

- Aligns with Triple-A's frontend stack without inventing a Rust backend for a
  frontend exercise.
- Uses the current stable security baseline after recent React Server Components
  and Next.js vulnerabilities; avoids vulnerable older releases and unstable
  canaries.
- Keeps a single development command.
- Exercises a real HTTP and serialization boundary.
- Makes slow responses, HTTP failures, validation, and problem responses
  explicit.

### Consequences to accept

- More framework surface than a one-page Vite app.
- Exact versions and the lockfile become part of the security evidence and must
  be reviewed again before submission.
- In-memory scenario state is development-only and not deployment-safe across
  multiple server instances.
- The design must ensure mock modules do not leak into shopper components.

## ADR-002: TanStack Query owns remote payment state

### Context

The page contains quote mutations, status polling, retry behavior, cancellation,
and terminal-state stopping. Redux Toolkit was initially considered for complex
state.

### Options

1. TanStack Query for remote state; local React state for ephemeral UI.
2. TanStack Query mirrored into Redux Toolkit.
3. Redux Toolkit async thunks/listeners for all server interaction.
4. Custom effects and reducer.

### Accepted decision

Use TanStack Query as the only owner of remote payment state. Do not add Redux
Toolkit unless a concrete, independent global client-state need emerges.

### Rationale

Duplicating payment and quote data in Redux creates synchronization risk without
adding a capability required by the brief.

### Consequences to accept

- Query configuration becomes important domain-adjacent behavior and must be
  tested.
- Derived lifecycle presentation needs an explicit pure mapping rather than a
  Redux slice selector.
- The README/design document should explain why a familiar tool was deliberately
  omitted.

## ADR-003: Reconcile status before declaring local expiry

### Context

The countdown and blockchain polling are independent asynchronous processes. A
transaction may be detected by the server just before the local countdown
reaches zero.

### Options

1. Show expired immediately at local zero.
2. Wait for the next normal poll.
3. Trigger one immediate status reconciliation and show a neutral interim state.

### Accepted decision

Choose option 3.

### Rationale

It directly protects the brief's invariant that a payment already on its way
must never expire under the shopper, without leaving instructions active after
their known deadline.

### Consequences to accept

- Expiry presentation may be delayed by one request.
- A failed reconciliation needs a truthful degraded-connectivity state.
- The mock and tests must cover the race explicitly.

## ADR-004: Decimal strings plus arbitrary-precision operations

### Context

The API explicitly uses decimal strings and the scoring criteria prohibit
floats, including eighteen-decimal ETH values.

### Options

1. Native numbers and locale formatting.
2. Integer minor units using `BigInt`.
3. Decimal strings at boundaries with a decimal arithmetic library.

### Accepted decision

Choose option 3.

### Rationale

- Matches the transport contract.
- Handles currency-specific scale without hand-written normalization logic.
- Keeps exact values readable in fixtures and UI tests.

### Consequences to accept

- All money utilities must prevent accidental `Number` conversion.
- The decimal dependency and formatting policy need explicit review.
- Values supplied by the server should be displayed directly where possible
  rather than needlessly recomputed.

## Decisions that do not currently merit an ADR

- Tailwind CSS: an implementation preference without a substantial domain
  trade-off here.
- Individual component names or folder layout.
- Icon library selection.
- Exact colors, spacing, or typography.
- Use of strict TypeScript, linting, or semantic HTML: baseline engineering
  expectations rather than architectural choices.

## Accepted supporting decisions

- Use pnpm 11.22.0, verified against the package registry on 2026-08-17, in the
  `packageManager` field and commit `pnpm-lock.yaml`. Speed motivated the choice; deterministic
  installs, efficient shared storage, and strict dependency boundaries are the
  stronger repository-level benefits.
- Treat currency/network as fixed attributes after a quote is issued. Permit a
  guarded replacement only while `awaiting_payment`; remove the action at
  `detected` or later. QR scanning and address copying are not authoritative
  payment events.
- Treat `paid`, `overpaid`, `expired`, and `failed` as terminal.
- Treat `underpaid` as non-terminal and continue polling for the outstanding
  amount. This remains a provisional domain interpretation and must change if
  an authoritative backend contract says the status is terminal.
- Use Node.js 24.18.0 LTS and `big.js` in strict mode.
- Use `qrcode.react` to generate SVG QR codes locally from validated quote data.
- Use Vitest and React Testing Library for pure domain/client-component tests,
  and Playwright against the real Next.js application for browser integration.
  Vitest's Vite-based transformer does not change the Next.js/Turbopack runtime.
- Do not add MSW initially because the committed route handlers already provide
  the mock HTTP boundary.

## Approval checklist

Before implementation, explicitly accept or amend:

- [x] Next.js 16.3.1 and React/React DOM 19.2.8 security baseline, with a
      pre-submission advisory recheck.
- [x] Next.js route handlers for the mock API.
- [x] TanStack Query as the sole remote-state owner.
- [x] No Redux Toolkit without a demonstrated need.
- [x] One status reconciliation at local countdown zero.
- [x] Decimal strings and arbitrary-precision arithmetic.
- [x] Terminal-state classification, with `underpaid` explicitly provisional.
- [x] Fixed issued payment method with guarded pre-detection replacement.
- [x] pnpm 11.22.0 as the exact package-manager version.
- [x] Node.js 24.18.0 LTS, `big.js`, local SVG QR generation, Vitest + Testing
      Library, and Playwright.
