import {
  paymentReferenceSchema,
  type PaymentReference,
} from "@/features/checkout/api/contracts/primitives";

type PaymentReferenceGlobal = typeof globalThis & {
  __tripleAStablecoinPaymentReferenceSequence?: number;
};

const referenceGlobal = globalThis as PaymentReferenceGlobal;

export const createUniqueMockPaymentReference = (): PaymentReference => {
  const sequence =
    (referenceGlobal.__tripleAStablecoinPaymentReferenceSequence ?? 0) + 1;
  referenceGlobal.__tripleAStablecoinPaymentReferenceSequence = sequence;

  return paymentReferenceSchema.parse(
    `AQH-100306-PMT-${String(sequence).padStart(6, "0")}`,
  );
};
