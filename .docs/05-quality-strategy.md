# Quality and Verification Strategy

Status: Foundation toolchain active; feature coverage pending
Scope: Verification architecture and implemented quality gates

## Principle

Testing effort follows payment risk, not component count. A selector snapshot
is less valuable than proving that a detected payment cannot expire or that a
slow poll cannot overlap with another request.

## Test layers

### Domain unit tests

Fast tests without React or HTTP:

- Status classification is exhaustive.
- Recoverable/non-recoverable action mapping.
- Terminal/non-terminal classification.
- Decimal parsing, comparison, subtraction, and formatting.
- Six- and eighteen-decimal boundaries.
- Quote-expiration calculation from absolute timestamps.
- Polling interval policy by status and transport failure count.
- QR payload construction.

### Contract tests

Validate every fixture against the same runtime schemas used by the client:

- Currency/network response.
- Payment creation response.
- All eight status payloads.
- Requote response.
- RFC 9457-style `application/problem+json` response used by the brief.
- Unsupported currency/network combination.
- Unknown status and malformed monetary string rejection.

### Component and integration tests

- All currency/network combinations are derived from API data.
- Changing selection requests a complete new quote.
- A stale quote response cannot overwrite a newer selection.
- Copy action uses the exact visible address and announces success.
- QR payload matches the visible quote.
- Issued currency/network are fixed attributes; changing them uses a guarded
  flow rather than mutating active instructions in place.
- Address copy and QR display or scan assumptions do not change lifecycle state.
- Countdown is calculated from `expires_at` rather than decremented state.
- `detected` freezes expiration.
- Every status renders factual shopper guidance and the correct available action.
- Connectivity failure preserves the last known payment state.
- Requote success atomically replaces quote data.
- Requote 409 is recoverable and does not corrupt state.

### Browser journeys

Keep the browser suite small and high-value:

1. **Happy path:** create quote, copy address, detect payment, confirm, finish
   paid, and verify polling stops.
2. **Background expiry:** background or advance time beyond expiry, resume, and
   verify the displayed countdown/state is immediately correct.
3. **Detection/expiry race:** reach zero while status refresh returns detected;
   verify expiry never replaces the in-flight payment.
4. **Underpayment recovery:** show exact outstanding amount and preserve
   network/address; continue to paid if the accepted semantics allow it.
5. **Slow response:** verify only one status request is in flight.
6. **Transient server failure:** retain last good state, communicate degraded
   connectivity, recover automatically, and do not show payment `failed`.
7. **Wrong-network prevention:** verify the network is visible at each transfer
   decision point, active instructions cannot be edited in place, guarded
   changing works only while awaiting, and changing is unavailable after
   detection.

## State-by-state acceptance criteria

### `awaiting_payment`

- Shopper sees exact total due, asset, network, address, QR, and countdown.
- Network warning is adjacent to the transfer instruction.
- Issued currency/network are fixed. A guarded method-change action remains
  available only after the shopper confirms that no funds were sent.
- Polling is active.

### `detected`

- Shopper is explicitly told that funds were found with zero confirmations.
- Shopper is told not to send again.
- Countdown no longer controls presentation.
- Selection is locked.
- The method-change action is absent.
- Polling remains active.

### `confirming`

- Current and required confirmations are visible.
- No additional-payment action is offered.
- Polling remains active.

### `paid`

- Success is clear and factual.
- Payment reference remains visible.
- Polling stops.

### `underpaid`

- Received and outstanding amounts are not confused.
- The instruction says to send only the outstanding amount.
- Asset, network, and address remain explicit.
- Polling behavior follows the accepted terminal-state decision.

### `overpaid`

- Received and excess amounts are factual.
- The shopper is told not to send more.
- No automatic-refund promise appears.
- Payment reference/support direction remains available.
- Polling stops under the proposed classification.

### `expired`

- The old quote is clearly unusable.
- Unsafe payment instructions are not presented as active.
- Requote is the primary action.
- Successful requote replaces all quote details.

### `failed`

- The settlement reason is translated into safe, non-technical guidance where
  possible.
- The shopper is not instructed to repeat the full payment.
- Payment reference and support direction remain visible.
- Polling stops under the proposed classification.

## Decimal test cases

At minimum:

| Case | Expected property |
| --- | --- |
| `0.000001` USDT | Preserved exactly |
| `163.690000` USDT | Display policy is deliberate; transfer value is not changed |
| `0.000000000000000001` ETH | Preserved exactly; never scientific notation |
| `120.00` received and `43.69` outstanding | No float artifact |
| `180.00` received and `16.31` excess | No float artifact |
| Amount with more decimals than currency metadata permits | Rejected or surfaced as protocol error, never silently rounded |

## Timer and concurrency verification

Use controlled/fake time for domain and integration tests. Assertions should
prove:

- Remaining time is based on an absolute timestamp.
- Large time jumps produce the correct value immediately.
- Exactly one reconciliation happens at zero.
- Re-renders do not create additional timer loops.
- Unmount removes timer/visibility listeners.
- Slow HTTP responses do not overlap.
- Changing payment reference prevents obsolete responses from updating the UI.

## Accessibility verification

- Automated accessibility scan on the primary flow and each materially
  different outcome class.
- Keyboard-only walkthrough.
- Screen-reader-oriented inspection of headings, form labels, status
  announcements, and copy confirmation.
- Mobile-width review of address wrapping, QR sizing, and action targets.
- Contrast verification for normal, warning, success, and error treatments.

## Definition of done before submission

- Official React and Next.js security advisories have been rechecked close to
  submission, and framework/runtime dependencies are on the latest applicable
  stable patched releases.
- The lockfile is committed and a dependency vulnerability audit has been
  reviewed; no critical/high finding is ignored without an explicit rationale.
- Every critical requirement in the traceability matrix has verification
  evidence.
- All eight statuses are manually triggerable and automatically covered at the
  appropriate layer.
- Slow and failed transport are independently triggerable.
- Build, type checking, linting, unit/integration tests, and selected browser
  journeys pass.
- No monetary path uses binary floating-point arithmetic.
- No active-status path leaks or overlaps polling.
- Documentation matches implemented behavior and records remaining limitations.
- The README's agent-collaboration section is based on actual decisions and
  rejected work.

Mock-API Playwright integration runs against `next dev` because evaluator
scenario endpoints are intentionally unavailable in a production runtime. The
same delivery gate separately runs `next build`, so exercising development
controls does not replace production compilation and framework type analysis.
