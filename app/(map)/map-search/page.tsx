import type { Metadata } from "next";
import { Suspense } from "react";
import { MapSearchClient } from "@/components/map/MapSearchClient";

export const metadata: Metadata = {
  title: "Map search",
  description:
    "Search GTA listings visually: pan and zoom the map, or draw the exact area you want to live in.",
};

/**
 * The map reads its filters (and any drawn `poly` area) from the URL with
 * useSearchParams, which needs a Suspense boundary so the rest of the route can
 * still be prerendered. The fallback is null because MapSearchClient already
 * shows its own loading state while Leaflet loads.
 */
export default function MapSearchPage() {
  return (
    <Suspense fallback={null}>
      <MapSearchClient />
    </Suspense>
  );
}
