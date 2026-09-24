"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Field";
import { SEARCH_PROPERTY_TYPES } from "@/lib/types/domain";
import { looksLikePostal, parsePostalList } from "@/lib/utils/postal";

/** Listing intent — maps onto the backend's status and Buy/Rent split. */
const INTENTS = [
  { value: "buy", label: "Buy", status: "Active" },
  { value: "rent", label: "Rent", tx: "rent" },
  { value: "sold", label: "Sold", status: "Sold" },
] as const;

const SALE_PRICES = [
  { value: "", label: "Price" },
  { value: "0-500000", label: "Under $500K" },
  { value: "500000-800000", label: "$500K – $800K" },
  { value: "800000-1200000", label: "$800K – $1.2M" },
  { value: "1200000-2000000", label: "$1.2M – $2M" },
  { value: "2000000-", label: "$2M+" },
];

/** Rent filters on the monthly lease, so sale-price bands would match nothing. */
const RENT_PRICES = [
  { value: "", label: "Price" },
  { value: "0-2000", label: "Under $2,000/mo" },
  { value: "2000-3000", label: "$2,000 – $3,000/mo" },
  { value: "3000-4000", label: "$3,000 – $4,000/mo" },
  { value: "4000-", label: "$4,000+/mo" },
];

const COUNTS = [1, 2, 3, 4, 5];

const POPULAR_SEARCHES: Array<{ label: string; params: Record<string, string> }> = [
  { label: "Condos under $800K", params: { type: "Condo", priceMax: "800000" } },
  { label: "Family homes in Mississauga", params: { city: "Mississauga", beds: "3" } },
  { label: "Townhomes in Vaughan", params: { city: "Vaughan", type: "Townhome" } },
  { label: "Rentals in Downtown Toronto", params: { city: "Toronto", tx: "rent" } },
];

/**
 * Hero search widget.
 *
 * Every control writes a real query param that `parseListingParams` reads, so
 * the resulting /listings URL is shareable and the back button behaves. The
 * reference's equivalent filter buttons were decorative — these are wired.
 */
export function HeroSearch() {
  const router = useRouter();
  const [intent, setIntent] = useState<(typeof INTENTS)[number]["value"]>("buy");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [price, setPrice] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");

  function buildHref() {
    const active = INTENTS.find((item) => item.value === intent)!;
    const params = new URLSearchParams();

    // A postal code typed here becomes the exact `postal` filter rather than a
    // free-text search, which would only match it inside address strings.
    const term = query.trim();
    if (term && looksLikePostal(term)) params.set("postal", parsePostalList(term).codes.join(","));
    else if (term) params.set("q", term);
    if ("status" in active && active.status) params.set("status", active.status);
    if ("tx" in active && active.tx) params.set("tx", active.tx);
    if (type) params.set("type", type);

    if (price) {
      const [min, max] = price.split("-");
      if (min) params.set("priceMin", min);
      if (max) params.set("priceMax", max);
    }
    if (beds) params.set("beds", beds);
    if (baths) params.set("baths", baths);

    const qs = params.toString();
    return qs ? `/listings?${qs}` : "/listings";
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    router.push(buildHref());
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[540px] rounded-surface bg-surface p-6 shadow-pop sm:p-7"
    >
      <div className="mb-4">
        <p className="text-small font-semibold text-ink">Search listings</p>
        <p className="text-caption text-ink-muted">
          Filter live MLS® data by location, price, beds and baths
        </p>
      </div>

      <SearchInput
        size="lg"
        label="Search by city, neighbourhood, postal code or MLS® number"
        value={query}
        onValueChange={setQuery}
        placeholder="City, neighbourhood, postal code (L7A) or MLS®"
        className="mb-4"
      />

      {/* Filter row — three across, matching the reference grid. */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <HeroSelect
          label="Listing type"
          value={intent}
          onChange={(value) => {
            // The price bands differ between Buy and Rent, so a band picked
            // for one would be meaningless for the other.
            if ((value === "rent") !== (intent === "rent")) setPrice("");
            setIntent(value as (typeof INTENTS)[number]["value"]);
          }}
        >
          {INTENTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </HeroSelect>

        <HeroSelect label="Property type" value={type} onChange={setType}>
          <option value="">Property Type</option>
          {SEARCH_PROPERTY_TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </HeroSelect>

        <HeroSelect label="Price range" value={price} onChange={setPrice}>
          {(intent === "rent" ? RENT_PRICES : SALE_PRICES).map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </HeroSelect>

        <HeroSelect label="Bedrooms" value={beds} onChange={setBeds}>
          <option value="">Bedrooms</option>
          {COUNTS.map((count) => (
            <option key={count} value={count}>
              {count}+ beds
            </option>
          ))}
        </HeroSelect>

        <HeroSelect label="Bathrooms" value={baths} onChange={setBaths}>
          <option value="">Bathrooms</option>
          {COUNTS.map((count) => (
            <option key={count} value={count}>
              {count}+ baths
            </option>
          ))}
        </HeroSelect>

        {/* The full filter set lives on /listings; this carries the current
            selections over rather than dropping them. */}
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.push(buildHref())}
          className="h-11 justify-between rounded-control px-3.5 text-small font-normal"
        >
          More Filters
          <Chevron />
        </Button>
      </div>

      <Button type="submit" variant="dark" size="lg" block>
        Search Properties
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M3.75 9H14.25M9 3.75L14.25 9L9 14.25"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Button>

      <div className="mt-5 border-t border-line pt-5">
        <p className="mb-3 text-eyebrow uppercase text-ink-muted">Popular searches</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SEARCHES.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() =>
                router.push(`/listings?${new URLSearchParams(item.params).toString()}`)
              }
              className="rounded-full border border-line px-3 py-2 text-caption text-ink transition-colors hover:border-gold hover:text-gold-deep"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

/**
 * The reference drew these as buttons with a chevron. A native select keeps the
 * same silhouette while staying keyboard- and screen-reader-operable.
 */
function HeroSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full cursor-pointer appearance-none rounded-control border border-line bg-surface px-3.5 pr-8 text-small text-ink transition-colors hover:border-gold focus:border-navy focus:outline-none"
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted">
        <Chevron />
      </span>
    </div>
  );
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.33"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
