# ADR-0005: Immediate lifecycle transitions over decorative motion

Status: Accepted
Date: 2026-08-18
Implementation review: 2026-08-18

## Context

The checkout changes between safety-critical lifecycle presentations such as
awaiting payment, detected funds, confirmation progress, expiry reconciliation,
and settlement outcomes. Smooth animated transitions could add visual polish,
but the assessment is explicitly time-boxed and does not require a
pixel-perfect branded interface.

The implementation had to prioritize complete lifecycle behavior, timing and
transport failures, exact monetary handling, accessibility, and automated
verification. Spending the remaining assessment time on state choreography
would reduce the time available to validate flows where an incorrect result
could tell a shopper to resend funds or use stale instructions.

## Options considered

1. Add bespoke animated transitions between every lifecycle state.
2. Add a generic fade/slide transition around the changing status surface.
3. Render lifecycle changes immediately and reserve motion for minor,
   nonessential interface feedback.

## Decision

Choose option 3. Payment lifecycle content changes immediately when validated
state changes. Do not delay, overlap, or temporarily retain old payment
instructions for decorative animation.

The application may keep restrained micro-transitions that do not affect
payment meaning, focus, or action availability. All such motion must continue
to respect `prefers-reduced-motion`.

## Consequences

- The interface is intentionally less animated than a brand-complete production
  checkout.
- New authoritative payment instructions and safety messages appear without an
  animation delay.
- Old and new lifecycle states are not visually overlapped, reducing the risk
  of contradictory amounts, actions, or announcements.
- Engineering and verification time remains focused on the complete working
  flow, adverse conditions, accessibility, and payment-safety invariants.
- A future design pass may introduce restrained transitions after usability
  testing, provided they never delay critical content, move focus, duplicate
  assistive-technology announcements, or ignore reduced-motion preferences.

## Verification and review trigger

The implemented checkout uses semantic status and alert regions, immediate
conditional rendering, visible focus, and a global reduced-motion override.
Browser coverage verifies lifecycle outcomes and reduced-motion behavior rather
than animation timing.

Revisit this decision when a production visual design and motion specification
exist, the complete lifecycle remains regression-covered, and motion can be
tested with shoppers and assistive technologies without weakening immediate
safety communication.
