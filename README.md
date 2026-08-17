# Triple-A Stablecoin Checkout

A safety-focused hosted stablecoin checkout for the Triple-A Senior Fullstack
Engineer take-home assessment. The implementation uses a Next.js frontend and
colocated deterministic mock HTTP API.

> Current status: repository foundation complete; checkout feature development
> has not started. Follow progress in the
> [delivery task list](./.docs/09-task-list.md).

## Scenario

The finished checkout will collect EUR 149.90 for Nordwind Audio order
`ORD-88213`. It will support the required USDT, USDC, and ETH network
combinations, exact quotes, local QR generation, absolute expiration, payment
status polling, all eight lifecycle outcomes, and deterministic adverse network
conditions.

## Prerequisites

- Node.js 24.18.0 LTS, pinned in `.node-version`.
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

| Command             | Purpose                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| `pnpm format`       | Apply Prettier formatting and Tailwind class ordering.                                                          |
| `pnpm format:check` | Verify formatting without changing files.                                                                       |
| `pnpm lint`         | Run the Next.js Core Web Vitals and TypeScript ESLint rules.                                                    |
| `pnpm typecheck`    | Run strict TypeScript without emitting files.                                                                   |
| `pnpm test`         | Run Vitest unit and component tests once.                                                                       |
| `pnpm test:watch`   | Run Vitest interactively.                                                                                       |
| `pnpm test:e2e`     | Run Playwright Chromium journeys. Locally it reuses an existing server; otherwise it builds and starts Next.js. |
| `pnpm test:e2e:ui`  | Open Playwright's interactive test UI.                                                                          |
| `pnpm check`        | Run formatting, lint, typecheck, and Vitest gates.                                                              |
| `pnpm build`        | Create and type-check the production Next.js build.                                                             |

Install Playwright's pinned browser once when needed:

```bash
pnpm exec playwright install chromium
```

## Architecture

- Next.js 16.3.1 App Router and route handlers under `src/app`.
- React/React DOM 19.2.8 and Tailwind CSS 4.
- TanStack Query will be the sole owner of remote quote/payment state.
- Zod will validate all untrusted HTTP responses.
- Monetary values remain decimal strings and use `big.js` strict mode for
  arithmetic; native floating-point money arithmetic is prohibited.
- Vitest/Testing Library cover pure domain and client behavior; Playwright
  covers the real Next.js application.
- Mock fixtures remain behind HTTP route handlers and are never imported by
  shopper-facing components.

Planned application boundaries:

```text
src/
  app/                 # routes, composition, and mock API handlers
  features/checkout/   # API client, domain, hooks, and UI
  mocks/               # deterministic fixtures and scenario simulator
  shared/              # genuinely cross-feature utilities and components
```

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

Scenario controls are not implemented yet. Milestones M2 and M5 will add and
document reproducible triggers for:

- `awaiting_payment`, `detected`, `confirming`, `paid`;
- `underpaid`, `overpaid`, `expired`, `failed`;
- slow responses, transient transport failure, and persistent failure.

This section will contain exact evaluator instructions only after those controls
exist and have been verified.

## Prioritization and omissions

No required checkout behavior has been intentionally dropped at the foundation
stage. Lower-value optional work currently deferred in the task tracker includes
decorative animation, blockchain explorer links without authoritative backend
URLs, real wallet integration, and WebSocket/SSE transport. The final README
will list every incomplete item with its impact and prioritization rationale.

## Agent collaboration

The committed [AGENTS.md](./AGENTS.md) is a living contract for ownership,
parallel work, safety invariants, and truthful verification. The
[discussion history](./.docs/08-discussion-history.md) records actual candidate
decisions and agent corrections, including:

- rejecting a premature scaffold so technical design could be completed first;
- replacing an ambiguous root `app/` plus partial `src/` layout with one
  coherent `src/` tree after candidate review;
- introducing an exact patched framework baseline after the candidate connected
  current vulnerabilities to checkout safety;
- distinguishing QR/address interaction from authoritative backend payment
  detection when defining method commitment.

The final submission account will use only real collaboration events and will
not manufacture rejected outputs to satisfy a count.

## Security baseline

Framework and runtime versions are exact and were checked against official
release guidance before scaffolding. On 2026-08-17, `pnpm audit --json` reported
zero advisories across 554 locked dependencies. This is a point-in-time result;
the advisory and dependency audit will be repeated before submission.
