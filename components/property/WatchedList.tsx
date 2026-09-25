"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useId } from "react";
import { EmptyState } from "@/components/ui/States";
import { Tabs, tabPanelProps } from "@/components/ui/Tabs";
import { useAuth } from "@/components/providers/AuthProvider";
import { useWatched } from "@/components/providers/WatchedProvider";
import { AlertsPanel } from "@/components/watched/AlertsPanel";
import {
  AreasPanel,
  CommunitiesPanel,
  HistoryPanel,
  TouredPanel,
} from "@/components/watched/CollectionPanels";
import { MyListingsPanel } from "@/components/watched/MyListingsPanel";
import { NotesPanel } from "@/components/watched/NotesPanel";
import { PropertiesPanel } from "@/components/watched/PropertiesPanel";
import { SavedSearchPanel } from "@/components/watched/SavedSearchPanel";
import { WATCHED_TAB_LABELS, isStatusGroup, splitAreas } from "@/components/watched/model";
import type { WatchedTabDef } from "@/components/watched/types";
import { useWatchedOverview } from "@/lib/queries/watched";
import type { StatusGroup } from "@/lib/utils/status";

/**
 * Watched page — the full-size counterpart of the navbar Watched menu, with
 * the same tabs plus Alerts. The selected tab and the Properties status
 * filter live in the URL (`?tab=`, `?status=`) so the menu's "View all"
 * links and shared links land on the right view.
 *
 * Signed-out visitors still get Properties, hydrated from localStorage; the
 * account-only collections explain that they need a sign-in rather than
 * rendering a misleading empty state.
 *
 * Tabs are data: a new collection is one entry here plus its panel.
 */
const TABS: WatchedTabDef[] = [
  {
    id: "properties",
    label: WATCHED_TAB_LABELS.properties,
    requiresAuth: false,
    count: ({ favorites }) => favorites.length,
    Panel: PropertiesPanel,
  },
  {
    id: "notes",
    label: WATCHED_TAB_LABELS.notes,
    requiresAuth: true,
    Panel: NotesPanel,
  },
  {
    id: "toured",
    label: WATCHED_TAB_LABELS.toured,
    requiresAuth: true,
    count: ({ overview }) => overview?.toured.length ?? null,
    Panel: TouredPanel,
  },
  {
    id: "areas",
    label: WATCHED_TAB_LABELS.areas,
    requiresAuth: true,
    count: ({ overview }) => (overview ? splitAreas(overview.followedAreas).areas.length : null),
    Panel: AreasPanel,
  },
  {
    id: "communities",
    label: WATCHED_TAB_LABELS.communities,
    requiresAuth: true,
    count: ({ overview }) =>
      overview ? splitAreas(overview.followedAreas).communities.length : null,
    Panel: CommunitiesPanel,
  },
  {
    id: "history",
    label: WATCHED_TAB_LABELS.history,
    requiresAuth: true,
    count: ({ overview }) => overview?.history.length ?? null,
    Panel: HistoryPanel,
  },
  {
    id: "alerts",
    label: WATCHED_TAB_LABELS.alerts,
    requiresAuth: true,
    Panel: AlertsPanel,
  },
  {
    // The one saved search (per-user cap is 1). Takes no panel props.
    id: "saved-search",
    label: WATCHED_TAB_LABELS["saved-search"],
    requiresAuth: true,
    Panel: SavedSearchPanel,
  },
  {
    // Listing / assignment submissions from /sell/list. Takes no panel props.
    id: "listings",
    label: WATCHED_TAB_LABELS.listings,
    requiresAuth: true,
    Panel: MyListingsPanel,
  },
];

/** Must render inside <Suspense>: it reads `useSearchParams`. */
export function WatchedList() {
  const { favorites } = useWatched();
  const { user, openAuth } = useAuth();
  const pathname = usePathname();
  const params = useSearchParams();
  const idBase = useId();

  // The overview key is shared with WatchedProvider, so this reuses its
  // response instead of refetching.
  const overviewQuery = useWatchedOverview(Boolean(user));
  const overview = overviewQuery.data ?? null;

  const active = TABS.find((tab) => tab.id === params.get("tab")) ?? TABS[0];
  const rawStatus = params.get("status");
  const status: StatusGroup = isStatusGroup(rawStatus) ? rawStatus : "active";

  // replace, not push: flipping tabs should not fill the back button.
  // history.replaceState rather than router.replace: every panel's data is
  // client-side (TanStack), so a server round trip only delayed the tab
  // switch. Next keeps useSearchParams in sync with native history calls.
  function navigate(next: { tab?: string; status?: StatusGroup }) {
    const query = new URLSearchParams(params.toString());
    if (next.tab) {
      query.set("tab", next.tab);
      if (next.tab !== "properties") query.delete("status");
    }
    if (next.status) query.set("status", next.status);
    window.history.replaceState(null, "", `${pathname}?${query.toString()}`);
  }

  const Panel = active.Panel;

  return (
    <div className="space-y-6">
      <Tabs
        variant="pill"
        label="Watched collections"
        idBase={idBase}
        items={TABS.map((tab) => ({
          id: tab.id,
          label: tab.label,
          count: tab.count && (user || !tab.requiresAuth) ? tab.count({ overview, favorites }) : null,
        }))}
        value={active.id}
        onChange={(id) => navigate({ tab: id })}
      />

      <div {...tabPanelProps(idBase, active.id)} className="outline-none">
        {!user && active.requiresAuth ? (
          <EmptyState
            title="Sign in to see this"
            description="Notes, toured homes, followed areas, viewing history and alerts are saved to your account."
            action={{ label: "Sign in", onClick: () => openAuth("login") }}
          />
        ) : (
          <Panel
            overview={overview}
            overviewPending={Boolean(user) && overviewQuery.isPending}
            signedIn={Boolean(user)}
            onSignIn={() => openAuth("login")}
            status={status}
            onStatusChange={(next) => navigate({ status: next })}
          />
        )}
      </div>
    </div>
  );
}
