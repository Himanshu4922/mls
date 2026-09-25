"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LatLng = [number, number];
export type LocateStatus = "idle" | "locating" | "located" | "denied" | "unavailable";

/** Rough Ontario bounding box: the only area this site has listings for. */
const ONTARIO = { latMin: 41.6, latMax: 57, lngMin: -95.2, lngMax: -74.3 };

export function isInOntario([lat, lng]: LatLng): boolean {
  return lat >= ONTARIO.latMin && lat <= ONTARIO.latMax && lng >= ONTARIO.lngMin && lng <= ONTARIO.lngMax;
}

/**
 * The visitor's location for the map (scope #18: "open the map as per their
 * current location").
 *
 * `locate()` is for the button and may show the browser's permission prompt.
 * `autoCenter` only acts when permission was ALREADY granted, so a first visit
 * never opens with a popup, and only inside Ontario, where there are listings
 * to show. `onLocated` receives the point and whether this was the automatic
 * run.
 */
export function useUserLocation({
  autoCenter,
  onLocated,
}: {
  autoCenter: boolean;
  onLocated: (point: LatLng, auto: boolean) => void;
}) {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<LocateStatus>("idle");
  // Latest callback without re-running the mount effect when it changes.
  const onLocatedRef = useRef(onLocated);
  useEffect(() => {
    onLocatedRef.current = onLocated;
  }, [onLocated]);

  const request = useCallback((auto: boolean) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      if (!auto) setStatus("unavailable");
      return;
    }
    if (!auto) setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const point: LatLng = [result.coords.latitude, result.coords.longitude];
        if (auto && !isInOntario(point)) return;
        setPosition(point);
        setStatus("located");
        onLocatedRef.current(point, auto);
      },
      (error) => {
        if (auto) return;
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  const autoRef = useRef(autoCenter);
  useEffect(() => {
    if (!autoRef.current || typeof navigator === "undefined" || !navigator.permissions) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((permission) => {
        if (!cancelled && permission.state === "granted") request(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [request]);

  const locate = useCallback(() => request(false), [request]);

  return { position, status, locate };
}
