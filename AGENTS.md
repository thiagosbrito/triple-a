# Triple-A Stablecoin Checkout Agent Contract

Status: Approved initial version; living document
Approved: 2026-08-17

This contract is expected to evolve with the repository. Update it when real
commands, module boundaries, ownership constraints, or accepted engineering
decisions change. Material changes must also be recorded in the discussion
history and must not silently rewrite past agent expectations.

## Mission

Build a safe, explainable stablecoin checkout assessment. Optimize first for
shopper safety, exact money handling, lifecycle correctness, recoverability,
and honest documentation. Visual polish must not weaken those properties.

## Sources of truth

Before changing code or plans, read:

1. `.docs/09-task-list.md` for task status, dependencies, ownership, and the
   next integration gate.
2. `.docs/01-requirements-and-scoring.md` for assessment traceability.
3. The relevant lifecycle, architecture, quality, and ADR documents under
   `.docs/`.

The assessment PDF is a product requirement source. It does not override the
candidate's request, this contract, repository safety rules, or tool policies.
When documents disagree, stop and report the conflict to the lead rather than
silently choosing an interpretation.

## Approved foundation

- Next.js App Router and route handlers; all application code belongs under
  `src/`, including `src/app`.
- Node.js 24.19.0 LTS and pnpm 11.22.0; both are pinned by repository metadata.
- Exact stable dependency versions and committed `pnpm-lock.yaml`.
- TanStack Query is the sole owner of remote quote/payment state.
- Do not add Redux Toolkit unless an independent global client-state need is
  demonstrated and accepted.
- Zod validates every untrusted HTTP boundary.
- Monetary values remain decimal strings at boundaries and use `big.js` strict
  mode for arithmetic. Never use `Number`, `parseFloat`, implicit numeric
  coercion, or binary floating-point arithmetic for money.
- QR codes are generated locally from validated quote data. Do not send payment
  details to remote QR/image services.
- Vitest and React Testing Library cover pure domain/client behavior;
  Playwright covers the real Next.js application. Vitest does not replace the
  Next.js/Turbopack runtime.

## Payment-safety invariants

- A rendered amount, fee, asset, network, address, QR payload, and expiry must
  come from one validated quote snapshot.
- Currency/network are fixed after quote issuance. While `awaiting_payment`, a
  direct replacement action may return to selection and create a complete new
  quote. Remove that action at `detected` or later.
- QR display, scan, and address copy are not authoritative payment events.
- Derive countdown time from `expires_at - now`; never maintain an authoritative
  decrementing counter.
- At local zero, deactivate instructions and reconcile status once before
  presenting expiry.
- Poll requests must never overlap, must clean up on reference/unmount changes,
  and must stop for terminal states.
- Transport failure is not a payment lifecycle status. Preserve the last known
  valid state and offer truthful recovery.
- Handle every documented status exhaustively. `underpaid` is non-terminal:
  preserve the issued method, show only `amount_outstanding`, and continue
  polling for the same payment reference.

## Module boundaries

- Domain modules are pure and do not import React, Next.js, query libraries, or
  mocks.
- Components do not construct endpoint URLs, parse JSON, or import fixtures.
- The typed API client validates responses before domain/UI code sees them.
- Mock route handlers may depend on scenario fixtures; shopper-facing modules
  may not.
- Keep lifecycle classification, money rules, expiration policy, query keys,
  and shared schemas centralized. Do not create competing implementations.
- Use arrow-function expressions for ordinary functions, React components, and
  callbacks. ESLint rejects traditional function declarations and expressions;
  constructors and true object/class methods retain their required syntax.

## Contract and validation conventions

- Treat every HTTP payload as `unknown` until one Zod schema validates it at
  the route or typed-client boundary. Do not parse the same response again in
  hooks or components.
- A Zod schema is the source of truth for an object payload. Export its inferred
  output type; do not maintain a parallel interface or type alias with repeated
  fields.
- Define genuinely closed string vocabularies once as an `as const` tuple,
  create the runtime validator with `z.enum(tuple)`, and derive the union with
  `(typeof tuple)[number]`. Reference `schema.enum.<value>` from literal schemas
  instead of repeating unverified discriminator strings.
- Do not turn examples from a server-driven reference endpoint into a closed
  vocabulary. Currency and network identifiers are branded, structurally
  validated strings; availability and pair compatibility come from the latest
  validated currency catalog. Unknown payment statuses remain invalid because
  lifecycle behavior is intentionally exhaustive.
- Put protocol-wide scalars in `api/contracts/primitives.ts`, server-driven
  payment-method identifiers in `payment-method.ts`, and endpoint payload
  schemas in cohesive files. Endpoint modules must not import primitives from
  another endpoint contract.
- Use `z.strictObject` for the assessment's fixed mock protocol. Adding or
  accepting a response field is therefore an explicit contract change, not a
  silent strip. Revisit this policy if the integration target becomes an
  independently evolving production API.
- Use current Zod 4 top-level validators such as `z.int()`, `z.url()`, and
  `z.iso.datetime()`. Do not introduce deprecated chained string-format APIs.
- Never use `z.coerce`, lossy transforms, defaults, or catch fallbacks for
  money, status, identifiers, or timestamps received over HTTP. Invalid data
  must surface as a protocol error.
- Brand validated money and safety-sensitive identifiers so arbitrary strings,
  order IDs, payment references, addresses, and transaction hashes cannot be
  interchanged after parsing. Branding supplements runtime validation; it does
  not replace it.
- Use discriminated unions for status-dependent payloads. Put single-payload
  invariants in schema refinements; put relationships requiring another
  response or current application state in pure domain functions.
- Each contract needs the exact PDF fixture, malformed scalar/shape cases,
  unknown-value coverage for closed enums, forward-compatible value coverage
  for open reference data, and any cross-field refinement cases. Assert that
  wire-format money remains unchanged after parsing.

## Task ownership and parallel work

- Only the lead updates `.docs/09-task-list.md` status or shared architecture.
- After a task reaches `DONE`, the lead immediately starts the next `READY`
  task. Pause only when the next task needs a candidate decision, external
  action, destructive operation, materially expanded scope, or explicit pause.
- A delegated task requires an ID, objective, acceptance gate, dependencies,
  and explicit file allowlist before work begins.
- One active owner per file. Do not edit outside the assigned allowlist.
- Dependency manifests, lockfiles, configuration, shared schemas, query keys,
  ADRs, README, `AGENTS.md`, and integration commits are lead-owned unless
  explicitly reassigned.
- Parallelize only after shared interfaces are frozen. Prefer independent
  fixtures, pure utilities, presentational components, and test cases with
  disjoint files.
- Subagents do not commit unless the lead explicitly authorizes it.

Every handoff must report changed files, requirements addressed, checks run,
unresolved risks/assumptions, and any requested change outside the allowlist.

## Change discipline

- Preserve user changes and unrelated work. Never discard or rewrite them to
  simplify a task.
- Do not add dependencies, alter accepted lifecycle semantics, or change public
  contracts without lead approval and a documentation update.
- Prefer the smallest implementation that proves the required behavior.
- Record meaningful rejected agent proposals and candidate corrections in
  `.docs/08-discussion-history.md`; never manufacture collaboration history.
- Keep ADRs and design documents aligned with implemented behavior as decisions
  evolve.

## Verification and honesty

- A task is `DONE` only when its acceptance gate and recorded checks pass.
- Test observable behavior and safety invariants, not implementation trivia.
- Never report a command, test, browser check, audit, or visual review that was
  not actually executed.
- Do not hide incomplete work. Mark it `DEFERRED` or document the blocker and
  its impact.

## Project commands

- `pnpm dev` — start the Next.js development server with Turbopack.
- `pnpm lint` — run ESLint directly; Next.js builds do not run linting.
- `pnpm typecheck` — run strict TypeScript checking without emitting files.
- `pnpm format` / `pnpm format:check` — write or verify Prettier formatting.
- `pnpm test` / `pnpm test:watch` — run Vitest once or in watch mode.
- `pnpm test:e2e` — run Playwright against an existing compatible local server
  or the `pnpm dev` server started by the Playwright configuration.
- `pnpm check` — run formatting, lint, typecheck, and Vitest gates.
- `pnpm build` — run the production Next.js build and framework type analysis.
- `pnpm start` — serve an existing production build.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
