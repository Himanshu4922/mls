import { apiFetch } from "@/lib/api/client";
import type { SiteKey } from "@/lib/site/types";

const HOME = "/api/home";

export interface RawSiteRecord {
  key: SiteKey;
  draft: unknown;
  published: unknown;
  updated_at: string;
  published_at: string | null;
  dirty: boolean;
}

export function getStudioSite(token: string, key: SiteKey) {
  return apiFetch<RawSiteRecord>(`${HOME}/studio/content/${key}/`, { token });
}

export function saveStudioSite(token: string, key: SiteKey, draft: unknown, expectedUpdatedAt: string) {
  return apiFetch<RawSiteRecord>(`${HOME}/studio/content/${key}/`, {
    token,
    method: "PUT",
    body: { draft, expected_updated_at: expectedUpdatedAt },
  });
}

export function publishStudioSite(token: string, key: SiteKey, expectedUpdatedAt: string) {
  return apiFetch<RawSiteRecord>(`${HOME}/studio/content/${key}/publish/`, {
    token,
    method: "POST",
    body: { expected_updated_at: expectedUpdatedAt },
  });
}

export function discardStudioSite(token: string, key: SiteKey, expectedUpdatedAt: string) {
  return apiFetch<RawSiteRecord>(`${HOME}/studio/content/${key}/discard/`, {
    token,
    method: "POST",
    body: { expected_updated_at: expectedUpdatedAt },
  });
}

export function listSiteRevisions(token: string, key: SiteKey) {
  return apiFetch<{ results: Array<{ id: number; created_at: string; created_by: string }> }>(
    `${HOME}/studio/content/${key}/revisions/`,
    { token },
  );
}

export function restoreSiteRevision(token: string, key: SiteKey, revisionId: number, expectedUpdatedAt: string) {
  return apiFetch<RawSiteRecord>(`${HOME}/studio/content/${key}/restore/`, {
    token,
    method: "POST",
    body: { revision_id: revisionId, expected_updated_at: expectedUpdatedAt },
  });
}

export function uploadSiteImage(token: string, file: File, role: "hero" | "section") {
  const body = new FormData();
  body.append("file", file);
  body.append("role", role);
  return apiFetch<{ url: string; width: number; height: number }>(`${HOME}/studio/media/?role=${role}`, {
    token,
    method: "POST",
    body,
    timeoutMs: 60_000,
  });
}
