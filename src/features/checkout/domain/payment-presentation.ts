import { PAYMENT_STATUS, type PaymentStatus } from "./payment-status";

export type PaymentPresentationCategory =
  "action_required" | "in_progress" | "success" | "attention";

export type PaymentPresentationAction =
  "none" | "request_new_quote" | "contact_support";

export type PaymentPresentation = Readonly<{
  category: PaymentPresentationCategory;
  heading: string;
  primaryAction: PaymentPresentationAction;
  safetyInstruction: string;
  summary: string;
}>;

export const PAYMENT_SAFETY_GUIDANCE = [
  {
    id: "match_method",
    instruction:
      "In your wallet, select exactly the asset and network shown on this page.",
  },
  {
    id: "verify_instruction",
    instruction:
      "Verify the exact amount and destination address before confirming the transfer.",
  },
  {
    id: "send_once",
    instruction:
      "Send the payment once, before the quote expires, and keep this page open.",
  },
  {
    id: "wait_after_detection",
    instruction:
      "After payment is detected, do not send again while confirmations are in progress.",
  },
] as const;

export const PAYMENT_PRESENTATIONS = {
  [PAYMENT_STATUS.awaiting_payment]: {
    category: "action_required",
    heading: "Send your payment",
    primaryAction: "none",
    safetyInstruction:
      "Send the exact total using only the network shown in the payment instructions.",
    summary: "Your payment details are ready and the quote is active.",
  },
  [PAYMENT_STATUS.detected]: {
    category: "in_progress",
    heading: "Payment detected",
    primaryAction: "none",
    safetyInstruction:
      "Do not send another payment. We are waiting for the first network confirmation.",
    summary: "Your transfer has arrived with zero confirmations.",
  },
  [PAYMENT_STATUS.confirming]: {
    category: "in_progress",
    heading: "Payment confirming",
    primaryAction: "none",
    safetyInstruction:
      "Do not send another payment while network confirmations are in progress.",
    summary: "Your transfer is gaining the required network confirmations.",
  },
  [PAYMENT_STATUS.paid]: {
    category: "success",
    heading: "Payment complete",
    primaryAction: "none",
    safetyInstruction: "No further payment is required.",
    summary: "The required payment has settled successfully.",
  },
  [PAYMENT_STATUS.underpaid]: {
    category: "action_required",
    heading: "Additional payment required",
    primaryAction: "none",
    safetyInstruction:
      "Send only the outstanding amount using the same network and address shown.",
    summary:
      "We received part of the payment, but an amount remains outstanding.",
  },
  [PAYMENT_STATUS.overpaid]: {
    category: "attention",
    heading: "Payment received with an excess amount",
    primaryAction: "contact_support",
    safetyInstruction:
      "Do not send more. Keep your payment reference and contact support for help.",
    summary: "The amount received was greater than the requested total.",
  },
  [PAYMENT_STATUS.expired]: {
    category: "action_required",
    heading: "Quote expired",
    primaryAction: "request_new_quote",
    safetyInstruction:
      "Do not use the expired amount, address, or QR code. Request a new quote first.",
    summary: "The previous payment instructions are no longer active.",
  },
  [PAYMENT_STATUS.failed]: {
    category: "attention",
    heading: "Payment could not be settled",
    primaryAction: "contact_support",
    safetyInstruction:
      "Do not send another payment. Keep your payment reference and contact support.",
    summary: "The settlement was rejected and cannot be retried safely here.",
  },
} as const satisfies Record<PaymentStatus, PaymentPresentation>;

export const getPaymentPresentation = (
  status: PaymentStatus,
): PaymentPresentation => {
  return PAYMENT_PRESENTATIONS[status];
};
