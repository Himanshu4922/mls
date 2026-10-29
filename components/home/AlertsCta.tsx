"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { MARKET_CITIES } from "@/lib/api/market";
import {
  ALERT_CADENCE_LABELS,
  ALERT_CADENCES,
  defaultSearchName,
  toSavedFilters,
  type AlertCadence,
} from "@/lib/api/savedSearches";
import { SEARCH_PROPERTY_TYPES } from "@/lib/types/domain";
import type { ListingQuery } from "@/lib/types/domain";
import { useFollowArea } from "@/lib/queries/watched";
import { useSavedSearch, useSavedSearchActions } from "@/lib/queries/savedSearches";

/**
 * Homepage Smart alerts — criteria form aligned with HomeAtlasUI.
 *
 * Area + property type + max price become a saved search with email cadence
 * (backed by mls-v2 saved-search alerts). The account email is used — no
 * duplicate email field. Area follow keeps the city on Watched Areas.
 */

const PRICE_OPTIONS = [
  { label: "No max", value: "" },
  { label: "$500K", value: "500000" },
  { label: "$750K", value: "750000" },
  { label: "$1M", value: "1000000" },
  { label: "$1.5M", value: "1500000" },
  { label: "$2M", value: "2000000" },
  { label: "$3M", value: "3000000" },
] as const;

export function AlertsCta({ content }: { content?: Record<string, unknown> }) {
  const { user, openAuth } = useAuth();
  const router = useRouter();
  const { saved } = useSavedSearch();
  const { save } = useSavedSearchActions();
  const followArea = useFollowArea();

  const [area, setArea] = useState<string>(MARKET_CITIES[0]);
  const [type, setType] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [alertCadence, setAlertCadence] = useState<AlertCadence>("daily");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const saving = save.isPending || followArea.isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!user) {
      openAuth("signup");
      return;
    }

    setError(null);
    const query: ListingQuery = {
      city: area,
      type: type || undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      status: "Active",
      transaction: "sale",
    };
    const filters = toSavedFilters(query);
    const name = defaultSearchName(query);

    try {
      await save.mutateAsync({
        name,
        filters,
        alertCadence,
        replaceId: saved?.id,
      });

      await followArea.mutateAsync({
        areaKey: area.toLowerCase(),
        areaLabel: area,
        areaKind: "community",
        follow: true,
      });

      setDone(true);
      router.refresh();
    } catch {
      setError("We couldn't save that alert. Please try again.");
    }
  }

  return (
    <section
      id="smart-alerts"
      className="scroll-mt-24 bg-navy py-12 sm:py-14 lg:py-16 lg:scroll-mt-28"
    >
      <div className="container-page">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="min-w-0">
            <p className="text-eyebrow uppercase text-white/70">
              {typeof content?.eyebrow === "string" && content.eyebrow.trim()
                ? content.eyebrow
                : "Stay ahead of the market"}
            </p>
            <h2 className="mt-3 text-h1 text-white">
              {typeof content?.title === "string" && content.title.trim()
                ? content.title
                : "Smart alerts"}
            </h2>
            <p className="mt-4 max-w-xl text-body text-white/80">
              {typeof content?.description === "string" && content.description.trim()
                ? content.description
                : "Tell us the area, home type and budget you care about. We'll email you when matching homes are listed — manage everything from your saved homes anytime."}
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-4">
              {[
                { label: "Area match", description: "Follow the city or community you care about" },
                { label: "Your criteria", description: "Type and price filters, not just a zip code" },
                { label: "Email cadence", description: "Daily or weekly — turn off whenever you like" },
              ].map((item) => (
                <li key={item.label} className="rounded-control bg-white/10 p-4">
                  <p className="text-small font-semibold text-white">{item.label}</p>
                  <p className="mt-1 text-caption text-white/70">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 rounded-surface bg-surface p-5 sm:p-6 lg:p-8">
            {done ? (
              <AlertCreated
                area={area}
                email={user?.email ?? null}
                onAddAnother={() => setDone(false)}
                onViewSaved={() => router.push("/watched?tab=alerts")}
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-h3 text-ink">Create a neighbourhood alert</h3>

                <div>
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

                <div>
                  <label
                    htmlFor="alert-type"
                    className="mb-1.5 block text-caption text-ink-muted"
                  >
                    Property type
                  </label>
                  <select
                    id="alert-type"
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                    className="w-full cursor-pointer rounded-control border border-line bg-surface px-4 py-3 text-small text-ink outline-none transition-colors focus:border-navy"
                  >
                    <option value="">Any type</option>
                    {SEARCH_PROPERTY_TYPES.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="alert-price"
                    className="mb-1.5 block text-caption text-ink-muted"
                  >
                    Max price
                  </label>
                  <select
                    id="alert-price"
                    value={priceMax}
                    onChange={(event) => setPriceMax(event.target.value)}
                    className="w-full cursor-pointer rounded-control border border-line bg-surface px-4 py-3 text-small text-ink outline-none transition-colors focus:border-navy"
                  >
                    {PRICE_OPTIONS.map((option) => (
                      <option key={option.label} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <fieldset>
                  <legend className="mb-2 text-caption text-ink-muted">Email me</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {ALERT_CADENCES.map((cadence) => (
                      <label
                        key={cadence}
                        className="flex cursor-pointer items-center gap-2 rounded-control border border-line px-3 py-3 transition-colors hover:border-navy has-[:checked]:border-navy has-[:checked]:bg-navy/5"
                      >
                        <input
                          type="radio"
                          name="alert-cadence"
                          value={cadence}
                          checked={alertCadence === cadence}
                          onChange={() => setAlertCadence(cadence)}
                          className="h-4 w-4 shrink-0 accent-navy"
                        />
                        <span className="text-caption text-ink">
                          {ALERT_CADENCE_LABELS[cadence].replace(/^Email me /i, "").replace(/^No emails$/i, "Off")}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {user?.email && (
                  <p className="text-caption text-ink-muted">
                    Alerts go to <span className="font-medium text-ink">{user.email}</span>
                  </p>
                )}

                {error && (
                  <p role="alert" className="text-caption text-negative">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  block
                  loading={saving}
                >
                  {user ? "Create alert" : "Sign up to create alerts"}
                </Button>

                <p className="text-center text-caption text-ink-subtle">
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
  email,
  onAddAnother,
  onViewSaved,
}: {
  area: string;
  email: string | null;
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
      <h3 className="mt-4 text-h3 text-ink">You&apos;re set for {area}</h3>
      <p className="mx-auto mt-2 max-w-sm text-small text-ink-muted">
        {email
          ? `We'll email ${email} when matching homes are listed.`
          : "We'll email you when matching homes are listed."}{" "}
        Manage this from your saved homes.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button type="button" variant="secondary" onClick={onAddAnother}>
          Adjust criteria
        </Button>
        <Button type="button" variant="primary" onClick={onViewSaved}>
          Manage alerts
        </Button>
      </div>
    </div>
  );
}
