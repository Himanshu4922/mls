"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { MAX_POLYGON_POINTS } from "@/lib/map/polygon";
import type { DrawMode } from "@/lib/map/useMapDrawing";

/**
 * Vertical map control stack (HomeAtlasUI MapSearchPage L255-265): zoom, then a
 * gap, then the area tools. Leaflet's own zoom control is turned off so there
 * is one consistent stack instead of two styles of button on one map.
 */
export function MapControls({
  drawMode,
  hasShape,
  locating,
  onZoomIn,
  onZoomOut,
  onLocate,
  onDraw,
  onClear,
}: {
  drawMode: DrawMode | null;
  hasShape: boolean;
  locating: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate: () => void;
  onDraw: (mode: DrawMode) => void;
  onClear: () => void;
}) {
  return (
    <div className="absolute right-4 top-4 z-[400] flex flex-col gap-2">
      <ControlButton label="Zoom in" onClick={onZoomIn}>
        <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </ControlButton>
      <ControlButton label="Zoom out" onClick={onZoomOut}>
        <path d="M3.5 8h9" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </ControlButton>
      <ControlButton label={locating ? "Finding your location…" : "Show my location"} active={locating} onClick={onLocate}>
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.5v2.5M8 12v2.5M1.5 8H4M12 8h2.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      </ControlButton>

      <div className="mt-2 flex flex-col gap-2">
        <ControlButton
          label={drawMode === "polygon" ? "Cancel drawing" : "Draw an area"}
          active={drawMode === "polygon"}
          onClick={() => onDraw("polygon")}
        >
          <path
            d="M3 11.5 5 3.5l7 1.5 1 6.5-6.5 1.5L3 11.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="3" cy="11.5" r="1.25" fill="currentColor" />
          <circle cx="5" cy="3.5" r="1.25" fill="currentColor" />
          <circle cx="12" cy="5" r="1.25" fill="currentColor" />
        </ControlButton>
        <ControlButton
          label={drawMode === "rectangle" ? "Cancel drawing" : "Draw a rectangle"}
          active={drawMode === "rectangle"}
          onClick={() => onDraw("rectangle")}
        >
          <rect
            x="2.5"
            y="3.5"
            width="11"
            height="9"
            rx="1"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2.5 2"
          />
        </ControlButton>
        {hasShape && (
          <ControlButton label="Clear drawn area" onClick={onClear}>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
          </ControlButton>
        )}
      </div>
    </div>
  );
}

function ControlButton({
  label,
  active = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-control shadow-pop transition-colors",
        active ? "bg-navy text-white" : "bg-surface text-ink hover:bg-surface-alt",
      )}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

/**
 * Instruction pill shown while drawing. Finish and Cancel are real buttons
 * because a phone has no double-click, right-click or Escape key.
 */
export function DrawHint({
  mode,
  pointCount,
  onFinish,
  onCancel,
}: {
  mode: DrawMode;
  pointCount: number;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const message =
    mode === "rectangle"
      ? pointCount === 0
        ? "Tap one corner of the area"
        : "Now tap the opposite corner"
      : pointCount === 0
        ? "Tap the map to start your area"
        : pointCount < 3
          ? `Keep tapping to add points (${pointCount}/${MAX_POLYGON_POINTS})`
          : `Tap the first point or Finish to close (${pointCount}/${MAX_POLYGON_POINTS})`;

  return (
    <div
      role="status"
      className="absolute bottom-4 left-1/2 z-[400] flex w-max max-w-[calc(100%-2rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-ink py-1.5 pl-4 pr-1.5 text-caption text-white shadow-pop"
    >
      <span>{message}</span>
      {mode === "polygon" && pointCount >= 3 && (
        <button
          type="button"
          onClick={onFinish}
          className="rounded-full bg-gold px-3 py-1 font-semibold text-ink transition-colors hover:bg-gold-deep"
        >
          Finish
        </button>
      )}
      <button
        type="button"
        onClick={onCancel}
        className="rounded-full px-3 py-1 font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        Cancel
      </button>
    </div>
  );
}
