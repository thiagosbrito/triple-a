# ADR-0003: Reconcile status before declaring local expiry

Status: Accepted
Date: 2026-08-17
Implementation review: 2026-08-18

## Context

The countdown and blockchain polling are independent asynchronous processes.
A payment can reach the backend just before the local clock reaches zero, and
background tabs can delay both timers.

## Options considered

1. Show expired immediately at local zero.
2. Wait for the next scheduled poll.
3. Trigger one immediate status reconciliation and show a neutral interim
   state.

## Decision

Choose option 3. Derive remaining time from `expires_at - now`; timers only
request repainting. At local zero, deactivate instructions and reconcile status
once before presenting authoritative expiry.

## Consequences

- A detected payment cannot be incorrectly expired by a client-side race.
- Expiry presentation may wait for one request.
- A failed reconciliation needs a truthful degraded-connectivity state rather
  than a fabricated payment status.
- The mock and test suite must reproduce the detection/expiry race.

## Verification and review trigger

The implemented issued flow removes amount, address, QR, copy, and method-change
actions immediately at zero, then refetches the existing active reference-
scoped status query without cancelling an in-flight request. `awaiting_payment`
permits local expiry; any status proving funds arrived wins; an unavailable
refresh stays indeterminate instead of fabricating expiry.

The additional transitional phase and query/countdown coordination are the
observed costs. Fake-time hook tests cover jumps, cleanup, one-attempt behavior,
and transport failure. Two Playwright journeys change absolute browser time
without running accumulated timers and prove both authoritative expiry and the
case where detected funds win without an expiry flash.

Revisit if the backend provides a stronger atomic expiry/status contract or an
authoritative server-time policy.
