import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "ghost"
  | "dark"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-control font-medium " +
  "transition-colors duration-150 whitespace-nowrap " +
  "disabled:pointer-events-none disabled:opacity-50 " +
  "aria-disabled:pointer-events-none aria-disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-navy text-white hover:bg-navy-deep active:bg-navy-deep",
  secondary:
    "bg-surface text-ink border border-line hover:border-navy hover:text-navy",
  accent: "bg-gold text-ink hover:bg-gold-deep",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-surface-alt",
  dark: "bg-ink text-white hover:bg-ink-soft",
  danger: "bg-negative text-white hover:brightness-110",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-caption",
  md: "h-11 px-5 text-small",
  lg: "h-12 px-6 text-body",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
  /** Renders a spinner and blocks interaction. */
  loading?: boolean;
  /** Stretches to the container width. */
  block?: boolean;
}

type ButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof CommonProps>;

type LinkButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, keyof CommonProps>;

function classes({ variant = "primary", size = "md", block, className }: CommonProps) {
  return cn(BASE, VARIANTS[variant], SIZES[size], block && "w-full", className);
}

export function Button({
  variant,
  size,
  block,
  className,
  children,
  loading,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classes({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/**
 * Navigation must be a real anchor — the reference used onClick buttons, which
 * break middle-click, open-in-new-tab, and crawlability.
 */
export function LinkButton({
  variant,
  size,
  block,
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={classes({ variant, size, block, className })} {...props}>
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        className="opacity-25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Square button for icon-only actions. `label` is required for screen readers. */
export function IconButton({
  label,
  size = "md",
  variant = "secondary",
  className,
  children,
  ...props
}: Omit<ButtonProps, "children" | "block"> & { label: string; children: ReactNode }) {
  const dims = size === "sm" ? "h-9 w-9" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        BASE,
        VARIANTS[variant],
        dims,
        "rounded-full p-0 shrink-0",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
