"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export type StudioRowAction =
  | { type: "link"; label: string; href: string; external?: boolean }
  | { type: "button"; label: string; onClick: () => void; tone?: "danger" | "default" };

export function StudioRowMenu({ actions, label = "Row actions" }: { actions: StudioRowAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div className="relative flex justify-end" ref={rootRef}>
      <button
        type="button"
        className="grid h-7 w-7 place-items-center rounded-md text-ink-muted hover:bg-surface-alt hover:text-ink"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <ul
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+0.25rem)] z-20 min-w-[9.5rem] rounded-control border border-line bg-surface py-1 shadow-pop"
        >
          {actions.map((action) => (
            <li key={action.label} role="none">
              {action.type === "link" ? (
                <Link
                  role="menuitem"
                  href={action.href}
                  target={action.external ? "_blank" : undefined}
                  rel={action.external ? "noreferrer" : undefined}
                  className="block px-3 py-1.5 text-caption text-ink hover:bg-navy-tint"
                  onClick={() => setOpen(false)}
                >
                  {action.label}
                </Link>
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  className={cn(
                    "block w-full px-3 py-1.5 text-left text-caption hover:bg-navy-tint",
                    action.tone === "danger" ? "text-negative" : "text-ink",
                  )}
                  onClick={() => {
                    setOpen(false);
                    action.onClick();
                  }}
                >
                  {action.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function StudioAvatar({ name }: { name: string }) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  return (
    <span
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy-tint text-[0.65rem] font-semibold text-navy"
      title={name}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

export function StudioMetaTag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 text-caption text-ink-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}
