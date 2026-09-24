"use client";

import Link from "next/link";
import { useState } from "react";
import { PropertyNote } from "@/components/property/PropertyNote";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, PropertyGridSkeleton } from "@/components/ui/States";
import { PanelToolbar } from "@/components/watched/ClearAllButton";
import { excerpt } from "@/components/watched/model";
import { useNotesList } from "@/lib/queries/notes";
import { usePropertiesByIds } from "@/lib/queries/properties";
import { formatDate, pluralize } from "@/lib/utils/format";

/** The compare proxy hydrates at most 50 ids per request. */
const HYDRATE_LIMIT = 50;

/**
 * Every private note, newest first. Notes store only a listing key, so the
 * first page of keys is hydrated for addresses; beyond that the key is shown.
 * Editing reuses <PropertyNote> in place rather than a second editor.
 */
export function NotesPanel() {
  const notes = useNotesList(true);
  const keys = (notes.data ?? []).slice(0, HYDRATE_LIMIT).map((note) => note.listingKey);
  const listings = usePropertiesByIds(keys);
  const byId = new Map((listings.data ?? []).map((property) => [property.id, property]));
  const [editing, setEditing] = useState<string | null>(null);

  if (notes.isPending) return <PropertyGridSkeleton count={1} />;
  if (notes.isError) {
    return <ErrorState description="We couldn't load your notes." onRetry={() => notes.refetch()} />;
  }
  if (notes.data.length === 0) {
    return (
      <EmptyState
        title="No notes yet"
        description="Add a private note from any listing page and it will appear here."
        action={{ label: "Browse listings", href: "/listings" }}
      />
    );
  }

  function finishEditing() {
    // PropertyNote's save already wrote the list cache, so no refetch needed.
    setEditing(null);
  }

  return (
    <div className="space-y-4">
      <PanelToolbar summary={`${notes.data.length} ${pluralize(notes.data.length, "note")}`} />
      <ul className="divide-y divide-line-soft rounded-surface border border-line bg-surface">
        {notes.data.map((note) => {
          const property = byId.get(note.listingKey);
          const isEditing = editing === note.listingKey;
          return (
            <li key={note.listingKey} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/property/${encodeURIComponent(note.listingKey)}`}
                    className="block truncate text-small font-medium text-ink hover:text-gold"
                  >
                    {property?.address ?? note.listingKey}
                  </Link>
                  {!isEditing && (
                    <p className="mt-1 text-small text-ink-soft">{excerpt(note.body, 180)}</p>
                  )}
                  {note.updatedAt && (
                    <p className="mt-1 text-caption text-ink-muted">
                      Updated {formatDate(note.updatedAt)}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-expanded={isEditing}
                  onClick={() => (isEditing ? finishEditing() : setEditing(note.listingKey))}
                >
                  {isEditing ? "Done" : "Edit"}
                </Button>
              </div>
              {/* PropertyNote is laid out for the detail page; pull its top
                  margin in so it sits under the row instead of floating. */}
              {isEditing && (
                <div className="[&>section]:mt-3">
                  <PropertyNote listingKey={note.listingKey} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
