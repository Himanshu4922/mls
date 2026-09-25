"use client";

import { ChipToggle } from "@/components/ui/Field";
import { ALERT_CADENCE_LABELS, ALERT_CADENCES, type AlertCadence } from "@/lib/api/savedSearches";

/** Daily / Weekly / Off for a saved search's email alerts (scope #22). */
export function AlertCadencePicker({
  value,
  onChange,
  disabled,
  labelId,
}: {
  value: AlertCadence;
  onChange: (next: AlertCadence) => void;
  disabled?: boolean;
  /** id of the visible label, for the group's accessible name. */
  labelId: string;
}) {
  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-2">
      {ALERT_CADENCES.map((cadence) => (
        <ChipToggle
          key={cadence}
          active={value === cadence}
          disabled={disabled}
          onClick={() => onChange(cadence)}
        >
          {ALERT_CADENCE_LABELS[cadence]}
        </ChipToggle>
      ))}
    </div>
  );
}
