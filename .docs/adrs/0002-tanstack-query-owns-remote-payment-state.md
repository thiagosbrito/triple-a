# ADR-0002: TanStack Query owns remote payment state

Status: Accepted
Date: 2026-08-17
Implementation review: 2026-08-18

## Context

Quotes, mutations, polling, cancellation, retries, stale-response protection,
and terminal stopping are server-state concerns. Mirroring them into Redux
would create synchronization rules between two stores.

## Options considered

1. TanStack Query for remote state and local React state for ephemeral UI.
2. Mirror TanStack Query data into Redux Toolkit.
3. Use Redux Toolkit thunks/listeners for server interaction.
4. Build custom effects and reducers.

## Decision

Use TanStack Query as the sole owner of remote payment state. Use local React
state for draft selection and transient presentation. Add Redux Toolkit only if
implementation reveals a concrete, independently changing global client-state
requirement.

## Consequences

- Query keys, polling policy, retries, and cache transitions are important
  behavior and require tests.
- Lifecycle presentation is derived through exhaustive pure functions.
- There is no synchronization layer between Query and Redux.
- Omitting a familiar requested tool must be explained as intentional scope and
  safety judgment.

## Verification and review trigger

The implementation has one reference-scoped query-key factory for created
payments, status updates, requote, and development diagnostics. Draft method
selection, copy feedback, and dock visibility remain local component state.
Redux is absent from both source and dependencies, and no quote/status value is
mirrored into another store.

The observed cost is concentrated complexity in `useCreatePayment`,
`useDeadlineReconciliation`, and `useRequotePayment`: cancellation, stale-intent
guards, polling, retry, deadline reconciliation, and 409 refresh behavior must
be tested as stateful query behavior. That cost was preferable to a second
remote-state owner and is covered by focused hook tests plus the browser race
and recovery journeys.

Revisit only when a real cross-feature client-state requirement cannot be
handled safely by composition, URL state, or local state—not merely because the
state feels complex.
