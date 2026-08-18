import { z } from "zod";

import {
  currencyCodeSchema,
  networkIdSchema,
} from "@/features/checkout/api/contracts/payment-method";
import { PAYMENT_STATUS } from "@/features/checkout/api/contracts/payment-status-values";
import {
  createPaymentResponseSchema,
  type CreatePaymentRequest,
  type CreatePaymentResponse,
} from "@/features/checkout/api/contracts/payments";
import {
  cryptoAddressSchema,
  paymentReferenceSchema,
  positiveDecimalStringSchema,
  type PaymentReference,
} from "@/features/checkout/api/contracts/primitives";
import {
  addDecimalAmounts,
  formatCalculatedAmount,
} from "@/features/checkout/domain/money";
import { isPaymentMethodSupported } from "@/features/checkout/domain/payment-method";
import { CHECKOUT_SESSION } from "@/features/checkout/config/checkout-session";
import { CURRENCIES_FIXTURE } from "@/mocks/fixtures/currencies";

export const MOCK_QUOTE_LIFETIME_MILLISECONDS = 3 * 60 * 1_000;
export const MOCK_PAYMENT_REFERENCE = "AQH-100306-PMT";

const mockQuoteProfileSchema = z.strictObject({
  currency: currencyCodeSchema,
  network: networkIdSchema,
  exchange_rate: positiveDecimalStringSchema,
  crypto_amount: positiveDecimalStringSchema,
  crypto_address: cryptoAddressSchema,
});

export const MOCK_QUOTE_PROFILES = z.array(mockQuoteProfileSchema).parse([
  {
    currency: "USDT",
    network: "tron",
    exchange_rate: "0.9214",
    crypto_amount: "162.69",
    crypto_address: "TQ5Nn8kLpVv3xJ7wYcR2bF9aH4dM6sGz1e",
  },
  {
    currency: "USDT",
    network: "ethereum",
    exchange_rate: "0.9208",
    crypto_amount: "162.85",
    crypto_address: "mock-usdt-ethereum-destination",
  },
  {
    currency: "USDC",
    network: "ethereum",
    exchange_rate: "0.9196",
    crypto_amount: "163.00",
    crypto_address: "mock-usdc-ethereum-destination",
  },
  {
    currency: "USDC",
    network: "polygon",
    exchange_rate: "0.9182",
    crypto_amount: "163.25",
    crypto_address: "mock-usdc-polygon-destination",
  },
  {
    currency: "USDC",
    network: "solana",
    exchange_rate: "0.9175",
    crypto_amount: "163.38",
    crypto_address: "mock-usdc-solana-destination",
  },
  {
    currency: "ETH",
    network: "ethereum",
    exchange_rate: "3187.45",
    crypto_amount: "0.04703",
    crypto_address: "mock-eth-ethereum-destination",
  },
]);

export class UnsupportedPaymentMethodError extends Error {
  constructor(
    readonly currency: string,
    readonly network: string,
  ) {
    super(`Unsupported payment method: ${currency}:${network}`);
    this.name = "UnsupportedPaymentMethodError";
  }
}

const fractionDigits = (value: string): number => {
  return value.split(".")[1]?.length ?? 0;
};

export const createMockPayment = (
  request: CreatePaymentRequest,
  now = new Date(),
  paymentReference: PaymentReference = paymentReferenceSchema.parse(
    MOCK_PAYMENT_REFERENCE,
  ),
): CreatePaymentResponse => {
  if (!isPaymentMethodSupported(CURRENCIES_FIXTURE, request)) {
    throw new UnsupportedPaymentMethodError(request.currency, request.network);
  }

  const currency = CURRENCIES_FIXTURE.currencies.find(
    (candidate) => candidate.code === request.currency,
  );
  const network = currency?.networks.find(
    (candidate) => candidate.id === request.network,
  );
  const profile = MOCK_QUOTE_PROFILES.find(
    (candidate) =>
      candidate.currency === request.currency &&
      candidate.network === request.network,
  );

  if (!currency || !network || !profile) {
    throw new Error(
      `Mock quote profile is missing for ${request.currency}:${request.network}`,
    );
  }

  const totalDue = addDecimalAmounts(
    profile.crypto_amount,
    network.network_fee,
  );
  const minimumFractionDigits = Math.max(
    fractionDigits(profile.crypto_amount),
    fractionDigits(network.network_fee),
  );

  return createPaymentResponseSchema.parse({
    payment_reference: paymentReference,
    order_id: request.order_id,
    status: PAYMENT_STATUS.awaiting_payment,
    merchant: CHECKOUT_SESSION.merchant,
    order: CHECKOUT_SESSION.order,
    quote: {
      crypto_currency: request.currency,
      network: request.network,
      network_name: network.name,
      exchange_rate: profile.exchange_rate,
      crypto_amount: profile.crypto_amount,
      network_fee: network.network_fee,
      total_due: formatCalculatedAmount(
        totalDue,
        currency.decimals,
        minimumFractionDigits,
      ),
      crypto_address: profile.crypto_address,
      required_confirmations: network.required_confirmations,
      expires_at: new Date(
        now.getTime() + MOCK_QUOTE_LIFETIME_MILLISECONDS,
      ).toISOString(),
    },
  });
};
