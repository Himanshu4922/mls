import type { ComponentType } from "react";
import type { WatchedOverview } from "@/lib/api/watched";
import type { StatusGroup } from "@/lib/utils/status";

/** What every /watched tab panel receives from <WatchedList>. */
export interface WatchedPanelProps {
  overview: WatchedOverview | null;
  /** True until the first overview response (signed-in only). */
  overviewPending: boolean;
  signedIn: boolean;
  onSignIn: () => void;
  /** Properties sub-filter, synced to `?status=`. */
  status: StatusGroup;
  onStatusChange: (next: StatusGroup) => void;
}

/**
 * One /watched tab. Adding a tab is one entry in WatchedList's TABS array:
 * the id doubles as the `?tab=` value, so keep it URL-safe.
 */
export interface WatchedTabDef {
  id: string;
  label: string;
  /** Signed-out visitors get a sign-in prompt instead of the panel. */
  requiresAuth: boolean;
  count?: (ctx: { overview: WatchedOverview | null; favorites: string[] }) => number | null;
  Panel: ComponentType<WatchedPanelProps>;
}
