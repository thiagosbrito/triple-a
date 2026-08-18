export const PAYMENT_STATUSES = [
  "awaiting_payment",
  "detected",
  "confirming",
  "paid",
  "underpaid",
  "overpaid",
  "expired",
  "failed",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS = {
  awaiting_payment: "awaiting_payment",
  detected: "detected",
  confirming: "confirming",
  paid: "paid",
  underpaid: "underpaid",
  overpaid: "overpaid",
  expired: "expired",
  failed: "failed",
} as const satisfies { [TStatus in PaymentStatus]: TStatus };

export const PAYMENT_FAILURE_REASONS = ["settlement_rejected"] as const;
export type PaymentFailureReason = (typeof PAYMENT_FAILURE_REASONS)[number];

export const PAYMENT_FAILURE_REASON = {
  settlement_rejected: "settlement_rejected",
} as const satisfies {
  [TReason in PaymentFailureReason]: TReason;
};

export type ShopperActionClass =
  "shopper_can_act" | "wait" | "complete" | "support_required";

export type PollingDirective = "continue" | "stop";
export type QuoteExpirationDirective =
  "active" | "frozen" | "expired" | "irrelevant";
export type PaymentMethodChangeDirective = "available" | "locked";

export type PaymentStatusPolicy = Readonly<{
  actionClass: ShopperActionClass;
  isTerminal: boolean;
  methodChange: PaymentMethodChangeDirective;
  polling: PollingDirective;
  quoteExpiration: QuoteExpirationDirective;
}>;

export const PAYMENT_STATUS_POLICIES = {
  [PAYMENT_STATUS.awaiting_payment]: {
    actionClass: "shopper_can_act",
    isTerminal: false,
    methodChange: "available",
    polling: "continue",
    quoteExpiration: "active",
  },
  [PAYMENT_STATUS.detected]: {
    actionClass: "wait",
    isTerminal: false,
    methodChange: "locked",
    polling: "continue",
    quoteExpiration: "frozen",
  },
  [PAYMENT_STATUS.confirming]: {
    actionClass: "wait",
    isTerminal: false,
    methodChange: "locked",
    polling: "continue",
    quoteExpiration: "frozen",
  },
  [PAYMENT_STATUS.paid]: {
    actionClass: "complete",
    isTerminal: true,
    methodChange: "locked",
    polling: "stop",
    quoteExpiration: "irrelevant",
  },
  [PAYMENT_STATUS.underpaid]: {
    actionClass: "shopper_can_act",
    isTerminal: false,
    methodChange: "locked",
    polling: "continue",
    quoteExpiration: "frozen",
  },
  [PAYMENT_STATUS.overpaid]: {
    actionClass: "support_required",
    isTerminal: true,
    methodChange: "locked",
    polling: "stop",
    quoteExpiration: "irrelevant",
  },
  [PAYMENT_STATUS.expired]: {
    actionClass: "shopper_can_act",
    isTerminal: true,
    methodChange: "locked",
    polling: "stop",
    quoteExpiration: "expired",
  },
  [PAYMENT_STATUS.failed]: {
    actionClass: "support_required",
    isTerminal: true,
    methodChange: "locked",
    polling: "stop",
    quoteExpiration: "irrelevant",
  },
} as const satisfies Record<PaymentStatus, PaymentStatusPolicy>;

export const getPaymentStatusPolicy = (
  status: PaymentStatus,
): PaymentStatusPolicy => {
  return PAYMENT_STATUS_POLICIES[status];
};

export const isTerminalPaymentStatus = (status: PaymentStatus): boolean => {
  return PAYMENT_STATUS_POLICIES[status].isTerminal;
};
