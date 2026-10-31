import { cache } from "react";
import { apiFetch } from "@/lib/api/client";
import { getPublicConnections } from "@/lib/api/integrations";
import { WHATSAPP_NUMBER } from "@/lib/constants/contact";
import {
  CURATED_PAGES,
  mergeCuratedPages,
  type CuratedPage,
} from "@/lib/seo/curatedPages";
import { fillChromeDefaults } from "@/lib/site/fillDefaults";
import {
  SECTION_IDS,
  type ChromeDocument,
  type HomepageDocument,
  type SectionId,
  type SeoDocument,
  type SiteKey,
  type SiteSection,
} from "@/lib/site/types";

interface PublicBody {
  document?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

const loadPublished = cache(async (key: SiteKey): Promise<unknown | null> => {
  try {
    const body = await apiFetch<PublicBody>(`/api/home/content/${key}/`, {
      revalidate: 600,
      timeoutMs: 2000,
    });
    return body.document ?? null;
  } catch {
    return null;
  }
});

export async function getHomepageDocument(): Promise<HomepageDocument | null> {
  const document = await loadPublished("homepage");
  if (!isRecord(document) || !Array.isArray(document.sections)) return null;
  const sections: SiteSection[] = [];
  for (const raw of document.sections) {
    if (!isRecord(raw) || typeof raw.id !== "string") continue;
    if (!SECTION_IDS.includes(raw.id as SectionId)) continue;
    sections.push({
      id: raw.id as SectionId,
      visible: raw.id === "hero" ? true : raw.visible !== false,
      content: isRecord(raw.content) ? raw.content : {},
    });
  }
  return sections.length ? { sections } : null;
}

export async function getChromeDocument(): Promise<ChromeDocument | null> {
  const document = await loadPublished("chrome");
  if (!isRecord(document) || !isRecord(document.nav) || !isRecord(document.footer)) return null;
  // Fill keys added after an older publish (e.g. Blog in the nav) without
  // overwriting anything the team already set.
  return fillChromeDefaults(document);
}

export async function getSeoDocument(): Promise<SeoDocument | null> {
  const document = await loadPublished("seo");
  if (!isRecord(document) || typeof document.title !== "string") return null;
  return document as unknown as SeoDocument;
}

/** Keyword / curated searches: Studio publish when set, else code defaults. */
export async function getCuratedPages(): Promise<CuratedPage[]> {
  const document = await loadPublished("curated");
  if (!document) return [...CURATED_PAGES];
  return mergeCuratedPages(document);
}

export async function getWhatsappNumber(): Promise<string> {
  const connections = await getPublicConnections();
  const fromConnections = (connections.whatsappNumber || "").replace(/\D/g, "");
  if (fromConnections.length >= 10) return fromConnections;
  const chrome = await getChromeDocument();
  const digits = (chrome?.contact?.whatsapp || "").replace(/\D/g, "");
  return digits.length >= 10 ? digits : WHATSAPP_NUMBER;
}
