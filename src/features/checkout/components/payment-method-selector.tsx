import type { CurrenciesResponse } from "../api/contracts/currencies";
import type { PaymentMethodSelection } from "../domain/payment-method";

type PaymentMethodSelectorProps = Readonly<{
  catalog: CurrenciesResponse;
  value: PaymentMethodSelection | null;
  onChange(selection: PaymentMethodSelection): void;
  disabled?: boolean;
}>;

function isSelected(
  value: PaymentMethodSelection | null,
  selection: PaymentMethodSelection,
): boolean {
  return (
    value?.currency === selection.currency &&
    value.network === selection.network
  );
}

export function PaymentMethodSelector({
  catalog,
  value,
  onChange,
  disabled = false,
}: PaymentMethodSelectorProps) {
  return (
    <fieldset disabled={disabled} aria-describedby="payment-method-guidance">
      <legend className="text-xl font-semibold tracking-tight text-slate-950">
        Cryptocurrency and network
      </legend>
      <p
        id="payment-method-guidance"
        className="mt-2 max-w-2xl text-sm leading-6 text-slate-600"
      >
        Choose the exact network you will use to send the payment. Sending on a
        different network can permanently lose funds.
      </p>

      <div className="mt-6 space-y-7">
        {catalog.currencies.map((currency, currencyIndex) => (
          <section
            key={currency.code}
            aria-labelledby={`currency-${currencyIndex}`}
          >
            <div className="mb-3 flex items-baseline gap-2">
              <h3
                id={`currency-${currencyIndex}`}
                className="text-base font-semibold text-slate-950"
              >
                {currency.code}
              </h3>
              <p className="text-sm text-slate-500">{currency.name}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {currency.networks.map((network, networkIndex) => {
                const selection = {
                  currency: currency.code,
                  network: network.id,
                } satisfies PaymentMethodSelection;
                const selected = isSelected(value, selection);
                const inputId = `payment-method-${currencyIndex}-${networkIndex}`;

                return (
                  <label
                    key={network.id}
                    htmlFor={inputId}
                    className="relative flex min-h-32 cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-400 has-checked:border-slate-950 has-checked:ring-1 has-checked:ring-slate-950 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-slate-950 has-disabled:cursor-not-allowed has-disabled:opacity-60"
                  >
                    <input
                      id={inputId}
                      className="sr-only"
                      type="radio"
                      name="payment-method"
                      aria-label={`${currency.code} on ${network.name}`}
                      checked={selected}
                      disabled={disabled}
                      onChange={() => onChange(selection)}
                    />
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
                          {currency.code} network
                        </span>
                        <span className="mt-1 block font-semibold text-slate-950">
                          {network.name}
                        </span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold text-white ${
                          selected
                            ? "border-slate-950 bg-slate-950"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {selected ? "✓" : ""}
                      </span>
                    </span>
                    <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-xs text-slate-600">
                      <span>
                        Fee: {network.network_fee} {currency.code}
                      </span>
                      <span>
                        {network.required_confirmations}{" "}
                        {network.required_confirmations === 1
                          ? "confirmation"
                          : "confirmations"}
                      </span>
                    </span>
                    {selected ? (
                      <span className="sr-only">Selected</span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </fieldset>
  );
}
