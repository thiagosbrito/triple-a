# Delivery Task List

Status: Active execution tracker
Last updated: 2026-08-17

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

**Milestone M0: establish the repository from the accepted foundation.**

### Next task

`M0-10` — Verify and commit the intentional foundation.

The README matches the current repository and clearly marks future scenario
instructions. The complete foundation is now receiving its final staged review
and first coherent commit.

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
| M0-10 | Commit the intentional foundation. | M0-04, M0-05, M0-07, M0-08, M0-09 | `REVIEW` | Lead | Final quality, audit, ignored-artifact, secret-pattern, and repository-content review passed; commit creation remains. |

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

## Milestone M1 — Contracts and domain core

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M1-01 | Define currency/network runtime schemas and TypeScript types. | M0-10 | `BLOCKED` | Unassigned | All documented combinations validate; malformed data is rejected. |
| M1-02 | Define payment creation, quote, merchant, and order schemas. | M1-01 | `BLOCKED` | Unassigned | Complete creation fixture validates without numeric money coercion. |
| M1-03 | Define discriminated schemas for all eight status updates. | M1-02 | `BLOCKED` | Unassigned | Every fixture validates; missing status-specific fields fail. |
| M1-04 | Define problem-response and protocol-error models. | M1-02 | `BLOCKED` | Unassigned | Requote 409 and malformed/unknown responses remain distinct from payment failure. |
| M1-05 | Implement exhaustive lifecycle classification and presentation model. | M1-03, M1-04 | `BLOCKED` | Unassigned | Compile-time exhaustiveness; action/terminal categories match accepted semantics. |
| M1-06 | Implement decimal parsing, validation, arithmetic, and formatting. | M0-10 | `BLOCKED` | Unassigned | Six- and eighteen-decimal boundaries pass; no float or scientific notation. |
| M1-07 | Implement pure expiration and polling-policy functions. | M1-03 | `BLOCKED` | Unassigned | Absolute-time, terminal-state, and retry/backoff policies have deterministic tests. |
| M1-08 | Validate assessment fixtures against runtime contracts. | M1-01..M1-07 | `BLOCKED` | Unassigned | Contract suite covers success, malformed data, and unknown status. |
| M1-09 | Integrate and commit the domain slice. | M1-08 | `BLOCKED` | Lead | Full checks pass; docs reflect any changed assumptions. |

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
| M2-01 | Implement validated currency fixtures and `GET /api/currencies`. | M1-09 | `BLOCKED` | Unassigned | Contract-correct response includes every combination. |
| M2-02 | Implement quote factory and `POST /api/payments`. | M2-01 | `BLOCKED` | Unassigned | Relative expiration; consistent amount/network/address; invalid pair problem response. |
| M2-03 | Implement payment scenario store/simulator. | M1-09 | `BLOCKED` | Unassigned | Exact-state and deterministic progression modes; no UI imports. |
| M2-04 | Implement `GET /api/payments/:reference`. | M2-03 | `BLOCKED` | Unassigned | All eight states, delay, one-shot failure, and persistent failure are triggerable. |
| M2-05 | Implement requote route and 409 behavior. | M2-02, M2-03 | `BLOCKED` | Unassigned | Same reference; complete replacement quote; typed early-requote conflict. |
| M2-06 | Add development request instrumentation for concurrency evidence. | M2-04 | `BLOCKED` | Unassigned | Tests can observe maximum in-flight polls without production UI coupling. |
| M2-07 | Add route/contract integration tests and commit. | M2-01..M2-06 | `BLOCKED` | Lead | Every assessment condition is reachable through HTTP. |

### M2 safe parallelism

After M1 contracts are frozen, `M2-01/M2-02` and `M2-03` can have separate
owners if they do not share files. Route integration remains lead-owned.

## Milestone M3 — Safe quote experience

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M3-01 | Add QueryClient provider, typed API client, and query keys. | M1-09, M2-07 | `BLOCKED` | Lead | Untrusted responses validate; remote state has one owner. |
| M3-02 | Build merchant/order summary and method-selection step. | M3-01 | `BLOCKED` | Unassigned | Locale-formatted fiat and every API-provided method are accessible. |
| M3-03 | Implement quote mutation and stale-response protection. | M3-01, M3-02 | `BLOCKED` | Lead | Obsolete quote responses cannot replace current intent. |
| M3-04 | Build fixed issued-method and guarded-change flow. | M3-03 | `BLOCKED` | Unassigned | Active instructions are not edited in place; warning and confirmation work. |
| M3-05 | Build exact amount, fee breakdown, address/copy, and network safety UI. | M3-03 | `BLOCKED` | Unassigned | One quote supplies all fields; network is explicit; copy is exact and announced. |
| M3-06 | Add local QR generation and QR/address consistency tests. | M3-05 | `BLOCKED` | Unassigned | No remote data disclosure; QR payload matches visible validated instruction. |
| M3-07 | Add responsive and accessibility verification for quote flow. | M3-02..M3-06 | `BLOCKED` | Unassigned | Keyboard/mobile/contrast/status criteria pass. |
| M3-08 | Integrate Figma direction when available without changing domain behavior. | M3-02..M3-07 | `BLOCKED` | Lead + candidate | Visual implementation preserves safety hierarchy and responsive behavior. |
| M3-09 | Commit the safe quote slice. | M3-08 | `BLOCKED` | Lead | Focused checks and visual review pass. |

### M3 safe parallelism

After component props and design tokens are frozen, independent presentational
components and accessibility test-case authoring may run in parallel. Query
integration, quote identity, shared styling tokens, and final composition remain
single-owner.

## Milestone M4 — Countdown, polling, and lifecycle

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M4-01 | Implement absolute countdown and focus/visibility recomputation. | M1-07, M3-09 | `BLOCKED` | Unassigned | Background time jump is immediately correct; no decremented authoritative counter. |
| M4-02 | Implement zero-time status reconciliation. | M4-01, M3-01 | `BLOCKED` | Lead | Exactly one reconciliation; detected payment never becomes locally expired. |
| M4-03 | Implement requote UI, atomic replacement, and 409 recovery. | M2-05, M4-02 | `BLOCKED` | Unassigned | Old instructions deactivate; complete new quote appears; conflict is recoverable. |
| M4-04 | Implement non-overlapping dynamic status polling. | M1-07, M3-01 | `BLOCKED` | Lead | Maximum one request; cleanup on unmount/reference change; terminal stop policy. |
| M4-05 | Implement detected and confirming presentations. | M4-04 | `BLOCKED` | Unassigned | Zero-confirmation meaning, do-not-resend copy, progress, and method lock are correct. |
| M4-06 | Implement paid, underpaid, overpaid, expired, and failed presentations. | M4-04 | `BLOCKED` | Unassigned | Each state answers what happened and what action is safe; no unsupported promise. |
| M4-07 | Add lifecycle component/integration tests. | M4-01..M4-06 | `BLOCKED` | Unassigned | Every status and critical transition is covered. |
| M4-08 | Commit lifecycle slice. | M4-07 | `BLOCKED` | Lead | Full relevant checks pass; lifecycle docs match implementation. |

## Milestone M5 — Adverse transport and evaluator controls

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M5-01 | Implement retry/backoff and last-known-state preservation. | M4-08 | `BLOCKED` | Lead | Transport failure never becomes a business status or clears detected funds. |
| M5-02 | Build connectivity notice and manual retry. | M5-01 | `BLOCKED` | Unassigned | Accessible, non-destructive, and recovers without reload. |
| M5-03 | Build development-only scenario panel. | M2-07, M4-08 | `BLOCKED` | Unassigned | All states, slow response, and network/server errors are selectable through mock HTTP behavior. |
| M5-04 | Verify slow responses never overlap polls. | M5-01, M5-03 | `BLOCKED` | Unassigned | Automated maximum-concurrency assertion passes. |
| M5-05 | Commit adverse-condition/evaluator slice. | M5-01..M5-04 | `BLOCKED` | Lead | README trigger instructions match controls. |

## Milestone M6 — Critical journeys and accessibility

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M6-01 | Happy-path Playwright journey through paid. | M5-05 | `BLOCKED` | Unassigned | Quote → awaiting → detected → confirming → paid; polling stops. |
| M6-02 | Background-expiry and detection/expiry race journeys. | M5-05 | `BLOCKED` | Unassigned | Absolute time and reconciliation invariants pass. |
| M6-03 | Underpayment recovery journey. | M5-05 | `BLOCKED` | Unassigned | Only outstanding amount instructed; same network/address; accepted polling behavior. |
| M6-04 | Slow/failing transport recovery journeys. | M5-05 | `BLOCKED` | Unassigned | Last known state preserved; no overlap; recovery succeeds. |
| M6-05 | Wrong-network and method-commitment journey. | M5-05 | `BLOCKED` | Unassigned | Guarded change only while awaiting; absent after detection; network remains explicit. |
| M6-06 | Automated accessibility scan and keyboard/mobile walkthrough. | M5-05 | `BLOCKED` | Unassigned | No critical violations; manual findings fixed or documented. |
| M6-07 | Commit critical verification slice. | M6-01..M6-06 | `BLOCKED` | Lead | Browser suite passes reliably; evidence summarized. |

## Milestone M7 — Submission documentation and final review

| ID | Task | Depends on | Status | Owner | Acceptance gate / evidence |
| --- | --- | --- | --- | --- | --- |
| M7-01 | Finalize design document and diagrams against implemented behavior. | M6-07 | `BLOCKED` | Lead + candidate | Covers every required design topic and one defended decision. |
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
