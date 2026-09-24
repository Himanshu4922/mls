"use client";

import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * On/off switch. Extracted from the Watched alerts tab so every preference
 * toggle looks and announces the same way. Always give it an accessible name
 * (`aria-label`, or `aria-labelledby` pointing at the visible row label).
 */
export function Switch({
  checked,
  onCheckedChange,
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<"button">, "onChange" | "role"> & {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60",
        checked ? "bg-navy" : "bg-line",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
