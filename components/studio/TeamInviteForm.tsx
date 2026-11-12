"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { StudioAlert, StudioBack, StudioPage } from "@/components/studio/chrome";
import { Button } from "@/components/ui/Button";
import { useGrantStudioAccess } from "@/lib/queries/studio";
import type { TeamRole } from "@/lib/api/studio";

export function TeamInviteForm() {
  const router = useRouter();
  const grantAccess = useGrantStudioAccess();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("author");
  const [error, setError] = useState<string | null>(null);

  async function grant(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await grantAccess.mutateAsync({ email: trimmed, role });
      router.push("/studio/team?added=1");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not grant access.");
    }
  }

  return (
    <div className="space-y-4">
      <StudioBack href="/studio/team">Back to team</StudioBack>
      <StudioPage
        title="Add team member"
        description="They need an account on the site first. Ask them to sign up, then enter the same email here and choose their access level."
      >
        {error ? <StudioAlert>{error}</StudioAlert> : null}
        <form onSubmit={grant} className="max-w-xl space-y-4 border border-line bg-surface p-5">
          <label htmlFor="team-email" className="block text-small font-medium text-ink">
            Email
            <input
              id="team-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="mt-1.5 w-full rounded-control border border-line bg-surface px-3 py-2 font-normal text-small text-ink"
              required
            />
          </label>
          <label htmlFor="team-role" className="block text-small font-medium text-ink">
            Access level
            <select
              id="team-role"
              value={role}
              onChange={(event) => setRole(event.target.value as TeamRole)}
              className="mt-1.5 w-full rounded-control border border-line bg-surface px-3 py-2 font-normal text-small text-ink"
            >
              <option value="author">Writer — blog only</option>
              <option value="admin">Administrator — full Studio</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button type="submit" variant="primary" disabled={grantAccess.isPending || !email.trim()}>
              {grantAccess.isPending ? "Working…" : "Add to team"}
            </Button>
            <Button type="button" variant="ghost" disabled={grantAccess.isPending} onClick={() => router.push("/studio/team")}>
              Cancel
            </Button>
          </div>
        </form>
      </StudioPage>
    </div>
  );
}
