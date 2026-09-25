"use client";

import { useState, type FormEvent } from "react";
import { CriteriaChips } from "@/components/search/SaveSearchModal";
import { useSavedSearch, useSavedSearchActions } from "@/lib/queries/savedSearches";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { AlertCadencePicker } from "@/components/search/AlertCadencePicker";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import {
  describeCriteria,
  fromBackendParams,
  savedSearchHref,
  type SavedSearch,
} from "@/lib/api/savedSearches";
import { formatDate } from "@/lib/utils/format";

/**
 * The user's saved search, for the /watched page. Self-contained: it reads the
 * shared ["saved-searches"] cache, so saving from /listings or the map shows up
 * here with no prop plumbing, and a rename here relabels the toolbar button.
 */
export function SavedSearchPanel() {
  const { user, openAuth } = useAuth();
  const { saved, isPending, isError, refetch } = useSavedSearch();

  if (!user) {
    return (
      <EmptyState
        title="Sign in to see your saved search"
        description="Save a search on the listings page and it will be waiting for you here."
        action={{ label: "Sign in", onClick: () => openAuth("login") }}
      />
    );
  }

  if (isPending) {
    return <Skeleton className="h-40 w-full rounded-surface" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Saved search unavailable"
        description="We couldn't load your saved search right now."
        onRetry={() => void refetch()}
      />
    );
  }

  if (!saved) {
    return (
      <EmptyState
        title="No saved search yet"
        description="Set up filters on the listings page, then choose Save search to keep them here."
        action={{ label: "Browse listings", href: "/listings" }}
      />
    );
  }

  return <SavedSearchCard saved={saved} />;
}

function SavedSearchCard({ saved }: { saved: SavedSearch }) {
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { remove, setAlerts } = useSavedSearchActions();
  const query = fromBackendParams(saved.filters);
  const updated = saved.updatedAt ?? saved.createdAt;

  return (
    <article className="rounded-surface border border-line bg-surface p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-h3 text-ink">{saved.name}</h3>
          {updated && (
            <p className="mt-0.5 text-caption text-ink-muted">Saved {formatDate(updated)}</p>
          )}
        </div>
        <LinkButton href={savedSearchHref(saved)} variant="primary" size="sm">
          Run search
        </LinkButton>
      </div>

      <div className="mt-4">
        <CriteriaChips criteria={describeCriteria(query)} />
      </div>

      <div className="mt-5">
        <p id={`alerts-${saved.id}`} className="mb-2 text-small font-medium text-ink">
          New listing alerts
        </p>
        <AlertCadencePicker
          value={saved.alertCadence}
          onChange={(alertCadence) => setAlerts.mutate({ id: saved.id, alertCadence })}
          disabled={setAlerts.isPending}
          labelId={`alerts-${saved.id}`}
        />
        {setAlerts.error && (
          <p role="alert" className="mt-2 text-caption text-negative">
            {setAlerts.error.message}
          </p>
        )}
        {saved.alertCadence !== "off" && saved.lastRunAt && (
          <p className="mt-2 text-caption text-ink-muted">
            Last checked {formatDate(saved.lastRunAt)}
            {saved.lastResultCount ? ` · ${saved.lastResultCount} new then` : ""}
          </p>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
        <Button variant="secondary" size="sm" onClick={() => setRenaming(true)}>
          Rename
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
          Delete
        </Button>
      </div>

      {renaming && <RenameModal saved={saved} onClose={() => setRenaming(false)} />}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        size="sm"
        title="Delete saved search?"
        description={`"${saved.name}" will be removed. This can't be undone.`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={remove.isPending}
              onClick={() => remove.mutate(saved.id, { onSuccess: () => setConfirmDelete(false) })}
            >
              Delete
            </Button>
          </div>
        }
      >
        {remove.error ? (
          <p role="alert" className="text-caption text-negative">
            {remove.error.message}
          </p>
        ) : (
          <CriteriaChips criteria={describeCriteria(query)} />
        )}
      </Modal>
    </article>
  );
}

function RenameModal({ saved, onClose }: { saved: SavedSearch; onClose: () => void }) {
  const { rename } = useSavedSearchActions();
  const [name, setName] = useState(saved.name);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give this search a name.");
      return;
    }
    if (trimmed === saved.name) {
      onClose();
      return;
    }
    setError(null);
    rename.mutate(
      { id: saved.id, name: trimmed },
      { onSuccess: onClose, onError: (caught) => setError(caught.message) },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Rename saved search"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="rename-search-form" variant="primary" size="sm" loading={rename.isPending}>
            Save name
          </Button>
        </div>
      }
    >
      <form id="rename-search-form" onSubmit={submit}>
        <Field label="Name" htmlFor="rename-search-name" error={error}>
          <Input
            id="rename-search-name"
            value={name}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "rename-search-name-error" : undefined}
          />
        </Field>
      </form>
    </Modal>
  );
}
