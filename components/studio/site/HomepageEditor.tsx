"use client";

import { useEffect, useState } from "react";
import { DocumentEditor } from "@/components/studio/site/DocumentEditor";
import { TreeForm } from "@/components/studio/site/TreeForm";
import { Switch } from "@/components/ui/Switch";
import { SECTION_META, type HomepageDocument, type SectionId } from "@/lib/site/types";
import { validateHomepage } from "@/lib/site/validate";

export function HomepageEditor() {
  return (
    <DocumentEditor
      siteKey="homepage"
      title="Homepage"
      lede="Pick a section on the left, edit it, then check the preview. The layout of each section stays the same. The hero always stays on the page."
      validate={(draft) => validateHomepage(draft as HomepageDocument)}
      skeleton="homepage"
      previewOf={(draft, extra) => ({ kind: "homepage", document: draft, sectionId: extra.sectionId, fullPage: extra.fullPage === true })}
    >
      {(draft, update, errors, setPreviewExtra, openPreview) => (
        <HomepageForm
          draft={draft as HomepageDocument}
          update={update as (next: HomepageDocument) => void}
          errors={errors}
          setPreviewExtra={setPreviewExtra}
          openPreview={openPreview}
        />
      )}
    </DocumentEditor>
  );
}

function HomepageForm({
  draft,
  update,
  errors,
  setPreviewExtra,
  openPreview,
}: {
  draft: HomepageDocument;
  update: (next: HomepageDocument) => void;
  errors: Record<string, string>;
  setPreviewExtra: (extra: Record<string, unknown>) => void;
  openPreview: () => void;
}) {
  const [active, setActive] = useState<SectionId>(draft.sections[0]?.id ?? "hero");
  const [fullPage, setFullPage] = useState(false);
  const index = draft.sections.findIndex((section) => section.id === active);
  const section = draft.sections[index] ?? draft.sections[0];
  useEffect(() => {
    setPreviewExtra({ sectionId: section?.id, fullPage });
  }, [section?.id, fullPage, setPreviewExtra]);
  if (!section) return null;
  const meta = SECTION_META[section.id];

  function setSection(next: HomepageDocument["sections"][number]) {
    update({ sections: draft.sections.map((item) => (item.id === next.id ? next : item)) });
  }

  function showPreview(wholePage: boolean) {
    setFullPage(wholePage);
    setPreviewExtra({ sectionId: section.id, fullPage: wholePage });
    openPreview();
  }

  function move(from: number, direction: -1 | 1) {
    const to = from + direction;
    if (to < 0 || to >= draft.sections.length) return;
    const sections = draft.sections.slice();
    [sections[from], sections[to]] = [sections[to], sections[from]];
    update({ sections });
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <div className="rounded-surface border border-line bg-surface lg:sticky lg:top-0 lg:max-h-[calc(100dvh-5.5rem)] lg:overflow-y-auto">
        <p className="border-b border-line px-4 py-3 text-caption font-medium text-ink-muted">Sections</p>
        <ol>
          {draft.sections.map((item, itemIndex) => {
            const info = SECTION_META[item.id];
            const selected = item.id === section.id;
            const hidden = !item.visible && item.id !== "hero";
            return (
              <li key={item.id} className="flex items-stretch border-b border-line last:border-0">
                <button
                  type="button"
                  onClick={() => setActive(item.id)}
                  className={`min-w-0 flex-1 border-l-2 px-4 py-3 text-left ${selected ? "border-gold bg-navy-tint" : "border-transparent hover:bg-surface-alt"}`}
                >
                  <span className="block text-small font-medium text-ink">{info.label}</span>
                  <span className="mt-0.5 block text-caption text-ink-muted">
                    {hidden ? "Hidden" : "Shown"}
                  </span>
                </button>
                <div className="flex flex-col justify-center gap-1 border-l border-line px-1.5">
                  <button type="button" className="rounded-control px-2 py-1 text-caption text-ink-muted hover:bg-surface-alt hover:text-ink disabled:opacity-30" aria-label={`Move ${info.label} up`} disabled={itemIndex === 0} onClick={() => move(itemIndex, -1)}>Up</button>
                  <button type="button" className="rounded-control px-2 py-1 text-caption text-ink-muted hover:bg-surface-alt hover:text-ink disabled:opacity-30" aria-label={`Move ${info.label} down`} disabled={itemIndex === draft.sections.length - 1} onClick={() => move(itemIndex, 1)}>Down</button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="space-y-4 rounded-surface border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-h2 text-ink">{meta.label}</h2>
            <p className="mt-1 text-small text-ink-muted">{meta.summary}</p>
          </div>
          <label className="flex items-center gap-3 rounded-control border border-line px-3 py-2 text-small text-ink">
            Show on the homepage
            <Switch
              aria-label={`Show ${meta.label} on the homepage`}
              checked={section.id === "hero" ? true : section.visible}
              disabled={!meta.canHide}
              onCheckedChange={(visible) => setSection({ ...section, visible })}
            />
          </label>
        </div>
        {!meta.canHide && (
          <p className="rounded-control bg-surface-alt px-3 py-2 text-small text-ink-muted">The hero stays on the page. You can still change its photo and words.</p>
        )}
        {!section.visible && section.id !== "hero" && (
          <p className="rounded-control bg-gold-soft px-3 py-2 text-small text-ink">This section is hidden. Visitors will not see it after you publish.</p>
        )}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Preview scope">
          <button type="button" className={`rounded-control px-3 py-2 text-small font-medium ${fullPage ? "text-ink-muted hover:bg-surface-alt" : "bg-navy text-white"}`} aria-pressed={!fullPage} onClick={() => showPreview(false)}>Preview this section</button>
          <button type="button" className={`rounded-control px-3 py-2 text-small font-medium ${fullPage ? "bg-navy text-white" : "text-ink-muted hover:bg-surface-alt"}`} aria-pressed={fullPage} onClick={() => showPreview(true)}>Preview the whole page</button>
        </div>
        <TreeForm
          value={section.content}
          path={`sections.${section.id}`}
          errors={errors}
          onChange={(content) => setSection({ ...section, content: content as Record<string, unknown> })}
        />
      </div>
    </div>
  );
}
