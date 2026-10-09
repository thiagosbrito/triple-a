import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DevelopmentTools } from "./development-tools";
import { useDevelopmentToolsController } from "./use-development-tools-controller";

const DevelopmentToolsHarness = ({
  enabled = true,
}: Readonly<{ enabled?: boolean }>) => {
  const controller = useDevelopmentToolsController(enabled);

  return (
    <>
      <output>{controller.isOpen ? "open" : "closed"}</output>
      {enabled ? (
        <DevelopmentTools
          isOpen={controller.isOpen}
          launcherRef={controller.launcherRef}
          paymentReference={undefined}
          onOpen={controller.open}
          onClose={controller.close}
        />
      ) : null}
    </>
  );
};

beforeEach(() => {
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) =>
    window.setTimeout(() => callback(0), 0),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DevelopmentTools", () => {
  it("opens from the launcher and restores launcher focus when closed", async () => {
    render(<DevelopmentToolsHarness />);

    const launcher = screen.getByRole("button", { name: /^Dev tools/u });
    fireEvent.click(launcher);

    expect(screen.getByText("open")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Close development tools" }),
    );

    const restoredLauncher = screen.getByRole("button", {
      name: /^Dev tools/u,
    });
    await waitFor(() => expect(restoredLauncher).toHaveFocus());
  });

  it("toggles with the platform shortcut and closes with Escape", async () => {
    render(<DevelopmentToolsHarness />);

    fireEvent.keyDown(window, {
      key: "k",
      ctrlKey: true,
      shiftKey: true,
    });
    expect(
      screen.getByRole("complementary", {
        name: "Development scenario controls",
      }),
    ).toBeVisible();

    fireEvent.keyDown(window, { key: "Escape" });

    const launcher = screen.getByRole("button", { name: /^Dev tools/u });
    await waitFor(() => expect(launcher).toHaveFocus());
  });

  it("does not install an active shortcut when development tools are disabled", () => {
    render(<DevelopmentToolsHarness enabled={false} />);

    fireEvent.keyDown(window, {
      key: "k",
      metaKey: true,
      shiftKey: true,
    });

    expect(screen.getByText("closed")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Dev tools/u }),
    ).not.toBeInTheDocument();
  });
});
