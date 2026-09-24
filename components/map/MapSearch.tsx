"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from "react-leaflet";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DrawHint, MapControls } from "@/components/map/MapControls";
import { SaveSearchButton } from "@/components/search/SaveSearchButton";
import { describeCriteria } from "@/lib/api/savedSearches";
import {
  getBoundingBoxFromPoints,
  serializePolygonParam,
  type LatLngPoint,
} from "@/lib/map/polygon";
import { useMapDrawing, type DrawMode } from "@/lib/map/useMapDrawing";
import {
  buildListingHref,
  buildListingQueryString,
  hasActiveFilters,
  parseListingSearch,
} from "@/lib/utils/searchParams";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "@/components/ui/Button";
import { EMPTY, formatPriceCompact, formatNumber } from "@/lib/utils/format";
import type { PropertySummary } from "@/lib/types/domain";
import type { GeocodeResult, MapCluster } from "@/lib/api/geo";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { PLACE_SEARCH_MIN_CHARS, usePlaceSearch } from "@/lib/queries/geo";
import {
  isClusterReply,
  mapAggregatesQuery,
  mapListingsQuery,
  mapQueryView,
  type MapViewport,
} from "@/lib/queries/map";

/** Downtown Toronto; the GTA fits comfortably at this zoom. */
const DEFAULT_CENTER: [number, number] = [43.6532, -79.3832];
const DEFAULT_ZOOM = 11;

/**
 * Price-label marker.
 *
 * A divIcon keeps the label in the DOM, so it inherits our type styles and is
 * readable by assistive tech, unlike a rendered-image pin.
 */
function priceIcon(property: PropertySummary, active: boolean) {
  const label = property.price === null ? EMPTY : formatPriceCompact(property.price);
  return L.divIcon({
    className: "",
    html: `<span class="inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-colors ${
      active
        ? "bg-[var(--color-gold)] border-[var(--color-gold)] text-[var(--color-ink)]"
        : "bg-white border-[var(--color-line)] text-[var(--color-ink)]"
    }">${label}</span>`,
    iconSize: [0, 0],
    iconAnchor: [26, 14],
  });
}

/** Cluster bubble sized by listing count, for low/mid zoom levels. */
function clusterIcon(count: number) {
  const size = count > 500 ? 56 : count > 100 ? 48 : count > 25 ? 42 : 36;
  return L.divIcon({
    className: "",
    html: `<span style="width:${size}px;height:${size}px" class="flex items-center justify-center rounded-full bg-[var(--color-navy)] text-white text-[11px] font-semibold shadow-md ring-4 ring-[var(--color-navy)]/20">${
      count > 999 ? `${Math.round(count / 1000)}k` : count
    }</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface Bounds {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

/** Stand-in key while no viewport is known; its queries are disabled. */
const EMPTY_VIEW = mapQueryView({
  viewport: { latMin: 0, latMax: 0, lngMin: 0, lngMax: 0, zoom: 0 },
  filters: "",
  poly: "",
})!;
const NO_CLUSTERS: MapCluster[] = [];
const NO_PROPERTIES: PropertySummary[] = [];

/** Reports viewport changes so the parent can refetch for the visible area. */
function BoundsWatcher({
  onChange,
}: {
  onChange: (bounds: Bounds, zoom: number) => void;
}) {
  const emit = useCallback(
    (map: L.Map) => {
      const b = map.getBounds();
      onChange(
        {
          latMin: b.getSouth(),
          latMax: b.getNorth(),
          lngMin: b.getWest(),
          lngMax: b.getEast(),
        },
        map.getZoom(),
      );
    },
    [onChange],
  );

  const map = useMapEvents({
    moveend: () => emit(map),
    zoomend: () => emit(map),
  });

  // Emit once on mount for the initial viewport.
  useEffect(() => {
    emit(map);
  }, [map, emit]);

  return null;
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [target, map]);
  return null;
}

/** The committed drawn area, framed in view whenever it changes. */
function DrawnArea({ points }: { points: LatLngPoint[] }) {
  const map = useMap();
  const key = serializePolygonParam(points);
  useEffect(() => {
    const box = getBoundingBoxFromPoints(points);
    if (!box) return;
    map.fitBounds(
      [
        [box.latMin, box.lngMin],
        [box.latMax, box.lngMax],
      ],
      { padding: [40, 40], maxZoom: 16 },
    );
    // Keyed on the serialised shape, not the array identity, so a re-render
    // with the same area never yanks the viewport back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  return (
    <Polygon
      positions={points.map((p) => [p.lat, p.lng] as [number, number])}
      pathOptions={{ color: "#1b2e4b", weight: 2, fillColor: "#1b2e4b", fillOpacity: 0.08 }}
      interactive={false}
    />
  );
}

export function MapSearch() {
  const params = useSearchParams();
  const [map, setMap] = useState<L.Map | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [viewport, setViewport] = useState<MapViewport | null>(null);
  // Debounce viewport changes so a drag doesn't fire a request per frame.
  const debouncedViewport = useDebouncedValue(viewport, 350);

  /*
   * The URL is the source of truth, shared with /listings: the same filter
   * params, plus `poly` for a drawn area. `filterQs` is everything except the
   * area, forwarded to /api/properties/map so the map honours the filters.
   */
  const query = useMemo(() => parseListingSearch(params), [params]);
  const polygon = query.polygon ?? null;
  const polyKey = serializePolygonParam(polygon);
  const filterQuery = useMemo(
    () => ({ ...query, polygon: undefined, view: undefined, page: undefined }),
    [query],
  );
  const filterQs = buildListingQueryString(filterQuery);
  // H3 aggregates count the whole catalogue — they cannot apply listing
  // filters — so with any filter set we show filtered pins instead of
  // clusters that would overstate what matches.
  const filtered = hasActiveFilters(filterQuery) || Boolean(query.status);
  const criteria = describeCriteria(filterQuery);

  /** Writes the query to the URL without a server round-trip. */
  const pushQuery = useCallback((next: typeof query) => {
    const qs = buildListingQueryString({ ...next, view: undefined, page: undefined });
    // Next 16 syncs native pushState with useSearchParams, and it gives the
    // back button a step per drawn area.
    window.history.pushState(null, "", qs ? `/map-search?${qs}` : "/map-search");
  }, []);

  const handleBounds = useCallback((bounds: Bounds, zoom: number) => {
    setViewport({ ...bounds, zoom });
  }, []);

  /*
   * A drawn area ignores the viewport (see `mapQueryView`); otherwise the
   * debounced viewport plus filters is the key, so a filter change refetches
   * at once for the current view.
   */
  const view = mapQueryView({ viewport: debouncedViewport, filters: filterQs, poly: polyKey });

  /**
   * Zoomed out and unfiltered, the backend returns H3 cluster counts instead of
   * rows — drawing thousands of pins would be unreadable and slow. It tells us
   * which mode applies via `mode`, and we only fetch rows in marker mode.
   */
  const aggregatesEnabled = view !== null && !polyKey && !filtered;
  const aggregates = useQuery({
    ...mapAggregatesQuery(view ?? EMPTY_VIEW),
    enabled: aggregatesEnabled,
  });
  // A failed aggregates call falls back to marker mode so the map still works.
  const aggregatesSettled = aggregates.isError || (aggregates.isFetched && !aggregates.isPlaceholderData);
  const clusterMode = aggregatesEnabled && !aggregates.isError && isClusterReply(aggregates.data);

  const listingsEnabled =
    view !== null && (!aggregatesEnabled || (aggregatesSettled && !clusterMode));
  const listings = useQuery({
    ...mapListingsQuery(view ?? EMPTY_VIEW),
    enabled: listingsEnabled,
  });

  const clustered = clusterMode;
  const clusters = clustered ? (aggregates.data?.clusters ?? []) : NO_CLUSTERS;
  const properties = clustered ? NO_PROPERTIES : (listings.data?.items ?? NO_PROPERTIES);
  const total = clustered ? null : (listings.data?.total ?? null);
  const error =
    listingsEnabled && listings.isError ? "Could not load listings for this area." : null;
  // Before the first viewport is reported there is nothing in flight, but the
  // page is still loading — don't flash the empty state.
  const loading =
    view === null ||
    aggregates.isFetching ||
    listings.isFetching ||
    (aggregatesEnabled && !aggregatesSettled);

  const drawing = useMapDrawing(map, (points) => pushQuery({ ...query, polygon: points }));

  const toggleDraw = (mode: DrawMode) => {
    if (drawing.mode === mode) drawing.cancel();
    else drawing.start(mode);
  };

  const clearShape = () => {
    drawing.cancel();
    pushQuery({ ...query, polygon: undefined });
  };

  const mappable = useMemo(
    () => properties.filter((p) => p.latitude !== null && p.longitude !== null),
    [properties],
  );

  const listingsHref = buildListingHref({ ...query, view: undefined });
  const countLabel = (() => {
    if (error) return error;
    if (clustered) {
      return `${clusters.reduce((sum, cell) => sum + cell.count, 0).toLocaleString("en-CA")} homes — zoom in to see them`;
    }
    const shown = properties.length;
    const all = total ?? shown;
    const where = polygon ? "in your drawn area" : "in this area";
    const noun = all === 1 ? "home" : "homes";
    return all > shown
      ? `Showing ${shown} of ${all.toLocaleString("en-CA")} ${noun} ${where}`
      : `${shown} ${noun} ${where}`;
  })();

  return (
    <div className="flex h-[calc(100vh-72px)] flex-col lg:flex-row">
      <div className="relative h-1/2 w-full lg:h-full lg:w-3/5">
        <MapContainer
          ref={setMap}
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          zoomControl={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <BoundsWatcher onChange={handleBounds} />
          <FlyTo target={flyTarget} />
          {polygon && <DrawnArea points={polygon} />}

          {/* Markers swallow clicks, so while drawing they are remounted as
              non-interactive — otherwise a tap on a pin would not add a point. */}
          {clustered
            ? clusters.map((cell, index) => (
                <Marker
                  key={`cluster-${index}-${drawing.mode ?? "idle"}`}
                  position={[cell.latitude, cell.longitude]}
                  icon={clusterIcon(cell.count)}
                  interactive={!drawing.mode}
                  eventHandlers={{
                    // Clicking a cluster zooms toward it until markers appear.
                    click: () => setFlyTarget([cell.latitude, cell.longitude]),
                  }}
                />
              ))
            : mappable.map((property) => (
                <Marker
                  key={`${property.id}-${drawing.mode ?? "idle"}`}
                  position={[property.latitude as number, property.longitude as number]}
                  icon={priceIcon(property, property.id === activeId)}
                  interactive={!drawing.mode}
                  eventHandlers={{
                    click: () => setActiveId(property.id),
                  }}
                />
              ))}
        </MapContainer>

        <PlaceSearch onSelect={(result) => setFlyTarget([result.latitude, result.longitude])} />

        <MapControls
          drawMode={drawing.mode}
          hasShape={Boolean(polygon)}
          onZoomIn={() => map?.zoomIn()}
          onZoomOut={() => map?.zoomOut()}
          onDraw={toggleDraw}
          onClear={clearShape}
        />

        {drawing.mode && (
          <DrawHint
            mode={drawing.mode}
            pointCount={drawing.pointCount}
            onFinish={drawing.finish}
            onCancel={drawing.cancel}
          />
        )}

        {loading && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-[400] flex -translate-x-1/2 items-center gap-2 rounded-full bg-surface px-4 py-2 shadow-pop">
            <Spinner className="text-navy" />
            <span className="text-caption text-ink">Loading listings…</span>
          </div>
        )}
      </div>

      <aside className="flex h-1/2 w-full flex-col overflow-hidden border-t border-line lg:h-full lg:w-2/5 lg:border-l lg:border-t-0">
        <header className="border-b border-line px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-h3 text-ink">Map search</h1>
            <div className="flex items-center gap-2">
              {/* Return path for the listings view toggle, carrying the search. */}
              <Link
                href={listingsHref}
                className="flex h-11 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-small font-medium text-ink transition-colors hover:border-navy hover:text-navy"
              >
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M14.25 9H3.75M9 14.25 3.75 9 9 3.75"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                  />
                </svg>
                Listings
              </Link>
              <SaveSearchButton query={query} />
            </div>
          </div>
          <p className="mt-1 text-caption text-ink-muted" aria-live="polite">
            {countLabel}
          </p>
          {criteria.length > 0 && (
            <p className="mt-1 truncate text-caption text-ink-muted">
              Filters: <span className="text-ink">{criteria.join(" · ")}</span>{" "}
              <Link href={listingsHref} className="font-medium text-navy underline underline-offset-2">
                Edit
              </Link>
            </p>
          )}
        </header>

        <ul className="flex-1 overflow-y-auto">
          {properties.length === 0 && !loading && (
            <li className="px-5 py-10 text-center text-small text-ink-muted">
              {clustered
                ? "Zoom in to list individual homes."
                : polygon
                  ? "No listings in your drawn area. Try a bigger area or fewer filters."
                  : "No listings in view. Try zooming out or panning to another area."}
            </li>
          )}

          {properties.map((property) => (
            <li key={property.id}>
              <div
                onMouseEnter={() => setActiveId(property.id)}
                onFocus={() => setActiveId(property.id)}
                className={cn(
                  "flex gap-3 border-b border-line-soft px-5 py-4 transition-colors",
                  property.id === activeId ? "bg-surface-alt" : "hover:bg-surface-alt/60",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-small font-semibold text-ink">
                    {property.price === null ? EMPTY : formatPriceCompact(property.price)}
                  </p>
                  <Link
                    href={`/property/${encodeURIComponent(property.id)}`}
                    className="mt-0.5 block truncate text-small text-ink hover:text-gold"
                  >
                    {property.address}
                  </Link>
                  <p className="mt-0.5 truncate text-caption text-ink-muted">
                    {[property.neighbourhood, property.community].filter(Boolean).join(", ") || EMPTY}
                  </p>
                  <p className="mt-1 text-caption text-ink-muted">
                    {property.beds === null ? EMPTY : formatNumber(property.beds)} bd ·{" "}
                    {property.baths === null ? EMPTY : formatNumber(property.baths)} ba
                    {property.sqft ? ` · ${formatNumber(property.sqft)} sq ft` : ""}
                  </p>
                </div>

                {property.latitude !== null && property.longitude !== null && (
                  <button
                    type="button"
                    onClick={() =>
                      setFlyTarget([property.latitude as number, property.longitude as number])
                    }
                    className="shrink-0 self-start rounded-control border border-line px-2.5 py-1 text-caption text-ink-muted transition-colors hover:border-navy hover:text-ink"
                  >
                    Show
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

/**
 * Place search overlaid on the map, backed by `locations/geocode/`.
 * Selecting a result flies the viewport there; the bounds watcher then reloads.
 */
function PlaceSearch({ onSelect }: { onSelect: (result: GeocodeResult) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 300);
  const search = usePlaceSearch(debouncedQuery);
  // Too short to search: no suggestions, even if an older set is cached.
  const results = search.isEnabled ? (search.data ?? NO_RESULTS) : NO_RESULTS;

  // Open the list when a fresh set of suggestions arrives (adjusting state
  // during render rather than in an effect).
  const [shownData, setShownData] = useState(search.data);
  if (search.data !== shownData) {
    setShownData(search.data);
    if (!search.isPlaceholderData && search.data) setOpen(search.data.length > 0);
  }

  return (
    <div className="absolute left-4 top-4 z-[400] w-[min(320px,calc(100%-2rem))]">
      <label htmlFor="map-place-search" className="sr-only">
        Search for a city or neighbourhood
      </label>
      <input
        id="map-place-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search a city or neighbourhood…"
        className="h-11 w-full rounded-control border border-line bg-surface px-4 text-small text-ink shadow-card outline-none placeholder:text-ink-subtle focus:border-navy"
      />

      {open && results.length > 0 && query.trim().length >= PLACE_SEARCH_MIN_CHARS && (
        <ul className="mt-1 max-h-60 overflow-auto rounded-control border border-line bg-surface shadow-pop">
          {results.map((result, index) => (
            <li key={`${result.label}-${index}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(result);
                  setQuery(result.label);
                  setOpen(false);
                }}
                className="block w-full px-4 py-2.5 text-left text-caption text-ink-soft transition-colors hover:bg-surface-alt"
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const NO_RESULTS: GeocodeResult[] = [];
