# ADR-0004: Decimal strings and arbitrary-precision operations

Status: Accepted
Date: 2026-08-17

## Context

The contract uses decimal strings and the scoring criteria prohibit floats.
The checkout must handle six-decimal stablecoins and eighteen-decimal ETH
without rounding, scientific notation, or unsafe conversion.

## Options considered

1. Native JavaScript numbers.
2. Integer minor units represented by `BigInt`.
3. Decimal strings at boundaries with an arbitrary-precision decimal library.

## Decision

Choose option 3 using `big.js` in strict mode. Runtime schemas accept and
validate decimal strings. Money utilities are the only place that constructs
`Big` values; native numbers are not accepted for monetary input.

## Consequences

- The transport representation remains unchanged and readable.
- Strict mode rejects primitive-number construction and imprecise conversion.
- Formatting and asset scale remain explicit domain policies.
- Server-supplied values are displayed directly where arithmetic is
  unnecessary.
- `@types/big.js` is required because the package does not ship its own types.

## Verification and review trigger

Test zero, maximum supported scale, six- and eighteen-decimal boundaries,
comparison, subtraction, trailing-zero policy, and rejection of exponent or
number inputs where the contract disallows them.
