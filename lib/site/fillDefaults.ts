import defaults from "@/lib/site/defaults.json";
import type { ChromeDocument, HomepageDocument, SeoDocument, SiteKey } from "@/lib/site/types";

/**
 * Fill keys that exist in the shipped defaults but are missing from a saved
 * draft. Older homepage heroes were saved before `tryPrompts` existed, so the
 * Studio form had nothing to render for them — this puts those fields back
 * without overwriting anything the admin already set.
 */
function fillMissing(target: unknown, source: unknown): unknown {
  if (Array.isArray(source)) {
    if (!Array.isArray(target)) return structuredClone(source);
    return target;
  }
  if (source && typeof source === "object") {
    const from = source as Record<string, unknown>;
    const into =
      target && typeof target === "object" && !Array.isArray(target)
        ? { ...(target as Record<string, unknown>) }
        : {};
    for (const [key, value] of Object.entries(from)) {
      if (!(key in into) || into[key] === undefined || into[key] === null) {
        into[key] = structuredClone(value);
      } else {
        into[key] = fillMissing(into[key], value);
      }
    }
    return into;
  }
  return target === undefined || target === null ? structuredClone(source) : target;
}

export function fillHomepageDefaults(draft: unknown): HomepageDocument {
  const saved = (draft && typeof draft === "object" ? draft : {}) as Partial<HomepageDocument>;
  const base = defaults.homepage as HomepageDocument;
  const byId = new Map(base.sections.map((section) => [section.id, section]));
  const sections = Array.isArray(saved.sections) ? saved.sections : base.sections;
  return {
    sections: sections.map((section) => {
      const fallback = byId.get(section.id);
      if (!fallback) return section;
      return {
        ...section,
        content: fillMissing(section.content ?? {}, fallback.content) as Record<string, unknown>,
      };
    }),
  };
}

export function fillChromeDefaults(draft: unknown): ChromeDocument {
  return fillMissing(draft, defaults.chrome) as ChromeDocument;
}

export function fillSeoDefaults(draft: unknown): SeoDocument {
  return fillMissing(draft, defaults.seo) as SeoDocument;
}

export function fillSiteDefaults(siteKey: SiteKey, draft: unknown): unknown {
  if (siteKey === "homepage") return fillHomepageDefaults(draft);
  if (siteKey === "chrome") return fillChromeDefaults(draft);
  if (siteKey === "seo") return fillSeoDefaults(draft);
  return draft;
}
