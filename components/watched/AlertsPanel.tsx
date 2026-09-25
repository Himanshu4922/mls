"use client";

import { PropertyGridSkeleton } from "@/components/ui/States";
import { Switch } from "@/components/ui/Switch";
import type { WatchedPanelProps } from "@/components/watched/types";
import { useUpdateAlertPrefs } from "@/lib/queries/watched";
import type { AlertPreferences } from "@/lib/api/watched";

type AlertRow = { key: keyof AlertPreferences; label: string; hint?: string };

/*
 * Grouped like HouseSigma's notification menu (scope #5b). Every row maps to
 * a preference the daily digest actually reads (mls-v2
 * newsletter_notifications.py). Two stored preferences are deliberately not
 * shown: `newListings` is read by nothing, and `pushWatchedProperty` waits
 * for real push notifications — a toggle that does nothing would mislead.
 */
const NEW_LISTING_ROWS: AlertRow[] = [
  { key: "emailRecommend", label: "Recommended homes", hint: "New listings picked from what you browse and save" },
  { key: "emailWatchedProperty", label: "Similar to homes I've saved" },
  { key: "emailWatchedCommunity", label: "In communities I watch" },
  { key: "emailWatchedArea", label: "In areas I watch" },
];

const SAVED_HOME_ROWS: AlertRow[] = [
  { key: "priceChanges", label: "Price changes" },
  { key: "statusUpdates", label: "Status changes", hint: "Sold, de-listed or back on the market" },
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

  const emailOff = !prefs.emailEnabled;

  return (
    <div className="rounded-surface border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-h3 text-ink">Email notifications</h2>
          <p id="alert-emailEnabled" className="mt-1 text-caption text-ink-muted">
            One daily email with everything you choose below.
          </p>
        </div>
        <Switch
          checked={prefs.emailEnabled}
          onCheckedChange={(value) => toggle("emailEnabled", value)}
          aria-labelledby="alert-emailEnabled"
          disabled={update.isPending}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-caption text-negative">
          {error}
        </p>
      )}

      <fieldset disabled={emailOff} className={emailOff ? "opacity-50" : undefined}>
        <AlertGroup title="New listings" rows={NEW_LISTING_ROWS} prefs={prefs} onToggle={toggle} pending={update.isPending || emailOff} />
        <AlertGroup title="Homes I've saved" rows={SAVED_HOME_ROWS} prefs={prefs} onToggle={toggle} pending={update.isPending || emailOff} />
      </fieldset>

      <p className="mt-5 rounded-control bg-surface-alt px-3 py-2 text-caption text-ink-muted">
        {emailOff
          ? "Email notifications are off. Turn them on to choose what's included."
          : "Emails go to your account email address. Saved-search alerts are set on each saved search."}
      </p>
    </div>
  );
}

function AlertGroup({
  title,
  rows,
  prefs,
  onToggle,
  pending,
}: {
  title: string;
  rows: AlertRow[];
  prefs: AlertPreferences;
  onToggle: (key: keyof AlertPreferences, value: boolean) => void;
  pending: boolean;
}) {
  return (
    <div className="mt-5">
      <h3 className="text-caption font-semibold uppercase tracking-wide text-ink-muted">{title}</h3>
      <ul className="mt-1 divide-y divide-line-soft">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-4 py-3">
            <span id={`alert-${row.key}`} className="text-small text-ink">
              {row.label}
              {row.hint && <span className="block text-caption text-ink-muted">{row.hint}</span>}
            </span>
            <Switch
              checked={prefs[row.key]}
              onCheckedChange={(value) => onToggle(row.key, value)}
              aria-labelledby={`alert-${row.key}`}
              disabled={pending}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
