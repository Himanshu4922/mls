"use client";

import { useState } from "react";
import {
  studioFilter,
  studioTable,
  studioTableWrap,
  studioTd,
  studioTh,
} from "@/components/studio/chrome";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { LinkButton } from "@/components/ui/Button";
import { teamRoleOf, type TeamMember, type TeamRole } from "@/lib/api/studio";
import {
  useRevokeStudioAccess,
  useUpdateStudioRole,
} from "@/lib/queries/studio";
import { cn } from "@/lib/utils/cn";
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
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-control border border-negative/40 bg-surface px-3.5 py-2.5 text-small text-ink">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-control border border-positive/40 bg-surface px-3.5 py-2.5 text-small text-ink">
          {notice}
        </p>
      )}

      <div className={studioTableWrap}>
        <table className={cn(studioTable, "min-w-[40rem]")}>
          <thead>
            <tr>
              <th scope="col" className={studioTh}>
                Name
              </th>
              <th scope="col" className={studioTh}>
                Email
              </th>
              <th scope="col" className={studioTh}>
                Access
              </th>
              <th scope="col" className={studioTh}>
                Joined
              </th>
              <th scope="col" className={studioTh}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={5} className={cn(studioTd, "py-8 text-center text-ink-muted")}>
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
                  <tr key={member.id}>
                    <td className={studioTd}>
                      <span className="studio-cell-title">{member.name}</span>
                      {self ? <span className="studio-cell-meta">(you)</span> : null}
                    </td>
                    <td className={cn(studioTd, "text-ink-muted")}>{member.email}</td>
                    <td className={studioTd}>
                      {self ? (
                        <span className="text-ink-muted">{ROLE_LABEL[currentRole]}</span>
                      ) : (
                        <select
                          aria-label={`Access level for ${member.email}`}
                          value={currentRole}
                          disabled={busy}
                          onChange={(event) => void changeRole(member, event.target.value as TeamRole)}
                          className={cn(studioFilter, "disabled:opacity-60")}
                        >
                          <option value="author">Writer — blog only</option>
                          <option value="admin">Administrator — full Studio</option>
                        </select>
                      )}
                    </td>
                    <td className={cn(studioTd, "text-ink-muted")}>
                      {member.dateJoined ? formatDate(member.dateJoined) : "—"}
                    </td>
                    <td className={studioTd}>
                      <div className="text-right">
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
                      </div>
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
