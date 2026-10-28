/**
 * Map + Street View for a preconstruction project.
 *
 * Uses OpenStreetMap embed (no API key) for the pin, with outbound links to
 * Google Maps and Street View when coordinates are present.
 */

export function PreconLocationMap({
  latitude,
  longitude,
  address,
  label,
}: {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  label?: string | null;
}) {
  if (latitude === null || longitude === null) return null;

  const pad = 0.005;
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - pad},${latitude - pad},${longitude + pad},${latitude + pad}&layer=mapnik&marker=${latitude},${longitude}`;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  const streetViewHref = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${latitude},${longitude}`;
  const caption = address || label || "Project location";

  return (
    <div className="overflow-hidden rounded-surface border border-line bg-surface">
      <div className="relative aspect-[16/9] w-full bg-surface-alt sm:aspect-[2/1]">
        <iframe
          title={`Map of ${caption}`}
          src={embed}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
        <p className="min-w-0 truncate text-small text-ink-muted">{caption}</p>
        <div className="flex shrink-0 gap-2">
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-control border border-line bg-surface-alt px-3 py-1.5 text-caption font-medium text-ink transition-colors hover:border-ink/30"
          >
            Google Maps
          </a>
          <a
            href={streetViewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-control border border-line bg-surface-alt px-3 py-1.5 text-caption font-medium text-ink transition-colors hover:border-ink/30"
          >
            Street View
          </a>
        </div>
      </div>
    </div>
  );
}
