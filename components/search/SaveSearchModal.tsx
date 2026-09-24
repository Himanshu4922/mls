"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import {
  defaultSearchName,
  describeCriteria,
  fromBackendParams,
  searchIdentity,
  toSavedFilters,
} from "@/lib/api/savedSearches";
import type { ListingQuery } from "@/lib/types/domain";
import { useSavedSearch, useSavedSearchActions } from "@/lib/queries/savedSearches";

export function CriteriaChips({ criteria }: { criteria: string[] }) {
  if (criteria.length === 0) {
    return <p className="text-caption text-ink-muted">All listings</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Search criteria">
      {criteria.map((chip) => (
        <li key={chip}>
          <Badge tone="neutral" className="font-medium">
            {chip}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/**
 * Name-and-confirm dialog for saving the current search.
 *
 * One saved search per user: when one already exists this becomes a REPLACE
 * (PUT over that row) with both searches shown, so nothing is overwritten
 * without the user seeing what they are giving up. Mount it only while open —
 * the name field initialises from the criteria on mount.
 */
export function SaveSearchModal({
  query,
  onClose,
}: {
  query: ListingQuery;
  onClose: () => void;
}) {
  const { saved, isPending } = useSavedSearch();
  const { save } = useSavedSearchActions();
  const [name, setName] = useState(() => defaultSearchName(query));
  const [error, setError] = useState<string | null>(null);

  const criteria = describeCriteria(query);
  const alreadySaved = saved !== null && searchIdentity(fromBackendParams(saved.filters)) === searchIdentity(query);
  const replacing = saved !== null && !alreadySaved;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give this search a name.");
      return;
    }
    setError(null);
    save.mutate(
      { name: trimmed, filters: toSavedFilters(query), replaceId: saved?.id },
      { onSuccess: onClose, onError: (caught) => setError(caught.message) },
    );
  };

  if (alreadySaved) {
    return (
      <Modal
        open
        onClose={onClose}
        size="sm"
        title="This search is saved"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <p className="text-small font-medium text-ink">{saved.name}</p>
        <div className="mt-3">
          <CriteriaChips criteria={criteria} />
        </div>
        <p className="mt-4 text-caption text-ink-muted">
          Rename or remove it from{" "}
          <Link href="/watched" className="font-medium text-navy underline underline-offset-2">
            your saved homes
          </Link>
          .
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={replacing ? "Replace your saved search?" : "Save this search"}
      description={
        replacing
          ? "You can keep one saved search. Saving this one replaces the one you have."
          : "Come back to these exact filters any time from your saved homes."
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="save-search-form"
            variant="primary"
            size="sm"
            loading={save.isPending}
            disabled={isPending}
          >
            {replacing ? "Replace saved search" : "Save search"}
          </Button>
        </div>
      }
    >
      <form id="save-search-form" onSubmit={submit} className="space-y-5">
        {replacing && saved && (
          <div className="rounded-control border border-line bg-surface-alt p-4">
            <p className="text-eyebrow uppercase text-ink-muted">Currently saved</p>
            <p className="mt-1 text-small font-medium text-ink">{saved.name}</p>
            <div className="mt-2">
              <CriteriaChips criteria={describeCriteria(fromBackendParams(saved.filters))} />
            </div>
          </div>
        )}

        <div>
          {replacing && <p className="mb-2 text-eyebrow uppercase text-ink-muted">New search</p>}
          <CriteriaChips criteria={criteria} />
        </div>

        <Field label="Name" htmlFor="save-search-name" error={error}>
          <Input
            id="save-search-name"
            value={name}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "save-search-name-error" : undefined}
          />
        </Field>
      </form>
    </Modal>
  );
}
