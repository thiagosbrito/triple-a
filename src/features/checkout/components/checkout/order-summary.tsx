import type {
  MerchantDetails,
  OrderSummary,
} from "../../api/contracts/payments";
import type { OrderId } from "../../api/contracts/primitives";
import { formatEuroOrderAmount } from "../../domain/money";

type OrderSummaryCardProps = Readonly<{
  merchant: MerchantDetails;
  orderId: OrderId;
  order: OrderSummary;
  locale: Intl.LocalesArgument;
}>;

const merchantInitials = (name: string): string => {
  return name
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();
};

export const OrderSummaryCard = ({
  merchant,
  orderId,
  order,
  locale,
}: OrderSummaryCardProps) => {
  return (
    <aside
      aria-labelledby="order-summary-title"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.35)] sm:p-8"
    >
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <div
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold tracking-wide text-white"
        >
          {merchantInitials(merchant.name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">Paying</p>
          <p className="truncate text-lg font-semibold text-slate-950">
            {merchant.name}
          </p>
        </div>
      </div>

      <h2
        id="order-summary-title"
        className="mt-6 text-sm font-semibold tracking-[0.14em] text-slate-500 uppercase"
      >
        Order summary
      </h2>

      <dl className="mt-5 space-y-5">
        <div className="flex items-start justify-between gap-6">
          <dt className="text-sm text-slate-500">Order reference</dt>
          <dd className="text-right font-mono text-sm font-semibold break-all text-slate-800">
            {orderId}
          </dd>
        </div>
        <div className="flex items-end justify-between gap-6 border-t border-slate-100 pt-5">
          <dt className="text-base font-medium text-slate-700">Total</dt>
          <dd className="text-right">
            <span className="block text-3xl font-semibold tracking-tight text-slate-950">
              {formatEuroOrderAmount(order.amount, locale)}
            </span>
            <span className="mt-1 block text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
              {order.currency}
            </span>
          </dd>
        </div>
      </dl>
    </aside>
  );
};
