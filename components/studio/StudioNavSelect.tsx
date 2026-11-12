"use client";

import { ListFilter } from "lucide-react";
import { useRouter } from "next/navigation";

export function StudioNavSelect({
  label = "Add Filter",
  name,
  value,
  options,
  pathname,
  keep,
}: {
  label?: string;
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  pathname: string;
  /** Query params to preserve when this filter changes. */
  keep?: Record<string, string | undefined>;
}) {
  const router = useRouter();

  return (
    <label className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-caption font-medium text-ink">
      <ListFilter className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        className="max-w-[10rem] bg-transparent focus:outline-none"
        onChange={(event) => {
          const next = new URLSearchParams();
          for (const [key, entry] of Object.entries(keep ?? {})) {
            if (entry) next.set(key, entry);
          }
          if (event.target.value) next.set(name, event.target.value);
          else next.delete(name);
          const qs = next.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname);
        }}
      >
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
