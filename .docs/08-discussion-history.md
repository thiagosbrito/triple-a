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

## 2026-08-18 - M1 resumed and currency contract implemented

The candidate explicitly resumed implementation with M1-01. The assessment PDF
was rechecked before freezing the boundary shape because the planning summary
did not preserve every `GET /api/currencies` field name.

The contract validates the published currency codes, network identifiers,
asset decimal scales, positive integer confirmation metadata, and plain decimal
string fees. It rejects unknown fields, duplicate currency/network identifiers,
and malformed values. Currency-to-network compatibility is intentionally read
from the validated response instead of being duplicated as a second client-side
matrix. Contract files are grouped by protocol concern under `api/contracts/`
so later payment, status, and problem schemas can remain cohesive.

### PDF model validation

After the candidate requested direct validation, the currency response, payment
request/response, and all eight status fixtures on PDF pages 3-5 were exercised
against the runtime schemas. The review found one unsupported restriction: the
first decimal regex rejected leading-zero representations even though the brief
only requires decimal strings. That restriction was removed so boundary values
are preserved exactly; numeric values, signs, and exponent notation remain
invalid. The full contract suite and repository quality checks passed after the
correction.

### Explicit payment-status union

The candidate requested that payment status be represented as a closed union
rather than a general string. The implementation already used one readonly
status tuple, a Zod enum, and literal discriminants, so unsupported transport
values were rejected. The exported TypeScript alias was changed to the more
explicit `(typeof PAYMENT_STATUSES)[number]` form requested by the candidate,
and a direct runtime test now proves that parsing an unsupported status throws.
The creation response remains intentionally narrower: that endpoint can only
return `awaiting_payment` initially.

### Contract-pattern review before M1-04

The candidate requested a broader type and Zod review before more contracts
were added. The review found that generic protocol validators lived in the
currency endpoint module, creating avoidable cross-endpoint coupling. They were
moved to `contracts/primitives.ts`; currency/network vocabularies moved to
`payment-method.ts`; endpoint schemas now depend inward on those modules.

The pass also replaced deprecated Zod 3-style URL validation with the Zod 4
top-level API, centralized positive integers and ISO timestamps, removed
repeated raw status/currency literals, and branded validated money plus
safety-sensitive identifiers. `AGENTS.md` now defines the contract conventions
so later agent work does not recreate parallel interfaces, coercing validators,
or endpoint-to-endpoint dependencies.

## 2026-08-18 - M1-04 problem and protocol error taxonomy

The documented requote conflict is modeled as a known
`application/problem+json` response and wrapped as `ApiProblemError` for query
consumers. Unknown statuses and malformed response bodies are validation
failures wrapped as `ProtocolError`. The lifecycle value `failed` stays valid
business data and is not included in either error class.

The RFC `detail` field is deliberately retained as opaque shopper/developer
context rather than parsed for the quote timestamp. The later typed API client
will validate the response media type and ensure the actual HTTP status agrees
with the problem body's advisory status.

The candidate noticed that the supplied problem-type URI does not resolve to a
documentation page. A direct HEAD request on 2026-08-18 confirmed HTTP 404. The
literal remains in the schema because it is the fixture's wire discriminator,
but the implementation treats it as opaque and will not dereference or present
it as a support link.

A follow-up search found live official developer payment-request documentation,
an invoicing-tool customer article, and a supported-networks article, but none
accurately explains quote expiry for this hosted checkout. The candidate's UX
goal is retained through inline “how to pay safely” guidance. An external help
link remains conditional on receiving an authoritative flow-specific page from
Triple-A rather than linking adjacent documentation that may mislead shoppers.

## 2026-08-18 - M1-05 exhaustive lifecycle presentation

The lifecycle domain now has one exhaustive status-policy record covering
terminality, polling, quote expiry, payment-method commitment, and whether the
shopper can act, must wait, is complete, or needs support. A separate exhaustive
presentation record provides factual headings, summaries, actions, and safety
instructions without importing React or transport schemas.

The presentation model explicitly prevents resending after detection, instructs
an underpaid shopper to send only the outstanding amount, makes expired
instructions unusable, avoids refund promises for overpayment, and avoids a
blind retry after settlement failure. Four inline education steps cover the
irreversible transfer flow independently of external documentation.

## 2026-08-18 - Open payment-method catalog correction

The candidate identified that hard-coding the currency and network examples as
frontend enums would reject a valid catalog expansion deployed by the backend.
The first contract implementation had incorrectly treated example reference
data like the deliberately closed payment-status state machine.

Currency codes and network identifiers are now distinct branded strings whose
shape is validated at the HTTP boundary. The currency endpoint owns the set of
available values, asset decimal scales, and valid currency/network pairings. A
pure domain function checks a selection against the latest validated catalog;
the payment route will independently enforce the same compatibility rule.

Payment statuses remain a closed enum because each value requires known,
exhaustive lifecycle and safety behavior. This establishes the reusable rule:
closed behavioral vocabularies use enums, while server-driven reference data
uses open validated identifiers plus runtime membership checks.

## 2026-08-18 - M1-06 exact money domain

The accepted decimal ADR is now implemented with exact `big.js` 7.0.1 and its
7.0.0 TypeScript definitions. The domain uses an isolated strict constructor so
primitive-number input is rejected without mutating configuration for other
consumers. Public operations accept only branded validated decimal strings and
return validated plain decimal strings.

Scale validation uses the selected asset's validated catalog metadata rather
than a currency-code switch, preserving forward compatibility with new assets.
Transfer instructions preserve the server's exact representation, including
deliberate trailing zeroes. Calculated display values can remove insignificant
zeroes or enforce a minimum display scale, but reject excess precision rather
than round it. Exact comparison, addition, non-negative subtraction, six-,
eight-, and eighteen-decimal boundaries, and non-exponent formatting are
covered by focused tests.

## 2026-08-18 - M1-07 expiration and polling policy

Pure deadline functions calculate remaining milliseconds from the validated
absolute `expires_at` value and the current epoch time, so background timer
throttling cannot accumulate countdown drift. An awaiting payment at local zero
first enters a one-reconciliation state and only becomes locally expired if it
remains awaiting afterward. Detection, confirmation, and provisional
underpayment freeze quote expiry; authoritative terminal states keep their
existing lifecycle classifications.

Polling uses explicit assessment constants: 3 seconds while awaiting or
underpaid, 1.5 seconds after detection, and 2 seconds while confirming. The
confirming interval is deliberately not derived from catalog timing because the
issued quote does not contain that metadata. Transport retries use deterministic
1-, 2-, and 4-second delays and then stop automatic retrying without changing
the payment lifecycle state. TanStack Query integration will later adapt these
pure policies while preserving its non-overlapping request lifecycle.

## 2026-08-18 - M1-08 complete assessment-fixture audit

The seven-page assessment PDF was re-extracted and pages 2 through 6 were
rendered for a direct visual source-to-contract comparison. The six documented
currency/network combinations, payment creation request and response, all eight
status responses, and the quote-not-expired problem match the implemented
runtime schemas.

The audit found one omitted boundary: requote has a distinct request containing
only `currency` and `network`. Its successful 201 body is explicitly the same
shape as payment creation, with the same reference, a new quote, and status reset
to awaiting. A strict requote request schema and shared success-response schema
were added with exact and malformed fixture tests. The complete contract suite
then passed 82 tests, and the integrated repository passed 157 tests plus the
production Next.js build.

## 2026-08-18 - M1 domain milestone committed

The complete contract and pure-domain slice passed formatting, ESLint, strict
TypeScript, 157 Vitest tests, the production Next.js build, and a dependency
audit with no advisories. It was committed locally as `d5f978c` (`feat:
establish checkout contracts and domain core`). No remote push was performed.

The candidate paused work before M2. M2-01 remains the next ready implementation
boundary—the validated currency fixture and `GET /api/currencies` route—but no
mock API or shopper-facing feature work has started.

## 2026-08-18 - M2 resumed

The candidate explicitly resumed work after the pause before M2. M2-01 moved
into progress with the lead owning the validated currency fixture, the
`GET /api/currencies` route handler, focused tests, and execution evidence.

## 2026-08-18 - M2-01 validated currency endpoint

The deterministic mock catalog contains every documented currency/network
combination and validates itself through the production-facing Zod response
schema when the fixture module loads. The App Router handler uses the native
Web `Response.json` API documented by the installed Next.js 16.3.1 runtime; no
framework wrapper, cache override, or new dependency was needed.

Focused fixture and route tests, the full repository gate, the production
build, and a temporary live-server request passed. The live endpoint returned
HTTP 200 with `application/json` and all six combinations. The temporary server
was then stopped. The candidate reviewed and approved the focused M2-01 commit
strategy before its creation; M2-02 follows after that local-only commit.

## 2026-08-18 - M2-02 three-minute quote lifetime

The candidate selected an exact three-minute mock quote lifetime to keep manual
testing practical. The later development scenario panel will provide an
immediate expiry trigger alongside status controls, matching the previously
prompted design direction. That control will alter mock state rather than
shortening or bypassing the production countdown algorithm.

The remaining accepted M2-02 policy uses deterministic per-method quote
profiles, catalog-owned network metadata, exact decimal addition for total due,
and a generic HTTP 400 `application/problem+json` response with `about:blank`
for malformed requests or unsupported currency/network pairs.

The implementation preserves the exact documented USDT/Tron quote and uses
distinct, clearly synthetic profiles for the other catalog methods. Focused
tests, all 177 repository tests, strict TypeScript, linting, formatting, the
production build, and live HTTP success/error requests passed. The live quote
expired exactly three minutes after creation. The host still reports Node
24.16.0 against the repository's declared minimum of 24.18.0; no verification
failure resulted. Per the candidate's process, no commit will be created until
the focused M2-02 commit strategy is reviewed and approved.

The candidate approved the proposed focused commit by directing work to
continue. M2-02 can therefore close without mixing the scenario simulator or
development-panel behavior into the quote-creation slice.

## 2026-08-18 - M2-03 confirmation-fixture inconsistency

M2-03 began after M2-02 was committed locally as `c4be2d9`. During simulator
design, the source fixtures exposed an inconsistency: the USDT/Tron quote
requires one confirmation, but the `confirming` example using the same payment
reference reports two of three confirmations. Combining those values in one
live scenario would make the issued quote and later status disagree.

The simulator therefore derives confirmation counts from the stored quote. A
one-confirmation method progresses directly from `detected` to `paid`, while a
multi-confirmation method includes `confirming`. The literal PDF examples stay
preserved in their independent contract tests. This limitation and treatment
are recorded explicitly rather than presented as production API behavior.

The implemented store defaults new payments to exact `awaiting_payment`, also
supports a deterministic happy-path progression, and models response delay,
one-shot failure, and persistent failure as orthogonal transport instructions.
Failures do not consume a progression step. Status snapshots are generated
from the registered quote and remain stable while pinned. Payment creation now
registers the validated response in the server-only store; no shopper module
imports mock state.

The 42 focused tests, all 213 repository tests, formatting, ESLint, strict
TypeScript, and the production build passed. The existing Node 24.16.0 versus
declared 24.18.0 engine warning remains. M2-03 awaits the candidate's required
pre-commit strategy review before M2-04 begins.

The candidate then authorized autonomous completion of the full M2 milestone,
with intervention required only for a genuine blocker. This approves the
reported focused M2-03 commit strategy and the lead may continue through the
remaining M2 tasks while still announcing commit boundaries and avoiding any
remote push.

## 2026-08-18 - M2-04 controllable status HTTP route

M2-04 added the dynamic payment-status handler plus the development-only
scenario configuration endpoint required by the future evaluator panel. Route
parameters, control bodies, status bodies, and generic 404/500 problems are
validated. Exact states, delay, one-shot failure, persistent failure, and the
network-disconnect instruction all pass through the same payment-status HTTP
endpoint the shopper client will use.

Live Next.js verification proved that the payment-creation, development-control,
and status route bundles share the process-global store. A configured 250 ms
HTTP failure returned in approximately 261 ms and the next request recovered to
the unchanged detected state in approximately 259 ms. The disconnect scenario
gave curl an empty reply with exit code 52 while Next logged the intentionally
errored response stream. The temporary server was stopped afterward.

The full repository gate passed with 20 test files and 235 tests, and the
production build contains the dynamic status and development-control routes.
The development endpoint returns 404 when `NODE_ENV` is production. The host
Node engine warning remains unchanged.

## 2026-08-18 - M2-05 guarded requote route

The requote route accepts a replacement only when the authoritative mock state
is `expired`, or when it remains `awaiting_payment` at or after the absolute
deadline. States proving funds arrived, settled states, and `failed` reject a
direct requote even after wall-clock expiry, preventing a replacement quote
from encouraging an unsafe second payment. Early awaiting requests preserve the
documented quote-not-expired problem; other lifecycle conflicts use a truthful
generic 409.

A successful requote keeps the payment reference and order context, replaces
the complete quote atomically, resets status and scenario controls to
`awaiting_payment`, and starts a fresh three-minute deadline. Focused tests,
all 243 repository tests, the production build, and live Next.js verification
passed. Live HTTP returned the documented 409 before expiry, then returned a
complete 201 USDC/Polygon replacement after authoritative expiry was triggered
through the development endpoint. The temporary server was stopped.

## 2026-08-18 - M2-06 polling-concurrency instrumentation

The status route now records current and maximum in-flight request counts plus
total starts/completions for each payment reference in non-production runtimes.
The development metrics endpoint reads and resets this evidence without any
shopper-UI dependency. Completion handles are idempotent, references remain
isolated, and resetting metrics does not corrupt an already-issued completion
handle.

The first live overlap attempt included cold route compilation and reported a
maximum of one, so it was rejected as concurrency evidence. After warming the
route and resetting metrics, two deliberately simultaneous one-second requests
both completed in approximately 1.01 seconds and reported maximum in flight of
two with two starts and two completions. This proves the instrumentation can
detect overlap when it exists. All 253 repository tests and the production
build passed; the development metrics route returns 404 in production.

## 2026-08-18 - M2-07 real-HTTP milestone audit

The final M2 Playwright suite exercises the real Next.js HTTP boundary without
mutating the scenario store directly. It verifies the six-method catalog,
payment creation, every lifecycle state, multi-confirmation progression,
delayed overlap metrics, one-shot recovery, persistent HTTP failure, a real
empty-reply disconnect, the documented early-requote conflict, and atomic
requote after authoritative expiry.

Because scenario controls intentionally return 404 in production, Playwright
now starts `next dev`; `pnpm build` remains a separate required gate. The first
browser run exposed Next's development-origin warning for the configured
`127.0.0.1` base URL. The installed Next.js documentation was checked and the
narrow `allowedDevOrigins: ["127.0.0.1"]` setting removed that warning without
opening additional origins.

The final M2 gate passed formatting, ESLint, strict TypeScript, 23 Vitest files
with 253 tests, four Playwright tests, the production build, diff validation,
and a dependency audit with zero advisories across 556 dependencies. The
intentional disconnect still produces an expected server-side pipe-error log
while the client observes a network failure. Exact README commands now cover
all controls, request metrics, and requote behavior.

## 2026-08-18 - M3 start and Figma availability

The candidate started M3 and confirmed that the Figma Make prototype is visual
reference material, not a replacement for the planned task order or the
accepted payment-safety behavior. The Figma design-to-code skill is installed,
but its MCP read tools are not exposed in the current VS Code session. Visual
extraction therefore remains scheduled for M3-08 and does not block the query,
transport, or base shopper-flow work. A later reload or connection refresh may
make the read tools available.

M3-01 uses exact `@tanstack/react-query` 5.101.4, the latest stable registry
release verified on 2026-08-18. The implementation follows the current
TanStack App Router guidance: a fresh query client during server rendering and
one stable query client in the browser. No global retry or polling defaults are
introduced before the operation-specific policies in M4/M5.

The typed API client validates outbound identifiers and request bodies, reads
all response bodies as untrusted data, validates success and problem payloads,
checks HTTP/body status agreement, and forwards cancellation signals. Valid
server problems, protocol violations, and transport failures remain distinct;
in particular, a fetch or response-stream failure is never converted into a
payment business state. Central payment query keys include the validated
payment reference so stale data cannot cross payment identities.

The M3-01 gate passed 34 focused tests, all 267 repository tests, formatting,
ESLint, strict TypeScript, the production build, and a dependency audit with
zero advisories across 558 dependencies. The existing host Node 24.16.0 versus
the repository's 24.18.0 minimum warning remains. No commit was created before
presenting the candidate with the focused M3 commit strategy.
