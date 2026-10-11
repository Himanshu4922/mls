"use client";

import type { ReactNode } from "react";
import { DocumentEditor } from "@/components/studio/site/DocumentEditor";
import { TreeForm } from "@/components/studio/site/TreeForm";
import type { ChromeDocument, SeoDocument } from "@/lib/site/types";
import { validateChrome, validateSeo } from "@/lib/site/validate";

export function HeaderEditor() {
  return (
    <DocumentEditor
      siteKey="chrome"
      title="Header and contact"
      lede="The bar at the top, the menu, the evaluation button, and the WhatsApp number. Menu links should stay on this site."
      validate={validateChrome}
      previewOf={(draft) => ({ kind: "header", document: draft })}
    >
      {(draft, update, errors) => {
        const chrome = draft as ChromeDocument;
        return (
          <div className="space-y-8">
            <EditorCard title="Announcement bar" lede="Short lines that scroll across the top of every page.">
              <TreeForm value={chrome.announcement} path="announcement" errors={errors} onChange={(announcement) => update({ ...chrome, announcement })} />
            </EditorCard>
            <EditorCard title="Menu" lede="The links in the header, plus the button on the right.">
              <TreeForm value={chrome.nav} path="nav" errors={errors} onChange={(nav) => update({ ...chrome, nav })} />
            </EditorCard>
            <EditorCard title="WhatsApp number" lede="Used by every WhatsApp button after you publish. Leave it blank to keep the current fallback number.">
              <TreeForm value={chrome.contact} path="contact" errors={errors} onChange={(contact) => update({ ...chrome, contact })} />
            </EditorCard>
          </div>
        );
      }}
    </DocumentEditor>
  );
}

export function FooterEditor() {
  return (
    <DocumentEditor
      siteKey="chrome"
      title="Footer"
      lede="The banner, the short description, social links, and the link columns. You can use up to four columns. The MLS trademark sentence under the footer cannot be edited."
      validate={validateChrome}
      previewOf={(draft) => ({ kind: "footer", document: draft })}
    >
      {(draft, update, errors) => {
        const chrome = draft as ChromeDocument;
        return (
          <EditorCard title="Footer content" lede="Social links must start with https. Each column can hold up to eight links.">
            <TreeForm
              value={chrome.footer}
              path="footer"
              errors={errors}
              onChange={(footer) => update({ ...chrome, footer })}
            />
          </EditorCard>
        );
      }}
    </DocumentEditor>
  );
}

export function SeoEditor() {
  return (
    <DocumentEditor
      siteKey="seo"
      title="Search and sharing"
      lede="The title and description browsers and search results use when a page does not set its own. The share image appears when someone sends the homepage link."
      validate={validateSeo}
      previewOf={(draft) => ({ kind: "seo", document: draft })}
    >
      {(draft, update, errors) => (
        <EditorCard title="Defaults" lede="Keep the title under 70 characters and the description under 160.">
          <TreeForm value={draft as SeoDocument} path="" errors={errors} onChange={update} />
        </EditorCard>
      )}
    </DocumentEditor>
  );
}

function EditorCard({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  return (
    <section className="rounded-surface border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-h3 text-ink">{title}</h2>
      <p className="mb-5 mt-1 text-small text-ink-muted">{lede}</p>
      {children}
    </section>
  );
}
