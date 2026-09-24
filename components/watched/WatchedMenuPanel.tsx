"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Tabs, tabPanelProps } from "@/components/ui/Tabs";
import { useAuth } from "@/components/providers/AuthProvider";
import { useWatched } from "@/components/providers/WatchedProvider";
import {
  PreviewEmpty,
  PreviewList,
  PreviewRow,
  PreviewSkeleton,
} from "@/components/watched/PreviewRows";
import {
  STATUS_TAB_ITEMS,
  WATCHED_TAB_LABELS,
  areaHref,
  excerpt,
  propertyGroup,
  snapshotAddress,
  snapshotCity,
  snapshotPrice,
  splitAreas,
  watchedHref,
  type WatchedTabId,
} from "@/components/watched/model";
import { useNotesList } from "@/lib/queries/notes";
import { usePropertiesByIds } from "@/lib/queries/properties";
import { useWatchedOverview } from "@/lib/queries/watched";
import { EMPTY, formatDate, formatPrice } from "@/lib/utils/format";
import { STATUS_GROUP_LABELS, type StatusGroup } from "@/lib/utils/status";
import type { WatchedEntry } from "@/lib/api/watched";

/**
 * Body of the navbar Watched dropdown (HomeAtlasUI Navbar L150-204).
 *
 * Mounted only while the menu is open — <Menu> renders children on demand —
 * so the notes and listing hydration below cost nothing until someone looks.
 * Each tab previews at most PREVIEW rows and links to the full /watched tab.
 */
// Page-only tabs: the menu mirrors the reference dropdown's six.
type MenuTab = Exclude<WatchedTabId, "alerts" | "saved-search" | "listings">;

const MENU_TABS: MenuTab[] = [
  "properties",
  "notes",
  "toured",
  "areas",
  "communities",
  "history",
];

const PREVIEW = 5;

export function WatchedMenuPanel({ close }: { close: () => void }) {
  const { user, openAuth } = useAuth();
  const [tab, setTab] = useState<MenuTab>("properties");
  const [status, setStatus] = useState<StatusGroup>("active");
  const idBase = useId();

  const signIn = () => {
    close();
    openAuth("login");
  };

  return (
    <div>
      <Tabs
        variant="folder"
        size="sm"
        label="Watched collections"
        idBase={idBase}
        items={MENU_TABS.map((id) => ({ id, label: WATCHED_TAB_LABELS[id] }))}
        value={tab}
        onChange={setTab}
      />

      <div {...tabPanelProps(idBase, tab)} className="max-h-[380px] overflow-y-auto outline-none">
        {tab === "properties" ? (
          <PropertiesPreview status={status} onStatus={setStatus} close={close} />
        ) : !user ? (
          <PreviewEmpty
            message={`Sign in to see your ${WATCHED_TAB_LABELS[tab].toLowerCase()}`}
            action={{ label: "Sign in", onClick: signIn }}
          />
        ) : tab === "notes" ? (
          <NotesPreview close={close} />
        ) : (
          <OverviewPreview tab={tab} close={close} />
        )}
      </div>

      <div className="border-t border-line px-4 py-3">
        {user ? (
          <Link
            href={watchedHref(tab, tab === "properties" ? status : undefined)}
            onClick={close}
            className="text-caption font-medium text-navy transition-colors hover:text-gold"
          >
            Open Watched &rarr;
          </Link>
        ) : (
          <button
            type="button"
            onClick={signIn}
            className="text-caption font-medium text-navy transition-colors hover:text-gold"
          >
            Sign in to sync across devices &rarr;
          </button>
        )}
      </div>
    </div>
  );
}

function ViewAll({ href, count, close }: { href: string; count: number; close: () => void }) {
  if (count <= PREVIEW) return null;
  return (
    <Link
      href={href}
      onClick={close}
      className="block px-4 py-2.5 text-caption font-medium text-gold hover:underline"
    >
      View all {count} &rarr;
    </Link>
  );
}

/**
 * Favourites come from WatchedProvider, so this works signed out too (local
 * saves). Status is live: the backend snapshot predates any sale, so the
 * listing is hydrated to know which sub-filter it belongs under.
 */
function PropertiesPreview({
  status,
  onStatus,
  close,
}: {
  status: StatusGroup;
  onStatus: (next: StatusGroup) => void;
  close: () => void;
}) {
  const { favorites } = useWatched();
  const query = usePropertiesByIds(favorites);
  const all = query.data ?? [];
  const inGroup = all.filter((property) => propertyGroup(property) === status);
  const pending = favorites.length > 0 && !query.data && !query.isError;

  return (
    <>
      <Tabs
        variant="pill"
        size="sm"
        label="Listing status"
        className="px-4 pt-3"
        items={STATUS_TAB_ITEMS}
        value={status}
        onChange={onStatus}
      />
      {pending ? (
        <PreviewSkeleton />
      ) : inGroup.length === 0 ? (
        <PreviewEmpty
          message={`No ${STATUS_GROUP_LABELS[status].toLowerCase()} properties saved yet`}
          action={{ label: "Browse Listings", href: "/listings", onClick: close }}
        />
      ) : (
        <div className="pt-2">
          <PreviewList>
            {inGroup.slice(0, PREVIEW).map((property) => (
              <PreviewRow
                key={property.id}
                href={`/property/${encodeURIComponent(property.id)}`}
                title={property.address}
                meta={property.community ?? property.neighbourhood}
                trailing={property.price === null ? EMPTY : formatPrice(property.price)}
                image={property.image}
                onNavigate={close}
              />
            ))}
          </PreviewList>
          <ViewAll href={watchedHref("properties", status)} count={inGroup.length} close={close} />
        </div>
      )}
    </>
  );
}

function NotesPreview({ close }: { close: () => void }) {
  const notes = useNotesList(true);
  const visible = (notes.data ?? []).slice(0, PREVIEW);
  // Notes store only the listing key; hydrate the few on screen for addresses.
  const listings = usePropertiesByIds(visible.map((note) => note.listingKey));
  const byId = new Map((listings.data ?? []).map((property) => [property.id, property]));

  if (notes.isPending) return <PreviewSkeleton />;
  if (visible.length === 0) {
    return (
      <PreviewEmpty
        message="No notes saved yet"
        action={{ label: "Browse Listings", href: "/listings", onClick: close }}
      />
    );
  }

  return (
    <div className="pt-1">
      <PreviewList>
        {visible.map((note) => (
          <PreviewRow
            key={note.listingKey}
            href={`/property/${encodeURIComponent(note.listingKey)}`}
            title={byId.get(note.listingKey)?.address ?? note.listingKey}
            meta={excerpt(note.body, 70)}
            icon="note"
            onNavigate={close}
          />
        ))}
      </PreviewList>
      <ViewAll href={watchedHref("notes")} count={notes.data?.length ?? 0} close={close} />
    </div>
  );
}

function OverviewPreview({
  tab,
  close,
}: {
  tab: Exclude<MenuTab, "properties" | "notes">;
  close: () => void;
}) {
  const overview = useWatchedOverview(true);
  if (overview.isPending) return <PreviewSkeleton />;
  const data = overview.data;

  if (tab === "areas" || tab === "communities") {
    const areas = splitAreas(data?.followedAreas ?? [])[tab];
    if (areas.length === 0) {
      return (
        <PreviewEmpty
          message={`No ${WATCHED_TAB_LABELS[tab].toLowerCase()} followed yet`}
          action={{ label: "Explore communities", href: "/communities", onClick: close }}
        />
      );
    }
    return (
      <div className="pt-1">
        <PreviewList>
          {areas.slice(0, PREVIEW).map((area) => (
            <PreviewRow
              key={area.areaKey}
              href={areaHref(area)}
              title={area.areaLabel ?? area.areaKey}
              meta={area.createdAt ? `Following since ${formatDate(area.createdAt)}` : null}
              icon="pin"
              onNavigate={close}
            />
          ))}
        </PreviewList>
        <ViewAll href={watchedHref(tab)} count={areas.length} close={close} />
      </div>
    );
  }

  const entries: WatchedEntry[] = (tab === "toured" ? data?.toured : data?.history) ?? [];
  if (entries.length === 0) {
    return (
      <PreviewEmpty
        message={tab === "toured" ? "No toured homes yet" : "Nothing viewed yet"}
        action={{ label: "Browse Listings", href: "/listings", onClick: close }}
      />
    );
  }
  return (
    <div className="pt-1">
      <PreviewList>
        {entries.slice(0, PREVIEW).map((entry) => {
          const price = snapshotPrice(entry);
          return (
            <PreviewRow
              key={entry.propertyKey}
              href={`/property/${encodeURIComponent(entry.propertyKey)}`}
              title={snapshotAddress(entry)}
              meta={[snapshotCity(entry), entry.timestamp && formatDate(entry.timestamp)]
                .filter(Boolean)
                .join(" · ")}
              trailing={price === null ? null : formatPrice(price)}
              onNavigate={close}
            />
          );
        })}
      </PreviewList>
      <ViewAll href={watchedHref(tab)} count={entries.length} close={close} />
    </div>
  );
}
