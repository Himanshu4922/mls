"use client";

import {
  createContext,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import type { GeocodeResult } from "@/lib/api/geo";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { HttpError } from "@/lib/queries/fetcher";
import { PLACE_SEARCH_MIN_CHARS, usePlaceSearch } from "@/lib/queries/geo";
import { useCreateNearbyAlert } from "@/lib/queries/home";

/** Radius the alert and the live feed both use (backend default). */
export const NEIGHBOUR_RADIUS_KM = 1;

/* -------------------------------------------------------------------------- */
/* Picked point, shared with the activity feed beside the form                 */
/* -------------------------------------------------------------------------- */

export interface PickedPlace {
  label: string;
  lat: number;
  lng: number;
}

const PickedPlaceContext = createContext<{
  place: PickedPlace | null;
  setPlace: (place: PickedPlace | null) => void;
} | null>(null);

export function NeighbourPlaceProvider({ children }: { children: ReactNode }) {
  const [place, setPlace] = useState<PickedPlace | null>(null);
  const value = useMemo(() => ({ place, setPlace }), [place]);
  return <PickedPlaceContext.Provider value={value}>{children}</PickedPlaceContext.Provider>;
}

export function usePickedPlace() {
  const context = useContext(PickedPlaceContext);
  if (!context) throw new Error("usePickedPlace must be used within <NeighbourPlaceProvider>");
  return context;
}

/* -------------------------------------------------------------------------- */
/* Form                                                                        */
/* -------------------------------------------------------------------------- */

const NO_RESULTS: GeocodeResult[] = [];
const CONSENT_TEXT = "Email me when homes near this location are listed. Unsubscribe anytime.";

/**
 * "Set Neighbourhood Alert" → mls-v2 `POST /api/home/nearby-alerts/`.
 *
 * The visitor picks a geocoded place (a point, not free text). Alerts email the
 * account's own address, so guests sign up first; consent is then a separate,
 * deliberate tick — never assumed from the sign-up itself.
 */
export function NeighbourAlertForm() {
  const { user, openAuth } = useAuth();
  const { place, setPlace } = usePickedPlace();
  const create = useCreateNearbyAlert();
  const id = useId();
  const consentRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [savedFor, setSavedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debounced = useDebouncedValue(query, 300);
  const search = usePlaceSearch(place ? "" : debounced);
  const results = search.isEnabled ? (search.data ?? NO_RESULTS) : NO_RESULTS;
  const showList = open && !place && results.length > 0 && query.trim().length >= PLACE_SEARCH_MIN_CHARS;

  function pick(result: GeocodeResult) {
    setPlace({ label: result.label, lat: result.latitude, lng: result.longitude });
    setQuery(result.label);
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!place) {
      setError("Pick a location from the suggestions.");
      return;
    }
    if (!user) {
      // Consent can't ride along with sign-up; bring them back to the tick box.
      openAuth("signup", () => window.setTimeout(() => consentRef.current?.focus(), 0));
      return;
    }
    if (!consent) {
      setError("Please tick the box to confirm you'd like these emails.");
      return;
    }
    setError(null);
    try {
      await create.mutateAsync({
        label: place.label,
        latitude: place.lat,
        longitude: place.lng,
        radius_km: NEIGHBOUR_RADIUS_KM,
        consent: true,
      });
      setSavedFor(place.label);
    } catch (caught) {
      setError(
        caught instanceof HttpError
          ? (caught.fieldErrors.label ?? caught.message)
          : "Could not save your alert.",
      );
    }
  }

  if (savedFor) {
    return (
      <div role="status" className="rounded-surface border border-positive/30 bg-positive-soft p-5">
        <p className="text-h3 text-positive">Alert set</p>
        <p className="mt-1.5 text-small text-ink-muted">
          We&apos;ll email {user?.email ?? "you"} when homes within {NEIGHBOUR_RADIUS_KM} km of{" "}
          {savedFor} are listed. Every email has an unsubscribe link.
        </p>
        <button
          type="button"
          onClick={() => {
            setSavedFor(null);
            setPlace(null);
            setQuery("");
            setConsent(false);
          }}
          className="mt-3 text-small font-medium text-navy underline-offset-4 hover:underline"
        >
          Add another location
        </button>
      </div>
    );
  }

  const inputId = `${id}-location`;
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Your street, building or postal code" htmlFor={inputId} error={error}>
        <div className="relative">
          <Input
            id={inputId}
            name="location"
            role="combobox"
            aria-expanded={showList}
            aria-controls={`${id}-list`}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder="e.g. 44 Elm Street, Toronto or M4C"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              if (place) setPlace(null);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 150)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${inputId}-error` : undefined}
          />
          {showList && (
            <ul
              id={`${id}-list`}
              role="listbox"
              className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-control border border-line bg-surface shadow-pop"
            >
              {results.map((result, index) => (
                <li key={`${result.label}-${index}`} role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pick(result)}
                    className="block w-full px-4 py-2.5 text-left text-caption text-ink-soft transition-colors hover:bg-surface-alt"
                  >
                    {result.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>

      {user && (
        <label htmlFor={`${id}-consent`} className="flex cursor-pointer items-start gap-2">
          <input
            ref={consentRef}
            id={`${id}-consent`}
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-navy"
          />
          <span className="text-caption text-ink-muted">{CONSENT_TEXT}</span>
        </label>
      )}

      <Button type="submit" variant="dark" size="lg" loading={create.isPending}>
        {user ? "Set Neighbourhood Alert" : "Sign up to set alert"}
      </Button>
    </form>
  );
}
