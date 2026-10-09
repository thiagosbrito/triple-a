"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const useDevelopmentToolsController = (enabled: boolean) => {
  const [isOpen, setIsOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const open = useCallback((): void => {
    if (enabled) {
      setIsOpen(true);
    }
  }, [enabled]);

  const dismiss = useCallback((): void => {
    setIsOpen(false);
  }, []);

  const close = useCallback((): void => {
    dismiss();
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, [dismiss]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleShortcut = (event: KeyboardEvent): void => {
      const togglesTools =
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "k";

      if (togglesTools) {
        event.preventDefault();
        setIsOpen((currentlyOpen) => {
          if (currentlyOpen) {
            requestAnimationFrame(() => launcherRef.current?.focus());
          }

          return !currentlyOpen;
        });
        return;
      }

      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [close, enabled, isOpen]);

  return {
    isOpen: enabled && isOpen,
    launcherRef,
    open,
    close,
    dismiss,
  } as const;
};
