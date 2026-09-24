"use client";

import { PropertyGridSkeleton } from "@/components/ui/States";
import { Switch } from "@/components/ui/Switch";
import type { WatchedPanelProps } from "@/components/watched/types";
import { useUpdateAlertPrefs } from "@/lib/queries/watched";
import type { AlertPreferences } from "@/lib/api/watched";

const ALERT_ROWS: Array<{ key: keyof AlertPreferences; label: string }> = [
  { key: "newListings", label: "New listings matching my saved areas" },
  { key: "priceChanges", label: "Price changes on saved homes" },
  { key: "statusUpdates", label: "Status updates (sold, de-listed)" },
  { key: "emailEnabled", label: "Send these by email" },
];

export function AlertsPanel({ overview }: WatchedPanelProps) {
  // Optimistic: the mutation patches the shared overview cache, which is what
  // `overview` renders from, and rolls it back if the save fails.
  const update = useUpdateAlertPrefs();
  const prefs = overview?.alertPreferences ?? null;
  const error = update.isError ? update.error.message : null;

  if (!prefs) return <PropertyGridSkeleton count={1} />;

  function toggle(key: keyof AlertPreferences, value: boolean) {
    update.mutate({ [key]: value });
  }

  return (
    <div className="rounded-surface border border-line bg-surface p-5">
      <h2 className="text-h3 text-ink">Alert preferences</h2>
      <p className="mt-1 text-caption text-ink-muted">
        Applies to the homes and areas you follow.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-caption text-negative">
          {error}
        </p>
      )}

      <ul className="mt-4 divide-y divide-line-soft">
        {ALERT_ROWS.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-4 py-3">
            <span id={`alert-${row.key}`} className="text-small text-ink">
              {row.label}
            </span>
            <Switch
              checked={prefs[row.key]}
              onCheckedChange={(value) => toggle(row.key, value)}
              aria-labelledby={`alert-${row.key}`}
              disabled={update.isPending}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
