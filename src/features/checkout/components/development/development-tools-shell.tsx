"use client";

import type { ReactNode } from "react";

import type { PaymentReference } from "../../api/contracts/primitives";

const DOCK_CLASS_NAME =
  "fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-2 border-b-0 border-dashed border-violet-300 bg-violet-50 text-left shadow-[0_-20px_60px_-28px_rgba(76,29,149,0.45)] sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-[22rem] sm:rounded-none sm:border-y-0 sm:border-r-0 sm:shadow-[-20px_0_60px_-32px_rgba(76,29,149,0.45)]";

type DevelopmentToolsShellProps = Readonly<{
  paymentReference?: PaymentReference;
  onClose: () => void;
  children: ReactNode;
}>;

export const DevelopmentToolsShell = ({
  paymentReference,
  onClose,
  children,
}: DevelopmentToolsShellProps) => (
  <aside
    id="development-tools-panel"
    aria-label="Development scenario controls"
    className={DOCK_CLASS_NAME}
  >
    <header className="sticky top-0 z-10 border-b border-violet-200 bg-violet-50/95 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-bold tracking-[0.16em] text-violet-800 uppercase">
            Development only
          </p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">
            Evaluator controls
          </h2>
        </div>
        <button
          type="button"
          aria-label="Close development tools"
          className="flex size-11 items-center justify-center rounded-xl border border-violet-300 bg-white text-xl text-violet-950 outline-offset-2 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-900"
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {paymentReference ? (
        <code className="mt-3 block overflow-hidden rounded-lg bg-white px-3 py-2 text-xs text-ellipsis whitespace-nowrap text-violet-900">
          {paymentReference}
        </code>
      ) : null}
    </header>
    <div className="p-4">{children}</div>
  </aside>
);

export const DevelopmentToolsEmptyPanel = ({
  onClose,
}: Readonly<{ onClose: () => void }>) => (
  <DevelopmentToolsShell onClose={onClose}>
    <section
      role="status"
      aria-labelledby="development-tools-empty-title"
      className="rounded-xl border border-violet-200 bg-white p-4"
    >
      <h3
        id="development-tools-empty-title"
        className="font-semibold text-slate-950"
      >
        Create a quote to enable scenarios
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Select a payment method in the checkout. Payment-state, network, and
        polling controls will appear here once the mock API issues a payment
        reference.
      </p>
    </section>
  </DevelopmentToolsShell>
);
