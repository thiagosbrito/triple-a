import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AddressCopy } from "./address-copy";

const ADDRESS = "mock-usdc-polygon-destination";
const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard",
);

function setClipboard(writeText: (value: string) => Promise<void>): void {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

afterEach(() => {
  vi.restoreAllMocks();

  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, "clipboard", originalClipboardDescriptor);
  } else {
    Reflect.deleteProperty(navigator, "clipboard");
  }
});

describe("AddressCopy", () => {
  it("copies the exact visible address and announces success without moving focus", async () => {
    const user = userEvent.setup();
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockResolvedValue();
    setClipboard(writeText);

    render(
      <AddressCopy address={ADDRESS} asset="USDC" networkName="Polygon" />,
    );

    expect(screen.getByText(ADDRESS)).toHaveTextContent(ADDRESS);
    expect(
      screen.getByText("This address accepts USDC on Polygon only."),
    ).toBeInTheDocument();

    const copyButton = screen.getByRole("button", { name: "Copy address" });
    await user.click(copyButton);

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(ADDRESS);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Address copied. Verify it in your wallet before sending.",
    );
    expect(copyButton).toHaveFocus();
  });

  it("keeps the exact address visible and gives manual recovery when copying fails", async () => {
    const user = userEvent.setup();
    const writeText = vi
      .fn<(value: string) => Promise<void>>()
      .mockRejectedValue(new Error("permission denied"));
    setClipboard(writeText);

    render(
      <AddressCopy address={ADDRESS} asset="USDC" networkName="Polygon" />,
    );

    await user.click(screen.getByRole("button", { name: "Copy address" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Select and copy the full address shown above.",
    );
    expect(screen.getByText(ADDRESS)).toBeVisible();
  });
});
