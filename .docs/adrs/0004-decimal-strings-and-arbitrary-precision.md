# ADR-0004: Decimal strings and arbitrary-precision operations

Status: Accepted
Date: 2026-08-17
Implementation review: 2026-08-18

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

The implementation keeps money as branded decimal strings across every HTTP
contract. Catalog-provided decimal metadata validates quote/status scale, so a
new structurally valid backend currency does not require a frontend currency
enum. `big.js` strict mode is confined to domain operations that prove totals or
derive mock outstanding/excess amounts; authoritative server strings remain the
display source and are never silently rounded.

Tests cover six- and eighteen-decimal boundaries, smallest ETH units, trailing
zero preservation, exact addition/subtraction, exponent rejection, over-scale
payloads, and the documented `120.00`/`43.69` and `180.00`/`16.31` cases. A
source audit finds no `Number`, `parseFloat`, or native money arithmetic in the
production checkout paths.

Revisit only if the production API changes representation (for example to
integer minor units) or defines a different asset-scale contract.
