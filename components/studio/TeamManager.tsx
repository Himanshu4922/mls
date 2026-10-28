"use client";

import { useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { teamRoleOf, type TeamMember, type TeamRole } from "@/lib/api/studio";
import {
  useGrantStudioAccess,
  useRevokeStudioAccess,
  useUpdateStudioRole,
} from "@/lib/queries/studio";
import { formatDate } from "@/lib/utils/format";

const ROLE_LABEL: Record<TeamRole, string> = {
  author: "Writer",
  admin: "Administrator",
};

export function TeamManager({
  members: initialMembers,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: number;
}) {
  const grantAccess = useGrantStudioAccess();
  const updateRole = useUpdateStudioRole();
  const revokeAccess = useRevokeStudioAccess();
  const busy = grantAccess.isPending || updateRole.isPending || revokeAccess.isPending;

  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("author");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<TeamMember | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  function upsertMember(member: TeamMember) {
    setMembers((current) => {
      const without = current.filter((row) => row.id !== member.id);
      return [...without, member].sort((a, b) => Number(b.isStaff) - Number(a.isStaff) || a.email.localeCompare(b.email));
    });
  }

  async function grant(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setError(null);
    setNotice(null);
    try {
      const member = await grantAccess.mutateAsync({ email: trimmed, role });
      upsertMember(member);
      setNotice(
        role === "admin"
          ? `${trimmed} is now an administrator and can manage the full Studio.`
          : `${trimmed} can now write and publish blog posts.`,
      );
      setEmail("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not grant access.");
    }
  }

  async function changeRole(member: TeamMember, next: TeamRole) {
    if (teamRoleOf(member) === next) return;
    setError(null);
    setNotice(null);
    try {
      const updated = await updateRole.mutateAsync({ memberId: member.id, role: next });
      upsertMember(updated);
      setNotice(`${member.email} is now a ${ROLE_LABEL[next].toLowerCase()}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update access.");
    }
  }

  async function revoke() {
    const member = pendingRevoke;
    if (!member) return;
    setRevokeError(null);
    setNotice(null);
    try {
      await revokeAccess.mutateAsync(member.id);
      setMembers((current) => current.filter((row) => row.id !== member.id));
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
        className="rounded-surface border border-line bg-surface p-5 shadow-card"
      >
        <label htmlFor="team-email" className="block text-small font-medium text-ink">
          Add a team member
        </label>
        <p className="mt-1 text-caption text-ink-muted">
          They need an account on the site first. Ask them to sign up, then enter
          the same email here and choose their access level.
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
          <select
            aria-label="Access level"
            value={role}
            onChange={(event) => setRole(event.target.value as TeamRole)}
            className="rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
          >
            <option value="author">Writer — blog only</option>
            <option value="admin">Administrator — full Studio</option>
          </select>
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="rounded-control bg-navy px-4 py-2 text-small font-medium text-white disabled:opacity-60"
          >
            {busy ? "Working…" : "Add to team"}
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

      <div className="overflow-x-auto rounded-surface border border-line bg-surface shadow-card">
        <table className="w-full min-w-[40rem] border-collapse text-small">
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
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                  No team members yet. Add someone above.
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const self = member.id === currentUserId;
                const currentRole = teamRoleOf(member);
                return (
                  <tr key={member.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3 text-ink">
                      {member.name}
                      {self && (
                        <span className="ml-2 text-caption text-ink-subtle">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{member.email}</td>
                    <td className="px-4 py-3">
                      {self ? (
                        <span className="text-ink-muted">{ROLE_LABEL[currentRole]}</span>
                      ) : (
                        <select
                          aria-label={`Access level for ${member.email}`}
                          value={currentRole}
                          disabled={busy}
                          onChange={(event) => void changeRole(member, event.target.value as TeamRole)}
                          className="rounded-control border border-line bg-surface px-2 py-1.5 text-small text-ink disabled:opacity-60"
                        >
                          <option value="author">Writer — blog only</option>
                          <option value="admin">Administrator — full Studio</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {member.dateJoined ? formatDate(member.dateJoined) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {self ? (
                        <span className="text-caption text-ink-subtle">—</span>
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
                );
              })
            )}
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
            account but can no longer open the Studio
            {pendingRevoke.isStaff ? " or use administrator tools" : ""}.
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
