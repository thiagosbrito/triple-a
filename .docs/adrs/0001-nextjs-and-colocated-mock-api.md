# ADR-0001: Next.js and a colocated mock API

Status: Accepted
Date: 2026-08-17
Implementation review: 2026-08-18

## Context

The assessment is frontend-focused but requires committed HTTP fixtures,
adverse transport behavior, and a solution that can be demonstrated with a
small setup surface. Triple-A uses Next.js and Rust, but implementing a Rust
service would spend the exercise budget outside the scoring focus.

## Options considered

1. Next.js App Router with route handlers.
2. React/Vite with MSW.
3. React frontend with a separate Express mock server.

## Decision

Use Next.js 16.3.1, React/React DOM 19.2.8, the App Router, and route handlers.
Keep all application source under `src/`. Shopper components consume only the
validated HTTP client; they never import fixtures or scenario state.

The final security review retains those framework pins and raises the exact
Node LTS runtime from 24.18.0 to 24.19.0. Node 24.18.0 predates the July 29
security release; 24.19.0 is the current patched Node 24 LTS release.

## Consequences

- The solution aligns with the target frontend stack and has one development
  command.
- Real serialization, delay, error, and problem-response boundaries remain
  visible.
- The repository carries more framework surface than a Vite page.
- The in-memory scenario store is development-only and unsuitable for a
  multi-instance production service.
- Exact framework versions, the lockfile, and security evidence are submission
  artifacts.

## Verification and review trigger

The implementation confirmed the intended boundary:

- shopper components and hooks import only feature contracts/clients; mock
  imports are confined to route handlers and `src/mocks`;
- all eight states, delay, HTTP failure, stream disconnection, requote, and
  request metrics are exercised through HTTP;
- unique process-local references were required after parallel browser testing
  exposed that one fixed reference let sessions overwrite each other;
- development controls are omitted from the production page, while the route
  handlers themselves return not-found outside development where applicable;
- the final M6 gate passed the production build, 22 Chromium journeys, and an
  audit with zero findings across 560 dependencies.

Observed trade-offs are real: route handlers kept setup and serialization
simple, but the process-global store is deliberately not production-safe, and
the simulated errored stream can emit a Next.js pipe diagnostic. Revisit this
ADR when replacing the mock with the Rust service or deploying across multiple
instances. Repeat the official framework advisory check immediately before
submission.
