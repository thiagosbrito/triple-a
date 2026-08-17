# Payment Lifecycle Semantics

Status: Draft for review
Scope: Pre-implementation analysis only

## Authoritative state

The payment status returned by `GET /api/payments/:reference` is the
authoritative lifecycle state. The client may derive presentation modes from
that status, but it must not maintain a second independent payment state machine
that can contradict the server.

The client has no authoritative signal for QR scanning, address copying, wallet
interaction, or transaction broadcast. The first contractually defined evidence
that a transfer exists is the backend returning `detected`.

Quote expiration is a time-based client observation, not a replacement for the
server payment status. This distinction matters when detection and expiration
happen close together.

## Documented statuses

The brief provides eight statuses:

| Status | Shopper meaning | Proposed action class | Proposed polling behavior | Quote expiration behavior |
| --- | --- | --- | --- | --- |
| `awaiting_payment` | No transfer has been detected. | Shopper must send funds. | Continue. | Active. |
| `detected` | Transfer detected with zero confirmations. | Wait; do not send again. | Continue. | Frozen/irrelevant. |
| `confirming` | Transfer is accumulating confirmations. | Wait; do not send again. | Continue. | Frozen/irrelevant. |
| `paid` | Required payment settled successfully. | No action. | Stop. | Irrelevant. |
| `underpaid` | Some funds arrived, but less than required. | Send only the outstanding amount. | **Open question; proposed: continue.** | Frozen/irrelevant. |
| `overpaid` | More than the requested amount settled. | Do not send more; retain reference/contact support. | Proposed: stop. | Irrelevant. |
| `expired` | The current quote can no longer be used. | Request a new quote. | Stop until requote. | Expired. |
| `failed` | Settlement was rejected. | Do not retry blindly; contact support. | Proposed: stop. | Irrelevant. |

The brief says there are "six more states" after naming four, but its API
fixtures document only four additional states, for eight total. The solution
should implement the eight contractually defined states and record the mismatch
as a brief ambiguity rather than inventing two states.

## Proposed transition model

```mermaid
stateDiagram-v2
    [*] --> awaiting_payment: quote created
    awaiting_payment --> awaiting_payment: no funds detected
    awaiting_payment --> detected: transaction observed
    awaiting_payment --> expired: server reports expiry
    awaiting_payment --> expiry_reconciliation: local clock reaches zero
    expiry_reconciliation --> detected: status refresh finds transaction
    expiry_reconciliation --> confirming: status refresh finds confirmations
    expiry_reconciliation --> expired: status refresh confirms no usable quote
    expired --> awaiting_payment: requote succeeds
    detected --> confirming: first confirmation
    detected --> underpaid: received amount is short
    detected --> paid: sufficient settlement completes
    detected --> overpaid: excess settlement completes
    detected --> failed: settlement rejected
    confirming --> confirming: more confirmations required
    confirming --> paid: required confirmations reached
    confirming --> overpaid: excess settlement completes
    confirming --> failed: settlement rejected
    underpaid --> detected: additional transfer observed
    underpaid --> confirming: total received is now sufficient
    underpaid --> paid: additional amount settles
```

Transitions not demonstrated by the supplied contract remain mock/testing
assumptions and must not be described as production API guarantees.

## Expiration reconciliation

### Problem

The local countdown can reach zero just after a blockchain transaction was
detected but before the next poll returns. Immediately replacing the payment
instructions with an expired screen could violate the explicit rule that a
payment already on its way must never expire under the shopper.

### Proposed policy

When the countdown reaches zero while the last authoritative state is
`awaiting_payment`:

1. Stop presenting the quote as safely payable.
2. Trigger one immediate payment-status refresh.
3. Show a brief neutral reconciliation state rather than a terminal expiry.
4. If the server reports `detected`, `confirming`, `underpaid`, `paid`, or
   `overpaid`, present that state and freeze expiry.
5. If the server reports `expired`, present expiry and enable requote.
6. If it still reports `awaiting_payment`, the client may present local expiry
   and enable requote, subject to the API's requote response.
7. If the refresh fails, show a connectivity warning and do not claim that the
   payment expired as an authoritative fact.

This is a proposed design decision and a candidate for the design document's
"one thing I would defend" section.

## Requote semantics

Explicit contract behavior:

- `POST /api/payments/:reference/requote` returns the same payment reference.
- It returns a new quote.
- Status returns to `awaiting_payment`.
- Calling it before expiry may return HTTP 409 with
  `application/problem+json`.

Required client consequences:

- Replace all quote-dependent fields atomically.
- Reset the countdown from the new `expires_at` value.
- Do not append a second payment record.
- Present the 409 detail as a recoverable quote conflict, then refresh the
  current authoritative payment rather than reporting a generic failure.

## Payment-method commitment

The assessment requires a new quote when the shopper changes currency or
network, but leaving editable selectors beside active payment instructions can
create a dangerous mismatch. A shopper may begin an external transfer before
the backend detects it.

Proposed interaction:

1. The shopper chooses currency and network.
2. Quote creation succeeds.
3. The issued currency/network are rendered as fixed quote attributes, not
   ordinary live selectors.
4. While the authoritative status remains `awaiting_payment`, a secondary
   "Change payment method" action is available.
5. That action warns that it is safe only if no funds have been sent and
   requires explicit confirmation.
6. On confirmation, the old instructions are hidden or deactivated before
   method selection resumes and a new quote is requested.
7. At `detected` or any later state proving funds arrived, the change action is
   removed completely.

Copying the address and scanning the QR code do not change lifecycle state and
must not lock the method. Both actions only expose or transport instructions;
the provided API has no QR-read or transaction-broadcast event.

## Transport state versus payment state

Transport failures are orthogonal to payment status.

Examples:

- A 500 response does not mean `failed`.
- An offline browser does not mean `expired`.
- A slow poll does not mean the transfer was not detected.
- A quote-creation failure must not erase the last internally consistent quote
  unless it is no longer safe to use.

The interface should preserve the last known authoritative payment status,
communicate degraded connectivity, and retry according to a bounded policy.

## Polling invariants

1. At most one status request for a payment reference is in flight.
2. The next scheduled poll begins only after the current request settles.
3. Polling stops when the state is terminal.
4. Polling stops when the component unmounts or the active reference changes.
5. Abort/cancellation is not shown as a shopper-facing error.
6. A slower response for an obsolete reference or selection cannot overwrite
   the current payment.
7. Retry timing may back off after transport errors, but recovery must remain
   automatic while the payment is active.

## Terminal-state proposal

Proposed terminal statuses:

- `paid`
- `overpaid`
- `expired`
- `failed`

Proposed non-terminal statuses:

- `awaiting_payment`
- `detected`
- `confirming`
- `underpaid`

The classification of `underpaid` is the only material unresolved lifecycle
decision. Its payload includes both `amount_outstanding` and `crypto_address`,
which strongly implies that the shopper can correct it with another transfer.
Continuing to poll is therefore the safest proposed behavior, but confirmation
from Triple-A would remove ambiguity.

## Exhaustiveness

Unknown statuses must not silently fall through to `awaiting_payment` or
`failed`. Runtime validation should reject or isolate an unknown response, and
the UI should show a neutral "unable to confirm current payment status" state
while preserving the payment reference for support.
