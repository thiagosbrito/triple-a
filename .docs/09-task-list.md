# Delivery Task List

Status: Active execution tracker
Last updated: 2026-08-18

## Purpose

This file is the source of truth for delivery order, task status, dependencies,
ownership, and verification evidence. The implementation plan explains the
strategy; this tracker records what is actually happening.

Agents must not infer completion from code presence. A task is complete only
when its acceptance gate is satisfied and its evidence is recorded here.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| `BLOCKED` | Cannot proceed because a required decision, dependency, or external input is missing. |
| `READY` | Dependencies are complete and the task can be assigned. |
| `IN_PROGRESS` | Assigned to exactly one owner and actively being worked. |
| `REVIEW` | Implementation is finished; integration review or verification remains. |
| `DONE` | Acceptance gate passed and evidence is recorded. |
| `DEFERRED` | Intentionally excluded from the current delivery with a documented reason. |

Only the lead agent updates task status. At most one critical-path task may be
`IN_PROGRESS` unless the parallel-work section explicitly permits otherwise.

## Ownership rules

- `Lead` owns architecture, shared contracts, configuration, dependencies,
  integration, commits, and status changes.
- A delegated task must name one owner and an explicit file allowlist before it
  moves to `IN_PROGRESS`.
- Only one active owner may edit a file.
- Shared files are lead-owned unless reassigned explicitly: dependency
  manifests, lockfiles, configuration, central schemas, query keys, README,
  ADRs, and this tracker.
- Subagents do not commit unless the lead explicitly authorizes it.
- Every handoff reports changed files, requirements addressed, checks executed,
  unresolved risks, and changes requested outside the file allowlist.

## Current milestone

**Milestone M6 is implemented, verified, and committed locally. M7 submission
documentation and final review are in progress.**

### Next task

`M7-01` — Reconcile the design document and diagrams with the implemented
system.

Milestone M1 is committed and verified. Contracts, lifecycle presentation,
exact money handling, deadline reconciliation, polling policy, and all supplied
PDF fixtures are covered. M2-01 is committed locally as `5d47f7d`, and M2-02 is
committed locally as `c4be2d9`, and M2-03 is committed locally as `00ab520`.
M2-04 is committed locally as `511b969`, and M2-05 is committed locally as
`afbcdc1`. M2-06 is committed locally as `0f85896`; M2-07 has passed the final
unit, browser, build, audit, and documentation gates. The M3 typed query,
selection, quote, and guarded method-change flow is now implemented.

## Milestone M0 — Design gates and repository foundation

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M0-01 | Accept foundation decisions: Next.js route handlers, TanStack Query ownership, RTK omission, decimal strategy, expiry reconciliation, terminal statuses, provisional `underpaid`, and payment-method commitment. | — | `DONE` | Lead + candidate | Candidate accepted the foundation on 2026-08-17; accepted and provisional states are explicit in `.docs/06-decision-register.md`. |
| M0-02 | Select package manager, Node.js LTS, decimal library, QR library evaluation rule, and test tools. | M0-01 | `DONE` | Lead + candidate | Accepted: pnpm 11.22.0, Node 24.18.0 LTS, big.js, local SVG QR generation through qrcode.react, Vitest + Testing Library, and Playwright. Vitest is test-only and does not replace Next.js/Turbopack. |
| M0-03 | Recheck official Next.js and React security releases immediately before scaffolding. | M0-01 | `DONE` | Lead | Checked 2026-08-17: registry stable tags are Next.js 16.3.1 and React/React DOM 19.2.8; exact pins replace the earlier baseline. Official Next.js July security release and React RSC advisory reviewed. |
| M0-04 | Convert the four candidate architecture decisions into proposed ADR files. | M0-01, M0-02 | `DONE` | Lead | Four accepted records exist under `.docs/adrs/` with context, options, decision, consequences, and verification. |
| M0-05 | Create the initial root `AGENTS.md` from accepted rules only. | M0-01, M0-02 | `DONE` | Lead + candidate review | Candidate approved the initial root contract on 2026-08-17 as a living document; command section remains intentionally pending real scaffold scripts. |
| M0-06 | Initialize Git and scaffold the secure Next.js project under `src/`. | M0-03, M0-04, M0-05 | `DONE` | Lead | Git initialized on `main`; standard Next.js 16.3.1 scaffold under `src/app`; exact direct versions and lockfile verified; HTTP 200 from Next 16.3.1/Turbopack; `pnpm lint` and `pnpm build` passed on 2026-08-17. |
| M0-07 | Configure strict TypeScript, Tailwind, linting, formatting, Vitest, Testing Library, and Playwright. | M0-06 | `DONE` | Lead | `pnpm check`, `pnpm test:e2e`, and `pnpm build` passed on 2026-08-17; exact tool versions and Chromium installed; one component and one browser smoke test pass. |
| M0-08 | Review dependency audit without forced upgrades. | M0-07 | `DONE` | Lead | `pnpm audit --json` on 2026-08-17 reviewed 554 dependencies: 0 info/low/moderate/high/critical advisories; no forced upgrade applied. |
| M0-09 | Create README skeleton and repository documentation links. | M0-06 | `DONE` | Lead | README now has verified run/quality commands, architecture and design links, honest scenario placeholders, omissions, security evidence, and factual agent-work history. |
| M0-10 | Commit the intentional foundation. | M0-04, M0-05, M0-07, M0-08, M0-09 | `DONE` | Lead | Root commit `fb75de0` (`chore: establish verified project foundation`); staged diff check passed and the post-commit worktree was clean. |

### M0-06 evidence

```text
Task: M0-06
Status: DONE
Owner: Lead
Files: Git metadata; package.json; pnpm-lock.yaml; pnpm-workspace.yaml;
       .node-version; .npmrc; standard Next.js/Tailwind/ESLint scaffold;
       AGENTS.md command and Next.js rule sections
Checks: pnpm list --depth 0; HTTP GET / returned 200 from the candidate's
        VS Code-run Next.js 16.3.1 server;
        pnpm lint; pnpm build
Requirements: accepted framework security baseline and src/app boundary
Risks/assumptions: host Node is 24.16.0, so pnpm warns until the host installs
                   the repository-pinned Node 24.18.0 LTS; verification passed
                   on the same Node 24 major
Next: M0-07
```

### M0-07 evidence

```text
Task: M0-07
Status: DONE
Owner: Lead
Files: package.json; pnpm-lock.yaml; tsconfig.json; eslint.config.mjs;
       prettier.config.mjs; .prettierignore; vitest.config.mts;
       playwright.config.ts; src/test/setup.ts; src/app/page.test.tsx;
       tests/e2e/scaffold.spec.ts; AGENTS.md
Checks: pnpm check; pnpm test:e2e; pnpm build
Results: formatting, ESLint, strict TypeScript, 1 Vitest component test,
         1 Playwright Chromium test, and production build all passed
Risks/assumptions: browser matrix is Chromium-only at foundation stage;
                   host Node warning remains until 24.18.0 is installed
Next: M0-08
```

### M0-08 evidence

```text
Task: M0-08
Status: DONE
Owner: Lead
Files: pnpm-lock.yaml reviewed; task and discussion evidence updated
Checks: pnpm audit --json
Results: 554 total dependencies; 0 advisories at every severity
Risks/assumptions: audit reflects the npm advisory database at check time and
                   will be repeated before submission
Next: M0-09
```

### M0-09 evidence

```text
Task: M0-09
Status: DONE
Owner: Lead
Files: README.md; task and discussion evidence
Checks: pnpm format; manual command/link/placeholder review
Requirements: DR-08 foundation, DR-09 placeholder, DR-10 omission register,
              DR-11 factual agent history, architecture documentation links
Risks/assumptions: exact evaluator scenario instructions remain intentionally
                   absent until M2/M5 controls exist and are verified
Next: M0-10
```

### M0-10 evidence

```text
Task: M0-10
Status: DONE
Owner: Lead
Files: accepted design package, AGENTS.md, README.md, exact dependency
       foundation, src/app scaffold, formatting/testing configuration
Checks: pnpm check; prior M0-07 pnpm test:e2e and pnpm build;
        M0-08 pnpm audit --json; secret-pattern scan; git diff --cached --check
Commit: fb75de0 chore: establish verified project foundation
Risks/assumptions: exact Node 24.18.0 verification remains pending because the
                   host currently provides Node 24.16.0
Next: M1-01
```

## Milestone M1 — Contracts and domain core

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M1-01 | Define currency/network runtime schemas and TypeScript types. | M0-10 | `DONE` | Lead | Strict response schemas validate all six documented pairs plus an expanded catalog; branded open identifiers and runtime membership avoid a duplicated frontend allowlist. |
| M1-02 | Define payment creation, quote, merchant, and order schemas. | M1-01 | `DONE` | Lead | Strict request/response schemas preserve every money field as a decimal string and accept identifiers issued by an expanded catalog. |
| M1-03 | Define discriminated schemas for all eight status updates. | M1-02 | `DONE` | Lead | All eight PDF fixtures validate; 23 focused tests reject unsupported statuses/reasons, missing/cross-variant fields, and inconsistent confirmations. |
| M1-04 | Define problem-response and protocol-error models. | M1-02 | `DONE` | Lead | Exact 409 problem and typed problem/protocol errors pass 13 focused tests; payment `failed` remains business data. |
| M1-05 | Implement exhaustive lifecycle classification and presentation model. | M1-03, M1-04 | `DONE` | Lead | Exhaustive policy/presentation records and 18 focused tests cover all statuses, actionability, safety copy, and terminal behavior. |
| M1-06 | Implement decimal parsing, validation, arithmetic, and formatting. | M0-10 | `DONE` | Lead | Twenty-one focused tests cover catalog-defined scale, exact arithmetic, deliberate trailing-zero handling, and plain formatting without floats or scientific notation. |
| M1-07 | Implement pure expiration and polling-policy functions. | M1-03 | `DONE` | Lead | Thirty-two focused tests cover absolute deadlines, zero-time reconciliation, status-specific intervals, terminal stopping, and bounded retry/backoff. |
| M1-08 | Validate assessment fixtures against runtime contracts. | M1-01..M1-07 | `DONE` | Lead | Visual/text PDF audit and 82 contract tests cover every supplied success/problem fixture, malformed payloads, and unknown status; missing requote request coverage was added. |
| M1-09 | Integrate and commit the domain slice. | M1-08 | `DONE` | Lead | Commit `d5f978c` contains the verified M1 contracts, domain policies, tests, dependency pins, and aligned documentation. |

### M1-01 evidence

```text
Task: M1-01
Status: DONE
Owner: Lead
Files: package.json; pnpm-lock.yaml;
       src/features/checkout/api/contracts/currencies.ts;
       src/features/checkout/api/contracts/currencies.test.ts;
       architecture and execution documentation
Checks: pnpm exec vitest run
        src/features/checkout/api/contracts/currencies.test.ts;
        pnpm typecheck; pnpm lint; pnpm format:check; pnpm audit --json
Results: 1 focused file and 15 contract tests passed; strict TypeScript,
         ESLint, and formatting passed; 0 dependency advisories
Requirements: PR-02; MR-01; MR-03
Risks/assumptions: currency-to-network compatibility is derived from validated
                   API data rather than duplicated as a client matrix;
                   host Node remains 24.16.0 versus the 24.18.0 project pin
Next: M1-02
```

### M1-02 evidence

```text
Task: M1-02
Status: DONE
Owner: Lead
Files: src/features/checkout/api/contracts/currencies.ts;
       src/features/checkout/api/contracts/payments.ts;
       src/features/checkout/api/contracts/payments.test.ts;
       execution documentation
Checks: pnpm exec vitest run
        src/features/checkout/api/contracts/payments.test.ts;
        pnpm exec vitest run <currency and payment contract tests>;
        pnpm check
Results: 20 focused payment tests, 35 combined contract tests, and all 36
         repository tests passed; formatting, ESLint, and strict TypeScript pass
Requirements: PR-03; PR-05; PR-06; MR-01; MR-02
Risks/assumptions: request schema validates identifier shape while the route
                   will validate pair compatibility against the latest
                   currency catalog; asset-scale enforcement remains M1-06
Next: M1-03
```

### M1-01/M1-02 open-catalog correction evidence

```text
Task: M1-01 and M1-02 compatibility correction
Status: DONE
Owner: Lead
Files: payment-method, currency, and payment contracts and tests;
       domain/payment-method.ts and focused tests; contract conventions,
       architecture, and discussion history
Checks: pnpm exec vitest run <four affected contract/domain files>;
        pnpm typecheck; pnpm check; git diff --check
Results: 44 focused tests and all 99 repository tests passed; formatting,
         ESLint, and strict TypeScript passed
Requirements: PR-02; PR-03; forward-compatible catalog integration
Risks/assumptions: TypeScript cannot derive a build-time literal union from a
                   runtime catalog. Distinct brands prevent identifier mixups;
                   current-catalog membership establishes availability.
Next: M1-06 remains active
```

### M1-03 evidence

```text
Task: M1-03
Status: DONE
Owner: Lead
Files: src/features/checkout/api/contracts/payment-status.ts;
       src/features/checkout/api/contracts/payment-status.test.ts;
       decimal-boundary tests and execution documentation
Checks: PDF pages 3-5 model-to-schema audit;
        pnpm exec vitest run <all three contract test files>;
        pnpm check; git diff --check
Results: all 8 status fixtures and all 6 currency/network pairs validate;
         23 focused status tests, 60 contract tests, and all 61 repository
         tests pass; formatting, ESLint, and strict TypeScript pass
Requirements: PR-02; PR-05; PR-09..PR-16; MR-01..MR-04
Risks/assumptions: strict objects intentionally reject unexpected protocol
                   fields; confirmation-state relationships are validated;
                   leading-zero decimal strings are preserved because the PDF
                   does not forbid them
Next: M1-04
```

### M1-04 evidence

```text
Task: M1-04
Status: DONE
Owner: Lead
Files: src/features/checkout/api/contracts/problem.ts;
       src/features/checkout/api/contracts/problem.test.ts;
       contract conventions and execution documentation
Checks: pnpm exec vitest run
        src/features/checkout/api/contracts/problem.test.ts;
        pnpm check; git diff --check
Results: exact application/problem+json fixture and 13 focused tests passed;
         all 74 repository tests passed; formatting, ESLint, and strict
         TypeScript passed
Requirements: PR-08; PR-14; PR-15; PR-16
Risks/assumptions: RFC detail remains opaque; response Content-Type and the
                   actual HTTP/body status match will be enforced by the typed
                   API client when it is implemented
Next: M1-05
```

### M1-05 evidence

```text
Task: M1-05
Status: DONE
Owner: Lead
Files: src/features/checkout/domain/payment-status.ts;
       src/features/checkout/domain/payment-presentation.ts;
       corresponding focused tests; status-vocabulary contract integration;
       shopper-help decision and execution documentation
Checks: pnpm exec vitest run <two lifecycle domain test files>;
        pnpm check; git diff --check
Results: 18 focused lifecycle/presentation tests and all 92 repository tests
         passed; formatting, ESLint, and strict TypeScript passed
Requirements: PR-04; PR-10..PR-15
Risks/assumptions: underpaid remains provisionally non-terminal; inline shopper
                   education is used because no authoritative hosted-checkout
                   help page was found; no external help URL is shipped
Next: M1-06
```

### M1-06 evidence

```text
Task: M1-06
Status: DONE
Owner: Lead
Files: package.json; pnpm-lock.yaml;
       src/features/checkout/domain/money.ts and focused tests;
       execution and discussion documentation
Checks: pnpm exec vitest run src/features/checkout/domain/money.test.ts;
        pnpm typecheck; pnpm check; pnpm audit --json; git diff --check
Results: 21 focused money tests and all 120 repository tests passed;
         formatting, ESLint, and strict TypeScript passed; 0 advisories across
         556 audited dependencies
Requirements: MR-01..MR-05; ADR-0004
Risks/assumptions: transfer formatting deliberately preserves the validated
                   wire representation; calculated formatting removes only
                   insignificant trailing zeroes and never rounds; asset scale
                   comes from the validated catalog
Next: M1-07
```

### M1-07 evidence

```text
Task: M1-07
Status: DONE
Owner: Lead
Files: src/features/checkout/domain/quote-expiration.ts;
       src/features/checkout/domain/polling-policy.ts; focused tests;
       architecture and discussion documentation
Checks: pnpm exec vitest run <expiration and polling policy tests>;
        pnpm typecheck; pnpm check; git diff --check
Results: 32 focused policy tests and all 152 then-current repository tests
         passed; formatting, ESLint, and strict TypeScript passed
Requirements: PR-06..PR-13; PR-16; ADR-0003
Risks/assumptions: polling intervals are responsive assessment constants, not
                   claims about production chain timing; underpaid remains
                   provisionally active; TanStack adapters must preserve the
                   documented one-based consecutive-failure semantics
Next: M1-08
```

### M1-08 evidence

```text
Task: M1-08
Status: DONE
Owner: Lead
Files: payment creation/requote schemas and tests; PDF audit evidence in task
       and discussion documentation
Checks: full visual and extracted-text audit of PDF pages 2-6;
        pnpm exec vitest run src/features/checkout/api/contracts;
        pnpm typecheck; pnpm check; pnpm build; git diff --check
Results: 82 contract tests and all 157 repository tests passed; production
         Next.js build passed. Audit found and fixed the previously missing
         requote request schema; successful requote correctly reuses the
         payment-creation response schema.
Requirements: PR-02..PR-17; MR-01..MR-05
Risks/assumptions: strict object policy targets the fixed assessment mock;
                   server-driven catalog values remain intentionally open
Next: M1-09
```

### M1-09 evidence

```text
Task: M1-09
Status: DONE
Owner: Lead
Files: complete M1 contract/domain slice, exact dependency pins, AGENTS.md,
       architecture, open questions, discussion history, and execution tracker
Checks: pnpm check; pnpm build; pnpm audit --json; git diff --cached --check
Results: 12 test files and 157 tests passed; production Next.js build passed;
         0 dependency advisories; staged diff check passed
Commit: d5f978c feat: establish checkout contracts and domain core
Risks/assumptions: host Node remains 24.16.0 versus the repository-pinned
                   24.18.0; all verification passed on the same Node 24 major
Next: M2-01
```

### M1 safe parallelism

After schemas/interfaces are frozen by the lead:

- `M1-06` may run independently from lifecycle presentation work.
- Fixture negative-test authoring may run independently with a separate file
  allowlist.
- Central schemas, status taxonomy, barrel exports, and configuration remain
  single-owner.

## Milestone M2 — Deterministic mock API

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M2-01 | Implement validated currency fixtures and `GET /api/currencies`. | M1-09 | `DONE` | Lead | Runtime-validated fixture and HTTP route return all six documented combinations; four focused tests, full checks, production build, and live HTTP verification pass. |
| M2-02 | Implement quote factory and `POST /api/payments`. | M2-01 | `DONE` | Lead | All six catalog methods produce validated, internally consistent quotes with exact decimal totals and three-minute expiry; malformed or unavailable selections return typed 400 problems; focused/full tests, build, and live HTTP checks pass. |
| M2-03 | Implement payment scenario store/simulator. | M1-09 | `DONE` | Lead | Exact-state and quote-consistent deterministic progression modes, stable status snapshots, validated delay/failure controls, and server-only store integration pass focused and full verification. |
| M2-04 | Implement `GET /api/payments/:reference`. | M2-03 | `DONE` | Lead | All eight states, delay, one-shot/persistent HTTP failure, and a real empty-reply disconnect are triggerable through validated HTTP routes; full tests, build, and live Next.js checks pass. |
| M2-05 | Implement requote route and 409 behavior. | M2-02, M2-03 | `DONE` | Lead | Same-reference complete replacement quote, exact three-minute deadline, typed early 409, and lifecycle-safe conflict behavior pass focused/full tests, build, and live HTTP verification. |
| M2-06 | Add development request instrumentation for concurrency evidence. | M2-04 | `DONE` | Lead | Per-reference current/maximum/total metrics are observable and resettable without shopper coupling; focused/full tests, build, and warmed live overlap verification pass. |
| M2-07 | Add route/contract integration tests and commit. | M2-01..M2-06 | `DONE` | Lead | A serial real-HTTP Playwright suite reaches every state and adverse condition, README commands match implemented controls, and full unit/browser/build/audit gates pass. |

### M2-01 evidence

```text
Task: M2-01
Status: DONE
Owner: Lead
Files: src/mocks/fixtures/currencies.ts and focused test;
       src/app/api/currencies/route.ts and focused test;
       execution and discussion documentation
Checks: pnpm exec vitest run <fixture and route tests>; pnpm typecheck;
        live GET http://127.0.0.1:3000/api/currencies; pnpm check;
        pnpm build; git diff --check
Results: 4 focused tests and all 161 repository tests passed; live endpoint
         returned HTTP 200 application/json with all six combinations;
         production build includes dynamic /api/currencies route
Requirements: PR-02; M2-01 acceptance gate
Risks/assumptions: currency names not enumerated in the PDF table use the
                   conventional display values USD Coin and Ether; the fixture
                   is validated at module initialization and remains mock-only
Next: M2-02
```

### M2-02 evidence

```text
Task: M2-02
Status: DONE
Owner: Lead
Files: src/mocks/quote-factory.ts and focused test;
       src/app/api/payments/route.ts and focused test;
       generic bad-request problem contract and focused test;
       architecture, execution, and discussion documentation
Checks: pnpm exec vitest run <problem, factory, and route tests>;
        pnpm typecheck; live POST http://127.0.0.1:3100/api/payments for 201
        and 400 paths; pnpm check; pnpm build; git diff --check
Results: 29 focused tests and all 177 repository tests passed; live endpoint
         returned HTTP 201 application/json with exact three-minute expiry and
         HTTP 400 application/problem+json for an unavailable pair; production
         build includes dynamic /api/payments route
Requirements: PR-03; PR-04; FR-03; FR-04; M2-02 acceptance gate
Risks/assumptions: five non-PDF method profiles use clearly synthetic,
                   deterministic mock addresses; the PDF USDT/Tron profile is
                   preserved exactly; host Node remains 24.16.0 versus the
                   repository-pinned 24.18.0 and all verification passed on
                   the same Node 24 major
Commit strategy: approved by the candidate on 2026-08-18
Next: M2-03
```

### M2-03 evidence

```text
Task: M2-03
Status: DONE
Owner: Lead
Files: src/mocks/payment-simulator.ts and focused test;
       src/mocks/scenario-store.ts and focused test;
       payment-creation route registration and focused test;
       open-question, architecture, execution, and discussion documentation
Checks: pnpm exec vitest run <simulator, store, and payment-route tests>;
        pnpm typecheck; pnpm check; pnpm build; git diff --check
Results: 42 focused tests and all 213 repository tests passed; formatting,
         ESLint, strict TypeScript, and production build passed
Requirements: PR-17 groundwork; M2-03 acceptance gate
Risks/assumptions: the store is intentionally process-local and mock-only;
                   one-confirmation methods skip the impossible confirming
                   intermediate state; the network-disconnect instruction is
                   modeled but its route-level feasibility belongs to M2-04;
                   host Node remains 24.16.0 versus the declared 24.18.0
Commit strategy: approved by the candidate on 2026-08-18
Next: M2-04
```

### M2-04 evidence

```text
Task: M2-04
Status: DONE
Owner: Lead
Files: dynamic payment-status route and focused test;
       development-only scenario route and focused test;
       scenario control schemas; generic 404/500 problem contracts and tests;
       architecture, execution, and discussion documentation
Checks: focused Vitest and typecheck; live POST payment, PUT scenario, and GET
        status requests for success, 250 ms one-shot 500/recovery, and network
        disconnect; pnpm check; pnpm build; git diff --check
Results: all eight states validate; 61 initial route-focused tests and all 235
         repository tests passed; live failure took ~261 ms, recovery ~259 ms,
         and disconnect returned curl exit 52; production build passed
Requirements: PR-09; PR-14; PR-16; PR-17; M2-04 acceptance gate
Risks/assumptions: the disconnect intentionally emits a Next.js server pipe
                   error while giving the client an empty reply; the scenario
                   control route returns 404 in production; host Node remains
                   24.16.0 versus the declared 24.18.0
Next: M2-05
```

### M2-05 evidence

```text
Task: M2-05
Status: DONE
Owner: Lead
Files: dynamic requote route and focused test;
       store status snapshot accessor and defensive-copy test;
       generic conflict problem contract and test;
       lifecycle, execution, and discussion documentation
Checks: 49 focused Vitest tests and typecheck; live early 409, dev-triggered
        expiry, and successful 201 requote; pnpm check; pnpm build;
        git diff --check
Results: all 243 repository tests passed; live response preserved the reference,
         replaced USDT/Tron with a complete USDC/Polygon quote, and set a new
         three-minute expiry; production build passed
Requirements: PR-08; PR-11; FR-04; M2-05 acceptance gate
Risks/assumptions: unsafe post-detection/settlement requotes use a generic 409
                   because the supplied early-expiry problem would be untrue;
                   host Node remains 24.16.0 versus the declared 24.18.0
Next: M2-06
```

### M2-06 evidence

```text
Task: M2-06
Status: DONE
Owner: Lead
Files: request instrumentation and focused test;
       status-route instrumentation and overlap test;
       development-only metrics route and focused test;
       architecture, execution, and discussion documentation
Checks: 24 focused Vitest tests and typecheck; warmed live pair of simultaneous
        one-second status requests plus metrics GET; pnpm check; pnpm build;
        git diff --check
Results: live metrics reported current 0, maximum 2, started 2, completed 2;
         both overlapping requests completed in ~1.01 seconds; all 253 tests
         and the production build passed
Requirements: PR-13 evidence infrastructure; M2-06 acceptance gate
Risks/assumptions: cold compilation can serialize/skew an initial manual probe,
                   so live concurrency evidence must warm the route first;
                   host Node remains 24.16.0 versus the declared 24.18.0
Next: M2-07
```

### M2-07 evidence

```text
Task: M2-07
Status: DONE
Owner: Lead
Files: tests/e2e/mock-api.spec.ts; Playwright and narrow Next dev-origin config;
       verified README scenario instructions; quality, execution, and
       discussion documentation
Checks: pnpm check; pnpm test:e2e; pnpm build; pnpm audit --json;
        git diff --check
Results: 23 Vitest files and 253 tests passed; four Playwright tests passed;
         production build contains all seven application/API routes; audit
         found 0 info/low/moderate/high/critical advisories across 556 deps
Requirements: PR-02; PR-03; PR-08; PR-09; PR-13; PR-14; PR-16; PR-17;
              DR-09; M2-07 acceptance gate
Risks/assumptions: Playwright uses next dev because scenario controls are
                   intentionally unavailable in production; the disconnect
                   test intentionally emits a server pipe-error log; host Node
                   remains 24.16.0 versus the declared 24.18.0
Next: M3-01, pending work authorization beyond M2
```

### M2 safe parallelism

After M1 contracts are frozen, `M2-01/M2-02` and `M2-03` can have separate
owners if they do not share files. Route integration remains lead-owned.

## Milestone M3 — Safe quote experience

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M3-01 | Add QueryClient provider, typed API client, and query keys. | M1-09, M2-07 | `DONE` | Lead | QueryClient ownership, cancelable typed transport, runtime success/problem validation, reference-aware keys, 267 repository tests, build, and audit pass. |
| M3-02 | Build merchant/order summary and method-selection step. | M3-01 | `DONE` | Lead | Validated hosted-session summary, exact locale-safe EUR formatting, all six API methods, keyboard selection, recovery UI, 273 tests, build, and Chromium journey pass. |
| M3-03 | Implement quote mutation and stale-response protection. | M3-01, M3-02 | `DONE` | Lead | Superseded requests abort; ignored cancellation and late obsolete success cannot update the visible quote or payment-reference cache; 276 tests and Chromium journey pass. |
| M3-04 | Build fixed issued-method and guarded-change flow. | M3-03 | `DONE` | Lead | Issued method controls are removed; the guarded warning defaults to keeping the quote, restores focus on cancel, and deactivates instructions before selection returns; 277 tests and all four Chromium journeys pass. |
| M3-05 | Build exact amount, fee breakdown, address/copy, and network safety UI. | M3-03 | `DONE` | Lead | One validated quote supplies the exact total, breakdown, network, and address; copy is exact, announced without focus movement, and recoverable; 283 tests and all four Chromium journeys pass. |
| M3-06 | Add local QR generation and QR/address consistency tests. | M3-05 | `DONE` | Lead | Local SVG generation encodes the exact visible address; asset/network are explicit; no external QR request occurs; 283 tests, build, audit, and four Chromium journeys pass. |
| M3-07 | Add responsive and accessibility verification for quote flow. | M3-02..M3-06 | `DONE` | Lead | 390px layout, wrapping, touch targets, keyboard focus, reduced motion, semantic states, and measured text contrast pass; 283 tests, build, and six Chromium journeys pass. |
| M3-08 | Integrate Figma direction when available without changing domain behavior. | M3-02..M3-07 | `DONE` | Lead + candidate | Candidate reference and normal-scale desktop/mobile captures were compared; visual direction is retained while the task-dense selector remains primary; issued state has truthful heading/copy; all gates pass. |
| M3-09 | Commit the safe quote slice. | M3-08 | `DONE` | Lead | Candidate-approved feature and accessibility/visual commits were created locally after all unit, build, browser, audit, and visual gates passed; no push performed. |

### M3 safe parallelism

After component props and design tokens are frozen, independent presentational
components and accessibility test-case authoring may run in parallel. Query
integration, quote identity, shared styling tokens, and final composition remain
single-owner.

### M3-01 evidence

```text
Task: M3-01
Status: DONE
Owner: Lead
Files: package.json; pnpm-lock.yaml; src/app/providers.tsx;
       src/app/providers.test.tsx; src/app/layout.tsx;
       src/features/checkout/api/checkout-api.ts and tests;
       src/features/checkout/api/checkout-query-keys.ts and tests;
       problem contract union and architecture/execution documentation
Checks: 34 focused tests; pnpm check; pnpm build; pnpm audit --json;
        git diff --check
Results: exact @tanstack/react-query 5.101.4; 26 Vitest files and 267 tests,
         formatting, ESLint, strict TypeScript, and production build pass;
         0 advisories across 558 dependencies
Requirements: one remote-state owner; validated HTTP boundary; cancellation;
              reference-aware cache identity; transport/business separation
Risks/assumptions: host Node 24.16.0 remains below the repository's pinned
                   24.18.0 minimum; Figma MCP read tools remain unavailable in
                   this VS Code session and are not required until M3-08
Next: M3-02
```

### M3-02 evidence

```text
Task: M3-02
Status: DONE
Owner: Lead
Files: checkout session config; exact EUR formatter and tests; currencies hook;
       checkout/order/method components; app page/layout/styles and tests;
       mock quote context reuse; Playwright shopper page journey; design docs
Checks: 33 focused tests; pnpm check; pnpm build; pnpm test:e2e;
        git diff --check
Results: 26 Vitest files and 273 tests, formatting, ESLint, strict TypeScript,
         production build, and all 4 Chromium journeys pass
Requirements: PR-01; PR-02; PR-04 at selection; MR-01; MR-02; accessible
              keyboard selection; truthful catalog-load recovery
Risks/assumptions: the brief has no pre-quote checkout-context endpoint, so
                   merchant/order data is validated hosted-page input shared
                   with the mock response; direct Browser-plugin visual review
                   was unavailable, while the real Playwright UI journey passed;
                   full responsive/visual verification remains M3-07/M3-08
Next: M3-03
```

### M3-03 evidence

```text
Task: M3-03
Status: DONE
Owner: Lead
Files: checkout API request/response relationship validation and tests;
       mutation keys; use-create-payment hook; checkout integration and tests;
       Playwright quote journey; architecture and execution documentation
Checks: 19 focused API/query/page tests; pnpm check; pnpm build;
        pnpm test:e2e; git diff --check
Results: 26 Vitest files and 276 tests, formatting, ESLint, strict TypeScript,
         production build, and all 4 Chromium journeys pass
Requirements: PR-03; stale-response invariant; complete quote atomicity;
              request cancellation; selection/response relationship validation
Risks/assumptions: an aborted request may already have reached the backend;
                   client safety therefore relies on both best-effort abort and
                   the independent intent-id cache guard
Next: M3-04
```

### M3-04 evidence

```text
Task: M3-04
Status: DONE
Owner: Lead
Files: fixed-method commitment component; checkout integration and tests;
       guarded-change Chromium journey; execution and discussion documentation
Checks: pnpm check; pnpm build; pnpm test:e2e; focused Prettier check;
        git diff --check
Results: 26 Vitest files and 277 tests, formatting, ESLint, strict TypeScript,
         production build, and all 4 Chromium journeys pass
Requirements: issued asset/network immutability; explicit destructive-action
              warning; safe default and focus restoration; old instructions
              deactivate before another method can be selected
Risks/assumptions: status polling starts in M4, so the method-change action is
                   currently available for every newly issued awaiting-payment
                   quote; M4 removes it as soon as authoritative detection is
                   observed; the abandoned reference remains cache-addressable
                   but is no longer rendered as an active instruction
Next: M3-05
```

### M3-05 evidence

```text
Task: M3-05
Status: DONE
Owner: Lead
Files: transfer-instruction, network-safety, and address-copy components and
       tests; quote precision/total validation; checkout and Chromium journey;
       architecture, execution, and discussion documentation
Checks: 11 focused component/page tests; pnpm check; pnpm build;
        pnpm test:e2e; git diff --check
Results: 28 Vitest files and 283 tests, formatting, ESLint, strict TypeScript,
         production build, and all 4 Chromium journeys pass
Requirements: PR-04; PR-05 except QR; MR-02; MR-05; exact address copy;
              accessible copy success/failure; inline wrong-network guidance
Risks/assumptions: quote monetary scale is cross-validated against the exact
                   catalog metadata captured when selection occurs; the quote
                   total is accepted only when it exactly equals payment amount
                   plus network fee; countdown and QR remain M3-06/M4 work
Next: M3-06
```

### M3-06 evidence

```text
Task: M3-06
Status: DONE
Owner: Lead
Files: package.json and pnpm lockfile; local payment QR component; transfer
       instruction consistency test; Chromium no-external-request assertion;
       execution, architecture, and discussion documentation
Checks: 9 focused page/instruction tests; pnpm check; pnpm build;
        pnpm test:e2e; pnpm audit --json; git diff --check
Results: exact qrcode.react 4.2.0; 28 Vitest files and 283 tests, formatting,
         ESLint, strict TypeScript, production build, and all 4 Chromium
         journeys pass; 0 advisories across 559 dependencies
Requirements: remaining PR-05 QR requirement; local generation; exact
              address/QR identity; explicit network and asset; no remote data
Risks/assumptions: the assessment and candidate discussion define the QR as the
                   exact destination address rather than a chain-specific URI;
                   the shopper must still verify asset and network in the wallet
Next: M3-07
```

### M3-07 evidence

```text
Task: M3-07
Status: DONE
Owner: Lead
Files: global reduced-motion policy; method-card motion fallback; mobile,
       keyboard, contrast, status, and recoverable-error browser checks;
       execution and discussion documentation
Checks: 2 focused Chromium checks; pnpm check; pnpm build;
        pnpm test:e2e; git diff --check
Results: 28 Vitest files and 283 tests, formatting, ESLint, strict TypeScript,
         production build, and all 6 Chromium journeys pass
Requirements: responsive quote flow; no horizontal overflow; address/QR fit;
              44px actions; keyboard method issuance and dialog focus recovery;
              reduced motion; semantic status/error regions; WCAG 4.5:1 text
              contrast for normal, success, warning, and error treatments
Risks/assumptions: full automated accessibility scanning across every lifecycle
                   outcome remains M6-06; the focused accessibility journey
                   intercepts quote creation to avoid mutating shared simulator
                   state while the separate shopper journey exercises real HTTP
Next: M3-08
```

### M3-08 evidence

```text
Task: M3-08
Status: DONE
Owner: Lead + candidate reference
Files: state-aware checkout heading/copy and assertions; visual-review evidence;
       execution and discussion documentation
Checks: normal-scale desktop selection and issued-quote captures; full-page
        mobile issued-quote capture; pnpm check; pnpm build; pnpm test:e2e;
        git diff --check
Results: candidate screenshot's restrained palette, rounded cards, typography,
         order-summary treatment, and safety hierarchy are retained; 28 Vitest
         files/283 tests, production build, and 6 Chromium journeys pass
Requirements: visual direction without lifecycle/domain drift; truthful issued
              state; task priority; desktop/mobile readability
Risks/assumptions: live Figma MCP extraction remains unavailable, so the
                   candidate-provided full reference screenshot is the visual
                   source; final candidate review can refine polish without
                   changing the verified payment hierarchy
Next: M3-09
```

### M3-09 evidence

```text
Task: M3-09
Status: DONE
Owner: Lead
Commits: feat(checkout): render network-safe payment instructions;
         style(checkout): refine accessible responsive checkout
Checks: pnpm check; pnpm build; pnpm test:e2e; pnpm audit --json;
        git diff --check; staged diff checks before both commits
Results: 28 Vitest files and 283 tests, formatting, ESLint, strict TypeScript,
         production build, and all 6 Chromium journeys pass; dependency audit
         has 0 advisories across 559 dependencies; normal-scale desktop/mobile
         visual review completed
Requirements: M3 safe-quote slice committed with real unsquashed history
Risks/assumptions: host Node remains 24.16.0 versus the repository's declared
                   24.18.0 minimum; live Figma MCP remains unavailable; no push
                   was performed
Next: M4-01
```

## Milestone M4 — Countdown, polling, and lifecycle

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M4-01 | Implement absolute countdown and focus/visibility recomputation. | M1-07, M3-09 | `DONE` | Lead | Absolute clock derivation, second-boundary repainting, focus/visibility restoration, new-deadline replacement, cleanup, neutral zero copy, 298 tests, build, and six Chromium journeys pass. |
| M4-02 | Implement zero-time status reconciliation. | M4-01, M3-01 | `DONE` | Lead | Instructions deactivate at zero; one reference-bound GET decides local expiry; detected funds win; transport/protocol failure stays non-business; 302 tests, build, and six Chromium journeys pass. |
| M4-03 | Implement requote UI, atomic replacement, and 409 recovery. | M2-05, M4-02 | `DONE` | Lead | Old instructions stay inactive; complete new quote replaces the cached snapshot; 409 refreshes authoritative status and detected funds win; 306 tests, build, and six Chromium journeys pass. |
| M4-04 | Implement non-overlapping dynamic status polling. | M1-07, M3-01 | `DONE` | Lead | Status-driven intervals; maximum one request; abort on unmount/reference change; local/authoritative terminal stop; detected freezes expiration; 320 tests, build, and six Chromium journeys pass. |
| M4-05 | Implement detected and confirming presentations. | M4-04 | `DONE` | Lead | Exact received amount and network, zero/current confirmation progress, do-not-resend copy, transaction/reference identity, method lock, 322 tests, build, and six Chromium journeys pass. |
| M4-06 | Implement paid, underpaid, overpaid, expired, and failed presentations. | M4-04 | `DONE` | Lead | Exact outcome data and safe next actions; underpaid-only transfer uses outstanding amount and consistent network/address/QR; no refund/retry promise; 338 tests, build, and six Chromium journeys pass. |
| M4-07 | Add lifecycle component/integration tests. | M4-01..M4-06 | `DONE` | Lead | All eight statuses render through the polling boundary; all active/terminal poll classes, countdown races, requote races, cancellation, money/address consistency, and accessibility semantics are covered; final gate has 353 tests. |
| M4-08 | Commit lifecycle slice. | M4-07 | `DONE` | Lead | Candidate-approved four-commit strategy was created and pushed through `34e398a`; no amend, squash, or force operation. |

### M4-01 evidence

```text
Task: M4-01
Status: DONE
Owner: Lead
Files: absolute countdown formatter and tests; clock-derived countdown hook and
       fake-time tests; non-live countdown component; instruction integration;
       execution documentation
Checks: 37 focused tests; pnpm check; pnpm build; pnpm test:e2e;
        git diff --check
Results: 30 Vitest files and 298 tests, formatting, ESLint, strict TypeScript,
         production build, and all 6 Chromium journeys pass
Requirements: PR-06; PR-07; absolute `expires_at`; background/focus recovery;
              no decremented authoritative counter; no tick announcements;
              cleanup and new-deadline timer replacement
Risks/assumptions: browser/device clock skew remains an explicitly documented
                   body-contract limitation; zero-time authority is M4-02
Next: M4-02
```

### M4-02 evidence

```text
Task: M4-02
Status: DONE
Owner: Lead
Files: reference-specific status query key and API relationship validation;
       deadline reconciliation hook; issued-flow safety states and race tests;
       countdown ownership refactor; execution, architecture, and discussion docs
Checks: 35 focused tests; pnpm check; pnpm build; pnpm test:e2e;
        git diff --check
Results: 31 Vitest files and 302 tests, formatting, ESLint, strict TypeScript,
         production build, and all 6 Chromium journeys pass
Requirements: PR-08 pre-requote state; detection/expiration race; exactly one
              zero-time GET; reference identity; transport/business separation;
              immediate instruction and method-change deactivation
Risks/assumptions: detailed lifecycle panels and continued polling remain
                   M4-04..M4-06; M4-02 uses safe interim authoritative summaries
Next: M4-03
```

### M4-03 evidence

```text
Task: M4-03
Status: DONE
Owner: Lead
Files: shared create/requote session and monetary validation; requote response
       relationship checks; active reference-addressed quote observer; requote
       mutation/cache transition; expired-state UI; success and conflict tests;
       deterministic browser-worker configuration; execution documentation
Checks: focused API/cache/component tests; pnpm check; pnpm build;
        pnpm test:e2e; git diff --check
Results: 31 Vitest files and 306 tests, formatting, ESLint, strict TypeScript,
         production build, and all 6 Chromium journeys pass
Requirements: PR-08; same payment reference; atomic complete quote replacement;
              fresh absolute deadline; recoverable validated 409 detail; one
              immediate status refresh; detected state wins over local expiry
Risks/assumptions: the deterministic mock has one process-local store and one
                   fixed reference, so browser workers are serialized; dynamic
                   polling and full lifecycle presentation remain M4-04..M4-06
Next: M4-04
```

### M4-04 evidence

```text
Task: M4-04
Status: DONE
Owner: Lead
Files: exhaustive named polling policy and tests; active reference-scoped status
       query; countdown enable/cleanup support; polling concurrency, cancellation,
       interval, terminal-stop, and immediate-lock integration tests; docs
Checks: 25 focused tests; pnpm check; pnpm build; pnpm test:e2e;
        git diff --check
Results: 33 Vitest files and 320 tests, formatting, ESLint, strict TypeScript,
         production build, and all 6 Chromium journeys pass
Requirements: PR-07; PR-09; one in-flight request maximum; dynamic active-state
              intervals; provisional underpaid continuation; terminal stopping;
              obsolete-reference/unmount cancellation; detection freezes expiry
Risks/assumptions: transport backoff/manual recovery remains M5; M4-04 preserves
                   last valid query data but does not yet render its connectivity
                   treatment; detailed lifecycle content remains M4-05/M4-06
Next: M4-05
```

### M4-05 evidence

```text
Task: M4-05
Status: DONE
Owner: Lead
Files: detected/confirming status panel and variant-schema tests; issued-flow
       lifecycle integration; task/discussion documentation
Checks: 9 focused component/integration tests; pnpm check; pnpm build;
        pnpm test:e2e; git diff --check
Results: 34 Vitest files and 322 tests, formatting, ESLint, strict TypeScript,
         production build, and all 6 Chromium journeys pass
Requirements: detected means zero confirmations; received amount, asset, and
              network remain exact; current/required progress is visible;
              do-not-resend guidance; transaction/reference identity; no
              countdown, QR, copy, or method-change action after detection
Risks/assumptions: explorer linking is intentionally absent because no trusted
                   network-specific explorer contract is supplied; remaining
                   status-specific actions and support copy are M4-06
Next: M4-06
```

### M4-06 evidence

```text
Task: M4-06
Status: DONE
Owner: Lead
Files: quote-aware status semantic validator/tests; paid, underpaid, overpaid,
       expired, and failed outcome panel/tests; issued-flow integration; docs
Checks: 23 focused validator/outcome/flow tests; pnpm check; pnpm build;
        pnpm test:e2e; git diff --check
Results: 36 Vitest files and 338 tests, formatting, ESLint, strict TypeScript,
         production build, and all 6 Chromium journeys pass
Requirements: exact status money scale; confirmation target integrity;
              underpaid same address/network and outstanding-only transfer;
              paid completion; terminal expiry/requote; factual overpayment;
              no automatic refund promise; no blind failed-payment retry
Risks/assumptions: underpaid remains provisionally non-terminal; support contact
                   details and refund handling are absent from the supplied
                   contract, so the UI retains the reference without inventing
                   a URL, policy, timing, or outcome
Next: M4-07
```

### M4-07 evidence

```text
Task: M4-07
Status: DONE
Owner: Lead
Files: issued-flow lifecycle integration matrix plus all M4 focused suites;
       lifecycle, architecture, discussion, and execution documentation
Checks: pnpm check; pnpm build; pnpm test:e2e; git diff --check
Results: 37 Vitest files and 353 tests, formatting, ESLint, strict TypeScript,
         production build, all 6 Chromium journeys, and diff hygiene pass
Requirements: all eight statuses through HTTP-query/UI boundary; every active
              and terminal polling class; absolute deadline and background
              recovery; detection/expiration and requote conflict races; no
              overlapping request; cancellation; exact money/address/QR;
              safe actions and accessible status structure
Risks/assumptions: failure-count backoff, persistent connectivity treatment,
                   manual retry, and evaluator scenario panel remain M5;
                   browser/device clock skew remains a body-contract limitation
Next: M4-08 commit strategy review
```

## Milestone M5 — Adverse transport and evaluator controls

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M5-01 | Implement retry/backoff and last-known-state preservation. | M4-08 | `DONE` | Lead | Retryable transport/5xx failures use 1/2/4-second backoff; protocol/client errors stop; cached detected data survives exhaustion and later polling recovery. |
| M5-02 | Build connectivity notice and manual retry. | M5-01 | `DONE` | Lead | Polite accessible retry/exhaustion/protocol treatments preserve business state, prohibit duplicate sending, and expose manual retry only after exhaustion. |
| M5-03 | Build development-only scenario panel. | M2-07, M4-08 | `DONE` | Lead + candidate review | An always-discoverable compact launcher/dock has a pre-quote guidance state, then controls every state, progression, delay, failure, and diagnostic through validated HTTP; shortcut/Escape/focus and responsive behavior are covered; references isolate sessions; production returns 404. |
| M5-04 | Verify slow responses never overlap polls. | M5-01, M5-03 | `DONE` | Lead | Playwright held a status response for 5s beyond the 3s interval and backend instrumentation remained current=1, maximum=1. |
| M5-05 | Commit adverse-condition/evaluator slice. | M5-01..M5-04 | `DONE` | Lead | Candidate approved five focused commits; implementation/test commits are `753b4c4`, `97f2bb5`, `da0b512`, and `307568e`; this documentation boundary completes M5 without amend or squash. |

### M5-01 evidence

```text
Task: M5-01
Status: DONE
Owner: Lead
Files: payment-status retry policy/tests; deadline status query and integration
       tests
Checks: focused retry/hook tests; pnpm check; pnpm build; pnpm test:e2e
Results: retryable TypeError and validated 5xx use exactly three retries at
         1s/2s/4s; protocol, 409, and unrelated errors do not; last detected
         data survives exhaustion and a later interval recovers to confirming
Requirements: transport/business separation; last-known-state preservation;
              bounded retry; automatic later recovery
Risks/assumptions: host Node remains 24.16.0 versus declared >=24.18.0
Next: M5-02
```

### M5-02 evidence

```text
Task: M5-02
Status: DONE
Owner: Lead
Files: connectivity notice/tests; issued payment flow integration/tests
Checks: focused component/integration tests; full M5 verification gate
Results: automatic retry, exhausted transport, and invalid protocol responses
         have distinct accessible copy; no transport path becomes failed or
         expired; manual retry appears only when automatic retries finish
Requirements: preserve business state; do-not-resend safety; accessible status;
              recovery without reload
Next: M5-03
```

### M5-03 evidence

```text
Task: M5-03
Status: DONE
Owner: Lead
Files: shared development HTTP contracts/client/query keys; evaluator panel and
       tests; mock stores/routes refactored to consume the shared contracts;
       development-only page composition
Checks: 40 focused panel/route/store tests; pnpm check; pnpm build;
        pnpm test:e2e
Results: all eight exact states, progression, delay, one-shot/persistent HTTP
         and disconnect failures, and live/resettable metrics are selectable;
         the panel never imports mock modules and production endpoints return 404
Requirements: visibly/semantically separate controls; real HTTP behavior;
              runtime validation; terminal-state refresh
Next: M5-04
```

### M5-04 evidence

```text
Task: M5-04
Status: DONE
Owner: Lead
Files: browser adverse-transport concurrency journey
Checks: focused Chromium journey; pnpm check; pnpm build; pnpm test:e2e
Results: 40 Vitest files/367 tests and 8 Chromium journeys pass; a 5-second
         real status response remains the only in-flight request more than
         3 seconds later; instrumentation reports maximum_in_flight=1
Requirements: non-overlapping polling; evaluator-verifiable backend evidence
Risks/assumptions: process-local mock state remains unsuitable for a
                   multi-instance deployment, but references isolate tabs and
                   parallel tests within the assessment server
Next: M5-05 commit strategy review
```

### M5-05 evidence

```text
Task: M5-05
Status: DONE
Owner: Lead + candidate approval
Commits: 753b4c4 feat(checkout): preserve payment state through status failures
         97f2bb5 fix(mock): isolate concurrent checkout sessions
         da0b512 feat(dev): add compact evaluator scenario dock
         307568e test(e2e): verify adverse transport and safe requote
         docs(checkout): record M5 decisions and evidence (this boundary)
Checks: pnpm check; pnpm build; pnpm test:e2e; git diff --check; staged
        diff checks before every commit
Results: 40 Vitest files/367 tests, production build, and all 8 Chromium
         journeys across 4 workers pass; manual candidate review accepted
Requirements: coherent unsquashed history; evaluator instructions match UI;
              candidate questions, findings, and corrections remain recorded
Risks/assumptions: host Node is 24.16.0 versus declared >=24.18.0; no push
                   was performed as part of the local commit boundary
Next: M6-01
```

### M5 candidate review correction evidence

```text
Finding: an expired quote blinked and could not be replaced during candidate
         review
Root cause: every mock POST reused AQH-100306-PMT; browser tests running against
            the reused development server overwrote the candidate's server-side
            quote while the open tab retained its older quote
Correction: payment creation allocates a distinct process-local reference;
            requote preserves it; scenario stores and metrics stay reference
            scoped; evaluator commands use the response reference
Checks: two-session route regression; two-session expired-to-requote browser
        journey; pnpm check; pnpm build; 8 Playwright journeys on 4 workers
Results: the first session expires/requotes without changing the second; 40
         Vitest files/365 tests and all 8 parallel Chromium journeys pass
Requirements: stale/cross-session isolation; quote identity; safe requote;
              candidate-owned review correction recorded truthfully
Next: M5-05 commit strategy review
```

## Milestone M6 — Critical journeys and accessibility

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M6-01 | Happy-path Playwright journey through paid. | M5-05 | `DONE` | Lead | Real UI journey covers quote/copy → awaiting → detected → confirming → paid; resetting metrics after paid and waiting 3.5s records zero new polls; all 9 parallel Chromium journeys pass. |
| M6-02 | Background-expiry and detection/expiry race journeys. | M5-05 | `DONE` | Lead | Playwright changes absolute time without firing accumulated timers; focus immediately locks instructions, then authoritative expired renders requote while detected wins the zero-time race; all 11 browser journeys pass. |
| M6-03 | Underpayment recovery journey. | M5-05 | `DONE` | Lead | Browser journey instructs only exact 43.69 USDT outstanding on the committed Tron method/address, preserves the QR payload, freezes expiry controls, continues with peak concurrency one, and reaches paid; all 12 browser journeys pass. |
| M6-04 | Slow/failing transport recovery journeys. | M5-05 | `DONE` | Lead | Slow and exhausted-HTTP-retry journeys preserve the last confirmed state, record peak concurrency one, distinguish transport from lifecycle failure/expiry, and recover to confirming; all 13 browser journeys pass. |
| M6-05 | Wrong-network and method-commitment journey. | M5-05 | `DONE` | Lead | Guarded change keeps the current quote by default, deactivates old instructions before reselection, issues a distinct consistent replacement quote, keeps wrong-network loss guidance explicit, and removes change controls after detection; all 14 browser journeys pass. |
| M6-06 | Automated accessibility scan and keyboard/mobile walkthrough. | M5-05 | `DONE` | Lead | Axe scans selection, active instructions, and every non-awaiting outcome with zero violations after correcting a discovered heading-order defect; keyboard/mobile/focus/contrast checks pass; 368 tests, build, 22 browser journeys, and zero audit findings pass. |
| M6-07 | Commit critical verification slice. | M6-01..M6-06 | `DONE` | Lead + candidate | Candidate approved the four-part boundary; critical lifecycle journeys are `a5e240d`, recovery/commitment journeys are `4cf96a0`, and accessibility verification/correction is `e662486`; this documentation commit closes the boundary. No push performed. |

### M6-01 evidence

```text
Task: M6-01
Status: DONE
Owner: Lead
Files: happy-path Playwright journey; execution tracker
Checks: focused Chromium journey; pnpm test:e2e; git diff --check
Results: exact awaiting instructions and address copy are exercised; UI then
         renders detected, confirming/progress, and paid in order; after paid,
         reset backend metrics stay at zero for a full 3.5-second interval;
         all 9 Chromium journeys pass across 4 workers
Requirements: complete shopper happy path; do-not-resend detection guidance;
              confirmation progress; terminal paid stop
Risks/assumptions: progression timing is assessment policy, not chain timing
Next: M6-02
```

### M6-02 evidence

```text
Task: M6-02
Status: DONE
Owner: Lead
Files: background-expiry/detection-race Playwright journeys; tracker
Checks: 2 focused Chromium journeys; pnpm test:e2e; git diff --check
Results: setSystemTime changes the absolute clock without running queued polls;
         focus restoration immediately removes amount/address/QR/change actions;
         a delayed status check then renders either authoritative expiry/requote
         or detected zero-confirmation guidance; all 11 Chromium journeys pass
Requirements: background time jump; immediate lock at zero; one reconciliation;
              detected or later can never become locally expired
Next: M6-03
```

### M6-03 evidence

```text
Task: M6-03
Status: DONE
Owner: Lead
Files: underpayment Playwright journey; tracker; discussion record
Checks: focused Chromium journey; pnpm test:e2e; git diff --check
Results: the documented USDT/Tron fixture renders exactly 43.69 USDT due;
         amount, network, address, and QR remain the issued instruction; expiry
         and method-change controls stay absent; polling continues with peak
         concurrency one and the same session can then reach paid; all 12
         Chromium journeys pass across 4 workers
Requirements: provisional non-terminal underpayment; outstanding amount only;
              same network/address; frozen expiry; non-overlapping polling
Risks/assumptions: underpaid remains provisional pending Triple-A confirmation
Next: M6-04
```

### M6-04 evidence

```text
Task: M6-04
Status: DONE
Owner: Lead
Files: adverse-transport Playwright journeys; tracker; discussion record
Checks: 2 focused Chromium journeys; pnpm test:e2e; git diff --check
Results: a five-second response records one in flight and peak one; persistent
         HTTP 500 responses exhaust the retry policy without replacing the
         detected state or showing failed/expired; explicit retry then recovers
         to confirming; all 13 Chromium journeys pass across 4 workers
Requirements: slow polling without overlap; last-known-state preservation;
              transport/business-state separation; automatic/manual recovery
Next: M6-05
```

### M6-05 evidence

```text
Task: M6-05
Status: DONE
Owner: Lead
Files: method-commitment Playwright journey; tracker; discussion record
Checks: focused Chromium journey; pnpm test:e2e; git diff --check
Results: keep is the safe focused default; confirming a change removes old
         amount/address/QR before selection; the replacement has a distinct
         reference and internally consistent Ethereum instructions; detection
         removes selectors/change while preserving explicit network identity;
         all 14 Chromium journeys pass across 4 workers
Requirements: guarded change while awaiting; wrong-network warning; atomic new
              quote; fixed method after funds are detected
Next: M6-06
```

### M6-06 evidence

```text
Task: M6-06
Status: DONE
Owner: Lead
Files: exact axe Playwright dependency; lifecycle accessibility scans;
       currency-heading correction/regression; tracker; discussion record
Checks: focused selector test; 8 focused Axe journeys; pnpm check; pnpm build;
        pnpm test:e2e; pnpm audit --json; git diff --check
Results: the first scan found one moderate heading-order defect and no lifecycle
         violations; currency groups now use level-two headings and every scan
         returns zero violations; 41 Vitest files/368 tests, production build,
         22 Chromium journeys on 4 workers, and all 560 audited dependencies
         with 0 vulnerabilities pass
Requirements: automated primary/outcome scans; keyboard-only issuance and focus
              recovery; semantic status/labels; mobile fit and 44px targets;
              reduced motion; normal/warning/success/error contrast
Risks/assumptions: automated scanning supplements rather than replaces manual
                   assistive-technology review; local Node 24.16.0 remains below
                   the repository's required 24.18.0 floor
Next: M6-07 commit strategy review
```

### M6-07 evidence

```text
Task: M6-07
Status: DONE
Owner: Lead + candidate
Files: focused browser and accessibility commits; execution/discussion records
Checks: candidate strategy review; git diff review; previously recorded full
        M6 check/build/browser/audit gate
Results: candidate approved four focused commits; a5e240d records happy path and
         expiry races; 4cf96a0 records recovery/transport/method commitment;
         e662486 records the accessibility matrix and heading correction; this
         documentation commit records the verified boundary without squashing
Requirements: coherent unsquashed history; truthful agent/candidate correction
              record; reproducible M6 evidence
Next: M7-01
```

## Milestone M7 — Submission documentation and final review

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M7-01 | Finalize design document and diagrams against implemented behavior. | M6-07 | `IN_PROGRESS` | Lead | Covers every required design topic and one defended decision. |
| M7-02 | Finalize ADR statuses and observed consequences. | M6-07 | `BLOCKED` | Lead + candidate | ADRs reflect real trade-offs, not tool descriptions. |
| M7-03 | Complete README run, scenario, dropped-work, and agent sections. | M6-07 | `BLOCKED` | Lead + candidate | Instructions reproduced from clean checkout; agent examples are factual. |
| M7-04 | Recheck React/Next advisories and dependency audit. | M7-01..M7-03 | `BLOCKED` | Lead | Final versions/check date/findings recorded. |
| M7-05 | Run complete build, typecheck, lint, unit/integration, browser, and accessibility verification. | M7-04 | `BLOCKED` | Lead | All pass or remaining limitation is explicit and accepted. |
| M7-06 | Audit requirements traceability and omissions. | M7-05 | `BLOCKED` | Lead + candidate | Every critical requirement has UI, test, and documentation evidence. |
| M7-07 | Review commit history and clean submission repository. | M7-06 | `BLOCKED` | Lead | No secrets/generated junk; history is unsquashed, coherent, and honest. |
| M7-08 | Prepare presentation and live-extension walkthrough. | M7-07 | `BLOCKED` | Candidate | Candidate can explain invariants, trade-offs, and safely modify a likely extension point. |

## Deferred and optional work register

Nothing is silently dropped. Move lower-value work here with a reason when the
time budget requires it.

| Item | Status | Reason / reconsideration trigger |
| --- | --- | --- |
| Decorative animation | `DEFERRED` | Reconsider only after all critical verification passes. |
| Blockchain explorer links | `DEFERRED` | API provides no authoritative explorer URL/network mapping. |
| Real wallet integration | `DEFERRED` | Explicitly out of scope. |
| Server-clock correction beyond absolute `expires_at` | `DEFERRED` | Reconsider if a reliable HTTP `Date` offset is simple and tested. |
| Redux Toolkit | `DEFERRED` | Add only for a demonstrated independent global client-state need. |
| WebSocket/SSE transport | `DEFERRED` | Polling is explicitly required. |

## Agent work and rejection log

Record material events as they happen; do not reconstruct or invent them at the
end.

| Date | Task | Agent proposal/output | Accepted, changed, or rejected | Reason and candidate contribution |
| --- | --- | --- | --- | --- |
| 2026-08-17 | Pre-scaffold planning | Scaffolded before the design package was approved. | Rejected and removed. | Candidate clarified that pre-coding technical design was the intended next step. |
| 2026-08-17 | Source layout | Root `app/` beside `src/features/`. | Changed. | Candidate identified unclear ownership; all application code moved conceptually under `src/`. |
| 2026-08-17 | Framework baseline | No exact Next.js version selected. | Changed. | Candidate connected current patched versions to checkout safety and required a security baseline. |
| 2026-08-17 | Foundation approval | Architecture gates remained marked as candidate decisions. | Accepted with one provisional domain interpretation. | Candidate accepted the foundation; `underpaid` remains explicitly provisional pending authoritative API semantics. |
| 2026-08-17 | Package manager | Package manager was unresolved. | pnpm accepted. | Candidate selected pnpm for speed; decision also records deterministic installs, efficient shared storage, and strict dependency boundaries. |

## Task update template

When changing a status, add evidence in the task row or a short note below the
relevant milestone:

```text
Task: Mx-yy
Status: REVIEW | DONE | BLOCKED
Owner: <agent or candidate>
Files: <owned/changed paths>
Checks: <commands and results>
Requirements: <IDs>
Risks/assumptions: <remaining items>
Next: <one task ID>
```
