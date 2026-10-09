"use client";

import type { RefObject } from "react";

import type { PaymentReference } from "../../api/contracts/primitives";
import {
  DevelopmentScenarioPanel,
  DevelopmentToolsEmptyPanel,
} from "./development-scenario-panel";

type DevelopmentToolsProps = Readonly<{
  isOpen: boolean;
  launcherRef: RefObject<HTMLButtonElement | null>;
  paymentReference: PaymentReference | undefined;
  onOpen: () => void;
  onClose: () => void;
}>;

export const DevelopmentTools = ({
  isOpen,
  launcherRef,
  paymentReference,
  onOpen,
  onClose,
}: DevelopmentToolsProps) => {
  if (!isOpen) {
    return (
      <button
        ref={launcherRef}
        type="button"
        aria-controls="development-tools-panel"
        aria-expanded="false"
        className="fixed right-4 bottom-4 z-40 min-h-11 rounded-full border border-violet-300 bg-violet-900 px-4 py-2 text-sm font-semibold text-white shadow-lg outline-offset-2 hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-violet-950"
        onClick={onOpen}
      >
        Dev tools
        <span className="ml-2 hidden text-xs font-normal text-violet-200 sm:inline">
          ⌘/Ctrl ⇧ K
        </span>
      </button>
    );
  }

  return paymentReference ? (
    <DevelopmentScenarioPanel
      key={paymentReference}
      paymentReference={paymentReference}
      onClose={onClose}
    />
  ) : (
    <DevelopmentToolsEmptyPanel onClose={onClose} />
  );
};
