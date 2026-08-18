# Open Questions and Assumption Register

Status: Draft for review
Scope: Pre-implementation analysis only

## Questions worth sending to Triple-A

These questions materially affect shopper behavior and cannot be answered from
the supplied API contract with certainty.

### Q1. Is `underpaid` non-terminal?

The payload supplies `amount_outstanding` and `crypto_address`, suggesting the
shopper should send the missing amount and the page should continue polling.

Proposed question:

> For an `underpaid` payment, should the shopper send `amount_outstanding` to
> the supplied address while the page continues polling, or should we treat
> `underpaid` as terminal and direct the shopper to support?

Default if unanswered: treat it as shopper-recoverable and continue polling.

### Q2. Which statuses are terminal for polling?

The brief says to stop on terminal states but does not enumerate them.

Proposed question:

> Can you confirm whether `paid`, `overpaid`, `expired`, and `failed` are the
> terminal states, with `underpaid` remaining active?

Default if unanswered: use that classification and document it.

### Q3. How should late payments be represented?

The narrative mentions that money can arrive late, but no dedicated late state
or transition is provided.

Proposed question:

> If a transfer is detected after a quote expires, which documented status
> should the mock/API return, and should the checkout continue the original
> payment or direct the shopper to support?

Default if unanswered: do not invent a status; exercise `expired` independently
and document the missing production rule.

## Questions we can resolve through documented design judgment

These do not need recruiter input unless Triple-A wants to prescribe behavior.

### D1. What happens at local countdown zero?

Proposed decision: perform one immediate status reconciliation before showing
authoritative expiry. This protects an in-flight payment from a poll/countdown
race.

### D2. Can the shopper change currency/network after detection?

Proposed decision: no. Lock the selection after `detected` or any state proving
funds arrived.

### D3. What should the overpaid page promise?

Proposed decision: acknowledge the received and excess amounts, tell the
shopper not to send more, retain the reference, and suggest support. Do not
promise an automatic refund.

### D4. How should polling errors appear?

Proposed decision: preserve the last known payment state, add a non-destructive
connectivity warning, retry automatically, and offer a manual retry. Never map a
transport error to payment `failed`.

### D5. Should Redux Toolkit own payment status?

Proposed decision: no. Remote payment/quote data should have one owner in
TanStack Query. Redux Toolkit should be omitted unless a concrete cross-cutting
client-state requirement emerges; including it without such a requirement
would add a second state model and weaken the design.

## Known contract limitations

| Limitation | Consequence | Proposed treatment |
| --- | --- | --- |
| No server timestamp is included in a response body. | `expires_at - Date.now()` survives tab throttling but cannot fully correct a badly skewed device clock. | Document the limitation; optionally use the HTTP `Date` header if the mock and runtime expose it reliably. |
| No late-payment state is specified. | We cannot truthfully define recovery for funds detected after expiry. | Do not invent production semantics. |
| No refund/support policy is specified for overpayment. | The UI cannot promise refund timing or method. | Use factual copy only. |
| No explorer URL or complete transaction-hash guarantee is defined. | A block-explorer link may be wrong or unsafe. | Show a hash only when supplied; omit explorer linking. |
| No QR URI scheme is specified. | A raw address QR is safe but less convenient than a network-specific payment URI. | Default to encoding the exact address; document if amount-bearing URIs are deliberately omitted. |
| `GET` fixtures may contain only status-specific fields rather than the full payment. | The client needs the original creation response for quote/order context. | Merge status updates into cached payment data through a typed boundary, without allowing absent fields to erase known data. |
| The documented USDT/Tron quote requires one confirmation, while the `confirming` example for the same reference reports two of three confirmations. | Both examples cannot belong to one internally consistent live progression. | Preserve both literal examples in boundary tests. The simulator derives confirmation counts from the issued quote, skips `confirming` for one-confirmation methods, and exposes `confirming` for methods requiring more than one confirmation. |
| The supplied quote-not-expired problem-type URI returned HTTP 404 when checked on 2026-08-18, and no official page specifically explains this hosted-checkout error to shoppers. | The problem URI and available developer/invoicing pages are unsuitable as contextual shopper help. | Preserve the URI as an opaque RFC 9457 discriminator. Provide concise inline transfer and expiry guidance; add an external help link only if Triple-A supplies an authoritative page for this flow. |

## Assumption approval states

Each assumption should use one of these labels in later documents:

- **Confirmed by brief**
- **Confirmed by Triple-A**
- **Candidate decision**
- **Accepted design decision**
- **Deferred/unsupported by contract**

This avoids presenting a reasonable inference as though it were an API fact.
