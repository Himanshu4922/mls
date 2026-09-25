"use client";

import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import type { TeamMember } from "@/lib/api/studio";
import { useGrantStudioAccess, useRevokeStudioAccess } from "@/lib/queries/studio";
import { formatDate } from "@/lib/utils/format";

export function TeamManager({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: number;
}) {
  // Both refresh the server-rendered member list on success.
  const grantAccess = useGrantStudioAccess();
  const revokeAccess = useRevokeStudioAccess();
  const busy = grantAccess.isPending || revokeAccess.isPending;
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<TeamMember | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  async function grant(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setError(null);
    setNotice(null);
    try {
      await grantAccess.mutateAsync(trimmed);
      setNotice(`${trimmed} can now use the Studio.`);
      setEmail("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not grant access.");
    }
  }

  async function revoke() {
    const member = pendingRevoke;
    if (!member) return;
    setRevokeError(null);
    setNotice(null);
    try {
      await revokeAccess.mutateAsync(member.id);
      setPendingRevoke(null);
      setNotice(`${member.email} no longer has Studio access.`);
    } catch (caught) {
      setRevokeError(caught instanceof Error ? caught.message : "Could not revoke access.");
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={grant}
        className="rounded-surface border border-line bg-surface p-4"
      >
        <label htmlFor="team-email" className="block text-small font-medium text-ink">
          Give someone access
        </label>
        <p className="mt-1 text-caption text-ink-muted">
          They need an account on the site first. Ask them to sign up, then enter
          the same email here.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            id="team-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className="min-w-0 flex-1 rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
          />
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="rounded-control bg-navy px-4 py-2 text-small font-medium text-white disabled:opacity-60"
          >
            {busy ? "Working…" : "Grant access"}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="rounded-control border border-negative/40 bg-surface px-4 py-2.5 text-small text-ink">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-control border border-positive/40 bg-surface px-4 py-2.5 text-small text-ink">
          {notice}
        </p>
      )}

      <div className="overflow-x-auto rounded-surface border border-line bg-surface">
        <table className="w-full min-w-[36rem] border-collapse text-small">
          <thead>
            <tr className="border-b border-line text-left text-caption text-ink-muted">
              <th scope="col" className="px-4 py-3 font-medium">Name</th>
              <th scope="col" className="px-4 py-3 font-medium">Email</th>
              <th scope="col" className="px-4 py-3 font-medium">Access</th>
              <th scope="col" className="px-4 py-3 font-medium">Joined</th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-3 text-ink">
                  {member.name}
                  {member.id === currentUserId && (
                    <span className="ml-2 text-caption text-ink-subtle">(you)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-ink-muted">{member.email}</td>
                <td className="px-4 py-3">
                  <span className="text-ink-muted">
                    {member.isStaff ? "Administrator" : "Author"}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {member.dateJoined ? formatDate(member.dateJoined) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {/* Staff access comes from Django admin and carries far more
                      than the Studio, so it isn't revocable here. */}
                  {member.id === currentUserId ? (
                    <span className="text-caption text-ink-subtle">—</span>
                  ) : member.isStaff ? (
                    <span className="text-caption text-ink-subtle" title="Managed in Django admin">
                      Admin
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRevokeError(null);
                        setPendingRevoke(member);
                      }}
                      disabled={busy}
                      className="text-caption text-negative hover:underline disabled:opacity-60"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={pendingRevoke !== null}
        onClose={() => setPendingRevoke(null)}
        onConfirm={() => void revoke()}
        title="Remove Studio access?"
        confirmLabel="Remove access"
        tone="danger"
        busy={revokeAccess.isPending}
        error={revokeError}
      >
        {pendingRevoke && (
          <p>
            <strong className="text-ink">{pendingRevoke.email}</strong> keeps their
            account but can no longer write or publish posts.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
