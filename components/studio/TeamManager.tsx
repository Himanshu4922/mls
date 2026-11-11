"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { LinkButton } from "@/components/ui/Button";
import { teamRoleOf, type TeamMember, type TeamRole } from "@/lib/api/studio";
import {
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
  justAdded = false,
}: {
  members: TeamMember[];
  currentUserId: number;
  justAdded?: boolean;
}) {
  const updateRole = useUpdateStudioRole();
  const revokeAccess = useRevokeStudioAccess();
  const busy = updateRole.isPending || revokeAccess.isPending;

  const [members, setMembers] = useState(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() =>
    justAdded ? "Team member added. You can change their access below." : null,
  );
  const [pendingRevoke, setPendingRevoke] = useState<TeamMember | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  function upsertMember(member: TeamMember) {
    setMembers((current) => {
      const without = current.filter((row) => row.id !== member.id);
      return [...without, member].sort((a, b) => Number(b.isStaff) - Number(a.isStaff) || a.email.localeCompare(b.email));
    });
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-muted">
          Change access on this page. Use Add team member when someone new needs Studio access.
        </p>
        <LinkButton href="/studio/team/new" variant="primary" size="sm">
          Add team member
        </LinkButton>
      </div>

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
                  No team members yet.{" "}
                  <LinkButton href="/studio/team/new" variant="secondary" size="sm" className="ml-1 align-middle">
                    Add team member
                  </LinkButton>
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
                          disabled={busy}
                          onClick={() => {
                            setRevokeError(null);
                            setPendingRevoke(member);
                          }}
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
