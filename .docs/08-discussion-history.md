# Discussion and Decision History

This log summarizes material reasoning developed before coding. It is not a
verbatim conversation transcript. It records decisions, corrections, rejected
directions, and their rationale so the final documentation can remain honest.

## 2026-08-17 - Assessment framing

### Discussion

The assessment was reviewed with primary attention on:

- "What to build";
- documentation, design document, and ADR expectations;
- "How we score it."

### Outcome

These became the main decision lenses. The API contract/lifecycle fixtures were
added as a supporting lens because they constrain what the UI can truthfully
say and which transitions can be implemented without invention.

The follow-up live-extension interview was added as a maintainability
constraint: architecture should be explicit and extensible, but not abstracted
into a generic workflow engine.

## 2026-08-17 - Engineering priority

### Outcome

Work is prioritized in this order:

1. Shopper safety.
2. Lifecycle correctness.
3. Resilience to timing and transport failures.
4. Decimal precision.
5. Clarity and accessibility.
6. Explainability and extension readiness.
7. Visual polish.

This reflects Triple-A's scoring criteria. A reliable simple page is preferred
over a more elaborate page that mishandles an in-flight payment.

## 2026-08-17 - Lifecycle interpretation

### Outcome

The server-returned payment status is authoritative. Client time may derive an
expiration presentation but must not become a competing payment state machine.

Proposed status classification:

- Active: `awaiting_payment`, `detected`, `confirming`, and provisionally
  `underpaid`.
- Terminal: `paid`, `overpaid`, `expired`, and `failed`.

`underpaid` remains an open question. Its `amount_outstanding` and
`crypto_address` fields imply that the shopper can send the missing amount and
that polling should continue, but the brief does not explicitly declare this.

The brief's reference to "six more states" conflicts with the eight total states
actually documented. The plan is to implement the eight specified statuses and
record the discrepancy rather than invent two additional states.

## 2026-08-17 - Countdown and detection race

### Proposed decision

When local time reaches `expires_at` while the last known status is
`awaiting_payment`, perform one immediate server-status reconciliation before
presenting expiry as authoritative.

### Rationale

A blockchain transaction could have been detected just before the local clock
reaches zero but not yet returned by the normal polling cycle. Immediately
showing expiry could violate the requirement that an in-flight payment must
never expire under the shopper.

During reconciliation, payment instructions are not presented as safely active,
but the UI also does not falsely claim definitive expiry when connectivity is
unavailable.

## 2026-08-17 - Remote state and Redux Toolkit

### Proposed decision

TanStack Query should be the sole owner of payment, quote, mutation, retry, and
polling state. Redux Toolkit should not be introduced unless implementation
reveals a concrete, independent global client-state requirement.

### Rejected direction

Mirroring TanStack Query data into Redux was rejected as a preliminary design
direction because it would create two sources of truth for the most safety-
critical state in the application.

This is a proposed architecture decision, not a claim that Redux Toolkit is
generally inappropriate.

## 2026-08-17 - Source-directory correction

### Initial proposal

The first architecture draft showed root-level `app/` beside `src/features/`.
That layout is supported by Next.js but its ownership intent was unclear.

### Candidate correction

The candidate challenged the split and requested clarification.

### Accepted correction

All application source will live under one `src/` boundary:

```text
src/
  app/
  features/
  mocks/
  shared/
```

`src/app` contains framework route entry points and composition. Feature/domain
code remains under `src/features`, while mock-server implementation remains
isolated under `src/mocks`.

This is an example of candidate review improving an agent-generated proposal.

## 2026-08-17 - Framework security baseline

### Discussion

The candidate identified that recent React and Next.js vulnerabilities had been
actively abused and argued that using patched current releases is part of the
checkout's safety posture.

### Accepted decision

As of 2026-08-17, scaffold with:

- Next.js 16.2.11 Active LTS;
- React 19.2.6;
- React DOM 19.2.6.

Use exact direct dependency versions, commit the lockfile, avoid canary and
experimental framework features, review the package-manager vulnerability
audit, and recheck official advisories immediately before submission.

The policy is not to install `@latest` blindly. It is to use the newest stable,
supported, patched release after reviewing official security guidance.

This is another candidate-owned improvement to the original architecture,
which had not pinned a framework version.

## 2026-08-17 - Premature scaffold correction

### Event

The agent initially interpreted "start the work" as authorization to scaffold
the application. The candidate clarified that the intended work was the full
technical design and all pre-coding preparation.

### Correction

The generated starter was stopped and removed from the working repository. The
repository was restored to a documentation-only state before planning
continued.

### Process rule derived

Application scaffolding and feature implementation must not begin until the
pre-implementation design package has been reviewed and explicitly accepted.

This event should be considered when the final README documents agent usage and
discarded work.

## 2026-08-17 - Agent collaboration contract

### Goal

Create a root `AGENTS.md` that allows multiple coding agents to contribute
without duplicating lifecycle logic, editing the same files, or weakening
payment-safety invariants.

### Accepted direction

- Keep one concise root instruction file for repository-wide rules.
- Require the lead agent to assign a bounded objective, acceptance criteria,
  explicit file allowlist, stable interfaces, verification commands, and commit
  permission before delegating.
- Permit only one active owner per file.
- Reserve shared schemas, query keys, configuration, dependency manifests,
  lockfiles, ADRs, and integration commits for the lead agent by default.
- Parallelize independent work only after the relevant interfaces are frozen.
- Keep scaffolding, contract ownership, query/cache design, integration, and
  release verification sequential or single-owner.
- Require structured handoffs containing changed files, invariants addressed,
  executed checks, assumptions, risks, and requested integration changes.
- Preserve genuine agent mistakes and rejected work for the assessment; never
  manufacture examples.

### Rationale

Parallelism is useful only when it reduces critical-path time without creating
merge or semantic conflicts. For this checkout, duplicated interpretations of
money, lifecycle status, polling, or expiration are more costly than delayed
implementation. Explicit ownership and frozen contracts provide safer
parallelism than broad feature assignments.

## 2026-08-17 - Payment-method commitment and QR semantics

### Initial question

The initial invariant locked currency/network selection only after funds were
detected. The candidate questioned whether waiting for detection left an unsafe
period after the shopper began an external transfer.

### Contract clarification

The supplied API has no QR-read, address-copy, wallet-interaction, or
transaction-broadcast event. A QR code only transports payment instructions.
The first authoritative evidence of a blockchain transfer is the polled
`detected` status, which may still report zero confirmations.

### Accepted design direction

- The shopper selects currency/network before quote creation.
- Once a quote is issued, currency/network become fixed quote attributes rather
  than live selectors beside active instructions.
- While status remains `awaiting_payment`, the shopper may use a secondary
  guarded "Change payment method" action.
- The action must warn that it is safe only if no funds were sent and require
  explicit confirmation.
- Old instructions are hidden or deactivated before selection resumes, and the
  complete replacement quote is committed atomically.
- At `detected` or later, payment-method changing is removed entirely.
- Copying the address or scanning the QR code does not lock the method or alter
  lifecycle state.

### Rationale

The design cannot know exactly when an external transfer begins, so it should
not pretend that a UI gesture is a blockchain signal. Fixed issued instructions
plus a deliberate pre-detection escape path reduce accidental mismatch while
still satisfying the requirement that a shopper can obtain a new quote for a
different currency/network.

## 2026-08-17 - Foundation approval and package manager

### Candidate decision

The candidate accepted the proposed foundation and selected pnpm as the package
manager, primarily for installation speed.

### Recorded outcome

- The four architecture candidates and supporting lifecycle decisions are now
  accepted inputs to implementation.
- The non-terminal treatment of `underpaid` remains explicitly provisional
  because the supplied contract does not define its finality.
- pnpm is accepted. Beyond speed, the repository rationale is deterministic
  installation from a committed lockfile, efficient content-addressable
  storage, and stricter dependency boundaries.
- pnpm 11.22.0 was verified against the package registry and will be pinned in
  `package.json`; the generated `pnpm-lock.yaml` will be committed.
- M0-02 remains open until Node pinning, decimal/QR library choices, and the
  testing tool set are accepted.

## 2026-08-17 - Test runner versus application bundler

### Question

The candidate asked whether choosing Vitest and React Testing Library would
require the Next.js application itself to run on Vite.

### Accepted clarification

No. Vitest uses Vite internally to transform test modules, but it is a separate
test process. The application continues to use the standard Next.js commands
and Turbopack for development and production builds.

- Vitest covers pure domain logic, hooks, and client components under Node or
  jsdom.
- React Testing Library covers observable DOM behavior.
- Playwright covers the actual Next.js application, its route handlers, and
  browser-level journeys.
- Async Server Components are tested through the browser where unit tooling is
  incomplete.
- MSW is omitted initially because route handlers already provide the committed
  mock HTTP boundary.

The candidate accepted this separation and the remaining M0-02 tool bundle.

## 2026-08-17 - Pre-scaffold security recheck

### Evidence

The stable npm registry tags were queried on 2026-08-17. They resolved to
Next.js 16.3.1 and React/React DOM 19.2.8. Next.js 16.3.1 was published on
2026-08-13, after the July 2026 security release. Official Next.js installation
guidance, the July security release, the React Server Components advisory, and
the Node.js release table were reviewed.

### Outcome

The earlier Next.js 16.2.11 and React 19.2.6 plan is superseded. Scaffold with
exact pins for Next.js 16.3.1, React 19.2.8, React DOM 19.2.8, Node.js 24.18.0
LTS, and pnpm 11.22.0. Avoid canary/preview tags, run the dependency audit after
installation, and repeat the advisory check before submission.

## 2026-08-17 - Initial AGENTS.md approval

### Candidate decision

The candidate approved the initial root `AGENTS.md` and explicitly clarified
that approval does not freeze the file as its final version.

### Accepted maintenance policy

`AGENTS.md` is a living project contract. It must evolve when scaffolding adds
real commands, implementation reveals better module or ownership boundaries,
or accepted decisions change. Material revisions must remain traceable in this
discussion history and must not erase the rules under which earlier agent work
was performed.

## 2026-08-17 - M0-06 repository scaffold

### Implementation

Git was initialized on `main`. Next.js 16.3.1 was generated in an isolated
temporary directory and inspected before only the intended scaffold files were
copied into the canonical project. The generated Next.js `AGENTS.md` did not
replace the candidate-approved contract; its version-specific Next.js rule
block was merged into the existing living document.

The repository now contains the standard App Router under `src/app`, Tailwind
CSS, ESLint, exact direct dependency versions, `pnpm-lock.yaml`, pnpm 11.22.0,
and a Node.js 24.18.0 project pin. No checkout feature code was introduced.

### Verification

- The candidate's existing VS Code-run Next.js 16.3.1/Turbopack development
  server for this repository returned HTTP 200 with the generated page. The
  agent did not stop or replace the candidate-owned process.
- `pnpm lint` passed.
- `pnpm build` passed, including Next.js TypeScript analysis and static page
  generation.
- The lockfile contains exact importer specifiers with no direct caret or tilde
  ranges.

The host currently provides Node.js 24.16.0, so pnpm emits an engine warning
against the repository's 24.18.0 LTS pin. The scaffold verified successfully on
the same Node 24 major; final verification should run on the exact pinned patch.

## 2026-08-17 - Automatic task advancement

### Candidate direction

The candidate asked the lead agent to stop waiting for a repeated "start the
next task" instruction after each accepted completion.

### Accepted operating rule

When a task's acceptance gate is proven and its tracker entry becomes `DONE`,
the lead immediately assigns itself the next `READY` task. The lead pauses only
when the next task requires a candidate decision, external action, destructive
operation, materially expanded scope, or an explicit pause. This autonomy does
not relax task dependencies, evidence requirements, or authorization limits.

## 2026-08-17 - M0-07 quality toolchain

### Implementation

The foundation now uses Prettier with Tailwind CSS v4 class sorting,
eslint-config-prettier, strict TypeScript options, Vitest with jsdom and React
Testing Library, and Playwright with a Chromium project. Exact direct versions
are locked. Playwright reuses the candidate's server locally and starts a
production build/server when no local server is available.

### Feedback-driven corrections

The first strict typecheck rejected `workers: undefined` in the Playwright
configuration under `exactOptionalPropertyTypes`. The configuration now omits
that property outside CI. The first passing Vitest run then reported that
`vite-tsconfig-paths` was redundant because the installed Vite supports native
`resolve.tsconfigPaths`; the dependency was removed and native resolution was
enabled. Both corrections reduced ambiguity rather than weakening checks.

### Verification

- `pnpm check` passed formatting, ESLint, strict TypeScript, and the Vitest
  component smoke test.
- `pnpm test:e2e` passed the Chromium smoke test against the candidate's VS
  Code-run Next.js server.
- `pnpm build` passed the Next.js 16.3.1/Turbopack production build.

## 2026-08-17 - M0-08 dependency audit

`pnpm audit --json` reviewed the locked graph of 554 total dependencies and
reported zero advisories at informational, low, moderate, high, and critical
severity. No forced or speculative upgrade was applied. The result is a
point-in-time check and will be repeated before submission as required by the
security policy.

## 2026-08-17 - M0-09 README foundation

The generic Create Next App README was replaced with a submission-oriented
skeleton containing the real install/run/quality commands, architecture and
design-document links, current security evidence, deferred optional work, and
factual agent collaboration. Scenario-control instructions remain explicitly
marked as pending until M2/M5 implements and verifies those controls; the README
does not pretend unfinished evaluator behavior exists.

## 2026-08-17 - M0-10 initial foundation commit

The planning documents predated Git initialization and already referenced the
accepted scaffold, commands, and evidence. They were therefore committed with
the application foundation as one coherent initial repository state rather than
split into artificial intermediate commits that would not verify independently.
Root commit `fb75de0` is `chore: establish verified project foundation`.
Subsequent domain and feature work will use focused incremental commits.

## 2026-08-17 - Pause before M1

After the foundation was completed, the automatic advancement rule moved
M1-01 into progress. The candidate clarified that M1 work should not begin yet.
No M1 code or dependency changes had been made. M1-01 was returned to `READY`
and left unassigned; the repository remains at the completed foundation
boundary until the candidate resumes implementation.
