# ADR-0003: Reconcile status before declaring local expiry

Status: Accepted
Date: 2026-08-17

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

Use fake-time tests for absolute expiry and Playwright coverage for background
resume and zero-time reconciliation. Revisit if the backend provides a stronger
atomic expiry/status contract.
