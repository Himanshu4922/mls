"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { MARKET_CITIES } from "@/lib/api/market";
import { useFollowArea, useUpdateAlertPrefs } from "@/lib/queries/watched";

/**
 * Homepage alerts CTA.
 *
 * Backed by real endpoints: `watched/areas/follow/` records the area and
 * `watched/alerts/preferences/` stores which alert types fire.
 *
 * The reference's version was a criteria form — area + property type + max price
 * + email — implying a per-search subscription. `UserAlertPreference` stores only
 * global booleans and there is no saved-search model (`SearchEvent` is analytics,
 * not subscribable), so a type/price field here would be silently discarded and
 * the email field would duplicate the account address. Both are omitted rather
 * than faked; see API_GAPS G16 for the criteria-alert contract that would let the
 * full form work.
 */

const ALERT_TYPES = [
  {
    key: "newListings",
    label: "New listings",
    description: "Be first to see new properties in this area",
  },
  {
    key: "priceChanges",
    label: "Price drops",
    description: "Get notified when asking prices fall",
  },
  {
    key: "statusUpdates",
    label: "Status updates",
    description: "Know when a home sells or is de-listed",
  },
] as const;

type AlertKey = (typeof ALERT_TYPES)[number]["key"];

export function AlertsCta() {
  const { user, openAuth } = useAuth();
  const router = useRouter();

  const [area, setArea] = useState<string>(MARKET_CITIES[0]);
  const [enabled, setEnabled] = useState<Record<AlertKey, boolean>>({
    newListings: true,
    priceChanges: true,
    statusUpdates: false,
  });
  const followArea = useFollowArea();
  const updatePrefs = useUpdateAlertPrefs();
  const saving = followArea.isPending || updatePrefs.isPending;
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    // Signed-out visitors get the auth dialog rather than a form that fails on
    // submit — the alert is stored against the account.
    if (!user) {
      openAuth("signup");
      return;
    }

    setError(null);
    try {
      // Both write the shared overview cache optimistically (and roll back on
      // failure), so /watched and the Watched menu reflect the new area.
      await followArea.mutateAsync({
        areaKey: area.toLowerCase(),
        areaLabel: area,
        // Always "community": the backend upserts on area_key, so differing
        // kinds made a city flip between the Watched "Areas" and
        // "Communities" tabs.
        areaKind: "community",
        follow: true,
      });

      await updatePrefs.mutateAsync({
        newListings: enabled.newListings,
        priceChanges: enabled.priceChanges,
        statusUpdates: enabled.statusUpdates,
        emailEnabled: true,
      });

      setDone(true);
      // Refresh so server-rendered views reflect the new area on next visit.
      router.refresh();
    } catch {
      setError("We couldn't save that alert. Please try again.");
    }
  }

  return (
    <section className="bg-navy py-14 sm:py-16">
      <div className="container-page">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-eyebrow uppercase text-white/70">
              Stay ahead of the market
            </p>
            <h2 className="mt-3 text-h1 text-white">Smart alerts</h2>
            <p className="mt-4 max-w-xl text-body text-white/80">
              Follow an area and we&apos;ll tell you when homes are listed, when prices
              move, and when they sell. Manage everything from your saved homes at any
              time.
            </p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {ALERT_TYPES.map((item) => (
                <li key={item.key} className="rounded-control bg-white/10 p-4">
                  <p className="text-small font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-caption text-white/70">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-surface bg-surface p-6 sm:p-8">
            {done ? (
              <AlertCreated
                area={area}
                onAddAnother={() => setDone(false)}
                onViewSaved={() => router.push("/watched")}
              />
            ) : (
              <form onSubmit={handleSubmit}>
                <h3 className="text-h3 text-ink">Create an area alert</h3>

                <div className="mt-5">
                  <label
                    htmlFor="alert-area"
                    className="mb-1.5 block text-caption text-ink-muted"
                  >
                    Area
                  </label>
                  <select
                    id="alert-area"
                    value={area}
                    onChange={(event) => setArea(event.target.value)}
                    className="w-full cursor-pointer rounded-control border border-line bg-surface px-4 py-3 text-small text-ink outline-none transition-colors focus:border-navy"
                  >
                    {MARKET_CITIES.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <fieldset className="mt-5">
                  <legend className="mb-2 text-caption text-ink-muted">
                    Tell me about
                  </legend>
                  <div className="space-y-2">
                    {ALERT_TYPES.map((item) => (
                      <label
                        key={item.key}
                        className="flex cursor-pointer items-center gap-3 rounded-control border border-line px-4 py-3 transition-colors hover:border-navy"
                      >
                        <input
                          type="checkbox"
                          checked={enabled[item.key]}
                          onChange={() =>
                            setEnabled((prev) => ({
                              ...prev,
                              [item.key]: !prev[item.key],
                            }))
                          }
                          className="h-4 w-4 shrink-0 accent-navy"
                        />
                        <span className="text-small text-ink">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {error && (
                  <p role="alert" className="mt-4 text-caption text-negative">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  block
                  className="mt-5"
                  loading={saving}
                >
                  {user ? "Create alert" : "Sign up to create alerts"}
                </Button>

                <p className="mt-3 text-center text-caption text-ink-subtle">
                  {user
                    ? "Change or turn these off any time from your saved homes."
                    : "Free account. Change or turn alerts off at any time."}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function AlertCreated({
  area,
  onAddAnother,
  onViewSaved,
}: {
  area: string;
  onAddAnother: () => void;
  onViewSaved: () => void;
}) {
  return (
    <div className="py-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-positive-soft">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="m5 13 4 4L19 7"
            stroke="var(--color-positive)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-h3 text-ink">You&apos;re following {area}</h3>
      <p className="mx-auto mt-2 max-w-sm text-small text-ink-muted">
        We&apos;ll email you as homes are listed and prices change. Manage this from
        your saved homes.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button type="button" variant="secondary" onClick={onAddAnother}>
          Follow another area
        </Button>
        <Button type="button" variant="primary" onClick={onViewSaved}>
          View saved homes
        </Button>
      </div>
    </div>
  );
}
