# ADR-0001: Next.js and a colocated mock API

Status: Accepted
Date: 2026-08-17

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

Exercise every required scenario through HTTP, verify that production-facing
components have no mock imports, run a dependency audit after installation, and
repeat the official advisory check before submission.
