# Triple-A Stablecoin Checkout

A safety-focused hosted stablecoin checkout for the Triple-A Senior Fullstack
Engineer take-home assessment. The implementation uses a Next.js frontend and
colocated deterministic mock HTTP API.

> Current status: the checkout, final documentation, security review, and full
> release gate are complete. Final review is tracked in
> [M7 of the delivery task list](./.docs/09-task-list.md).

## Scenario

The checkout collects EUR 149.90 for Nordwind Audio order
`ORD-88213`. It supports the required USDT, USDC, and ETH network
combinations, exact quotes, local QR generation, absolute expiration, payment
status polling, all eight lifecycle outcomes, and deterministic adverse network
conditions.

## Prerequisites

- Node.js 24.19.0 LTS, pinned in `.node-version`.
- pnpm 11.22.0, pinned in `package.json`.

The repository uses exact direct dependency versions and commits
`pnpm-lock.yaml`.

## Install and run

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://localhost:3000>. If that port is occupied, Next.js reports the
available port in the terminal.

For a production build:

```bash
pnpm build
pnpm start
```

## Quality commands

| Command             | Purpose                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format`       | Apply Prettier formatting and Tailwind class ordering.                                                                     |
| `pnpm format:check` | Verify formatting without changing files.                                                                                  |
| `pnpm lint`         | Run the Next.js Core Web Vitals and TypeScript ESLint rules.                                                               |
| `pnpm typecheck`    | Run strict TypeScript without emitting files.                                                                              |
| `pnpm test`         | Run Vitest unit and component tests once.                                                                                  |
| `pnpm test:watch`   | Run Vitest interactively.                                                                                                  |
| `pnpm test:e2e`     | Run Playwright Chromium journeys against `next dev`; locally it reuses a compatible server already listening on port 3000. |
| `pnpm test:e2e:ui`  | Open Playwright's interactive test UI.                                                                                     |
| `pnpm check`        | Run formatting, lint, typecheck, and Vitest gates.                                                                         |
| `pnpm build`        | Create and type-check the production Next.js build.                                                                        |

Install Playwright's pinned browser once when needed:

```bash
pnpm exec playwright install chromium
```

## Architecture

- Next.js 16.3.1 App Router and route handlers under `src/app`.
- React/React DOM 19.2.8 and Tailwind CSS 4.
- TanStack Query is the sole owner of remote quote/payment state.
- Zod validates all untrusted HTTP responses.
- Monetary values remain decimal strings and use `big.js` strict mode for
  arithmetic; native floating-point money arithmetic is prohibited.
- Vitest/Testing Library cover pure domain and client behavior; Playwright
  covers the real Next.js application.
- Mock fixtures remain behind HTTP route handlers and are never imported by
  shopper-facing components.

Application boundaries:

```text
src/
  app/                 # routes, composition, and mock API handlers
  features/checkout/   # API client, domain, hooks, and UI
  mocks/               # deterministic fixtures and scenario simulator
```

No generic `shared/` or `utils/` directory was added because the single feature
did not produce a proven cross-feature abstraction.

## Design documentation

Start with the [design workspace index](./.docs/00-index.md). The principal
documents are:

- [Requirements and scoring traceability](./.docs/01-requirements-and-scoring.md)
- [Payment lifecycle semantics](./.docs/02-lifecycle-semantics.md)
- [Open questions and assumptions](./.docs/03-open-questions.md)
- [Technical architecture](./.docs/04-technical-architecture.md)
- [Quality strategy](./.docs/05-quality-strategy.md)
- [Decision register](./.docs/06-decision-register.md)
- [Implementation plan](./.docs/07-implementation-plan.md)
- [Discussion history](./.docs/08-discussion-history.md)
- [Delivery task list](./.docs/09-task-list.md)
- [Accepted ADRs](./.docs/adrs/)

## Mock scenarios

Run `pnpm dev` and open <http://localhost:3000>. The floating **Dev tools**
launcher is available immediately, or press **Cmd/Ctrl+Shift+K**. Before a
quote exists, the dock explains that a payment method must be selected. After
the quote is issued, its compact development-only controls open beside the
checkout on desktop and as a bottom sheet on small screens. Its sections can:

- pin any of the eight lifecycle states or run happy-path progression;
- emit one mock network confirmation at a time while exact `detected` or
  `confirming` state is active;
- delay status responses from 0 to 30,000 milliseconds;
- trigger the next request or every request as HTTP 500 or a simulated network
  disconnect;
- move the current quote deadline to 0–600 seconds from now;
- display and reset current/maximum in-flight status-request metrics.

Choose lifecycle and transport values and press **Apply scenario**. The current
payment status is refreshed immediately, including after polling has stopped in
a terminal state. Quote expiry has its own **Update quote deadline** action.
When exact `detected` or `confirming` is active, **Send next confirmation**
increments the visible count. The first signal moves zero-confirmation detected
funds to confirming, and the required signal changes the mock payment to `paid`.
Press Escape or use the labelled close button to return focus to the launcher.
The controls are absent from the production experience and all development
endpoints return 404 when `NODE_ENV=production`.

The HTTP commands below are an advanced, scriptable alternative to the panel.

Create a payment on a multi-confirmation method so every lifecycle state,
including `confirming`, is compatible with its issued quote:

```bash
curl -sS -X POST http://localhost:3000/api/payments \
  -H 'Content-Type: application/json' \
  --data '{"order_id":"ORD-88213","currency":"USDT","network":"ethereum"}'
```

Copy the unique `payment_reference` from the response and replace
`<PAYMENT_REFERENCE>` below. Each checkout gets its own reference so another
browser tab or test run cannot replace its quote. Pin it to any of the eight
statuses by replacing `paid` with `awaiting_payment`, `detected`, `confirming`,
`paid`, `underpaid`, `overpaid`, `expired`, or `failed`:

```bash
curl -sS -X PUT http://localhost:3000/api/dev/scenario \
  -H 'Content-Type: application/json' \
  --data '{"payment_reference":"<PAYMENT_REFERENCE>","configuration":{"scenario":{"mode":"exact_state","status":"paid"},"response_delay_ms":0,"failure":{"mode":"none"}}}'
```

Read the shopper-facing status endpoint:

```bash
curl -i 'http://localhost:3000/api/payments/<PAYMENT_REFERENCE>'
```

Use deterministic happy-path progression instead of a pinned state:

```bash
curl -sS -X PUT http://localhost:3000/api/dev/scenario \
  -H 'Content-Type: application/json' \
  --data '{"payment_reference":"<PAYMENT_REFERENCE>","configuration":{"scenario":{"mode":"progression"},"response_delay_ms":0,"failure":{"mode":"none"}}}'
```

Each subsequent status request advances through `awaiting_payment`, `detected`,
`confirming`, and `paid`. One-confirmation methods safely skip `confirming`
because they have no valid positive intermediate confirmation count.

Transport behavior is orthogonal to the lifecycle scenario. Set
`response_delay_ms` up to `30000`, and choose one of these failure objects:

```json
{ "mode": "none" }
{ "mode": "next_request", "kind": "http_500" }
{ "mode": "next_request", "kind": "network_disconnect" }
{ "mode": "persistent", "kind": "http_500" }
{ "mode": "persistent", "kind": "network_disconnect" }
```

The stream-disconnect option intentionally breaks a development HTTP response
and may produce a Next.js `failed to pipe response` diagnostic in the server
terminal. This is expected simulator behavior, not a payment failure. Use the
HTTP 500 option for the cleanest persistent-failure demonstration.

For example, a five-second one-shot server failure uses the same PUT command
with this configuration:

```json
{
  "scenario": { "mode": "exact_state", "status": "detected" },
  "response_delay_ms": 5000,
  "failure": { "mode": "next_request", "kind": "http_500" }
}
```

Inspect or reset the request-concurrency evidence:

```bash
curl -sS 'http://localhost:3000/api/dev/requests?payment_reference=<PAYMENT_REFERENCE>'
curl -sS -X DELETE 'http://localhost:3000/api/dev/requests?payment_reference=<PAYMENT_REFERENCE>'
```

After pinning the payment to `expired`, request a replacement quote. The
reference is preserved and every quote-dependent field is replaced together:

```bash
curl -sS -X POST \
  'http://localhost:3000/api/payments/<PAYMENT_REFERENCE>/requote' \
  -H 'Content-Type: application/json' \
  --data '{"currency":"USDC","network":"polygon"}'
```

Calling requote while the awaiting quote is still valid returns the documented
409 problem. Requote is also rejected after funds are detected or the payment
has entered another state where replacement could encourage a duplicate
transfer.

## Prioritization and omissions

No required shopper flow, documented status, adverse transport control, or
documentation deliverable was intentionally dropped. The following lower-value
or unsupported work was deliberately excluded from the time-boxed assessment:

| Omitted work                                                                               | Impact                                                         | Prioritization rationale                                                                                                        |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Decorative animation and more visual polish                                                | The UI is intentionally restrained rather than brand-complete. | Safety, lifecycle races, accessibility, and failure recovery were higher-value scoring areas.                                   |
| Blockchain explorer links                                                                  | Shoppers cannot jump directly to a transaction explorer.       | The API provides neither authoritative explorer URLs nor a safe network-to-explorer mapping; guessing would be unsafe.          |
| Chain-specific amount-bearing QR URIs                                                      | The QR contains the exact validated destination address only.  | The contract defines no URI scheme; inventing one could create incompatible wallet behavior.                                    |
| Server-clock correction beyond absolute `expires_at`                                       | A badly skewed shopper device can still skew the countdown.    | The body contract supplies no authoritative server timestamp or offset policy. Background-tab correctness is fully implemented. |
| Real wallet integration, authentication, persistence, merchant dashboard, and Rust service | The demo is a hosted shopper page backed by an in-memory mock. | These are explicitly outside the frontend assessment scope.                                                                     |
| WebSocket/SSE status transport                                                             | Status changes are not pushed in real time.                    | Polling is explicitly required and its overlap, cleanup, retry, and stop behavior are scored.                                   |
| Full translation infrastructure                                                            | Shopper copy is English-only.                                  | Real internationalization is out of scope; fiat formatting still respects the browser locale.                                   |

`underpaid` is implemented as a non-terminal, shopper-recoverable state because
the supplied payload includes `amount_outstanding` and `crypto_address`. That
contract shape selects a same-reference top-up: the shopper sends only the
outstanding amount on the issued network/address and polling continues. It does
not create a second quote or promise a production refund policy.

## Agent collaboration

Codex was used for design analysis, implementation, tests, documentation, and
verification. The committed [AGENTS.md](./AGENTS.md) is the living contract that
constrained its work: payment invariants, file ownership, verification, honest
history, and candidate approval before commit boundaries. The complete factual
record is in the [discussion history](./.docs/08-discussion-history.md).

Three agent proposals/outputs were rejected or materially corrected:

1. The first architecture placed root `app/` beside `src/features/`. The
   candidate challenged the unclear ownership, and the design moved all
   application code under one `src/` boundary.
2. The first contract direction treated the example currencies and networks as
   frontend enums. The candidate pointed out that a backend catalog expansion
   would then require a frontend release. They became branded open identifiers
   validated against the latest catalog; only behaviorally closed payment
   statuses remain an enum.
3. The first evaluator panel occupied the full page width below the checkout,
   making the shopper flow impossible to inspect while changing scenarios. The
   candidate rejected that ergonomics. It became a compact non-modal desktop
   dock/mobile sheet with a visible launcher, keyboard shortcut, and focus
   restoration.

A material candidate-owned improvement came from manual expiry testing. The
candidate reported that requote appeared broken and the UI blinked. Investigation
showed that every mock checkout reused `AQH-100306-PMT`, so a parallel browser
test could silently replace the candidate's server record. Unique process-local
references and a two-session regression now isolate checkouts and allow four
parallel Playwright workers.

No incorrect lifecycle transition was knowingly committed. One potentially
unsafe interpretation was resolved during design: address copy or QR display/
scan cannot prove a blockchain transfer started because the supplied contract
emits no such event. Issued method details are fixed, a direct action remains
while the server says `awaiting_payment`, and only authoritative `detected` or
later removes method changing completely.

Other candidate review improved the security baseline, polling-diagnostic
language, Dev tools discovery before quote creation, and the desktop layout.
These are retained in history rather than rewritten as if the agent got them
right initially.

## Security baseline

The final check on 2026-08-18 used official project advisories/support pages and
current registry metadata:

- Next.js 16.3.1 remains the stable registry release on the 16.x Active LTS
  line. It was released after the official July 2026 security floor of 16.2.11.
- React and React DOM 19.2.8 remain the stable registry releases and are newer
  than the official 19.2.4 RSC DoS/source-exposure patched floor.
- Node.js was raised from 24.18.0 to the current 24.19.0 LTS. The earlier pin
  predated the July 29 Node security release, which fixed high-severity HTTP/2
  issues in 24.18.1.
- `pnpm audit --json` reports zero known vulnerabilities across 560
  dependencies.

Sources: [Next.js July security release](https://nextjs.org/blog/july-2026-security-release),
[Next.js support policy](https://nextjs.org/support-policy),
[React RSC follow-up advisory](https://react.dev/blog/2025/12/11/denial-of-service-and-source-code-exposure-in-react-server-components),
[Node.js July security release](https://nodejs.org/en/blog/vulnerability/july-2026-security-releases),
and [Node 24 release archive](https://nodejs.org/en/download/archive/v24).
