"use client";

import { useEffect, type ReactNode } from "react";
import { DocumentEditor } from "@/components/studio/site/DocumentEditor";
import { TextControl } from "@/components/studio/site/fields";
import { TreeForm } from "@/components/studio/site/TreeForm";
import { COMPANY_CONTACT, COMPANY_SOCIALS, isGenericSocialHome } from "@/lib/content/company";
import type { ChromeDocument, SeoDocument } from "@/lib/site/types";
import { validateChrome, validateSeo, type FieldErrors } from "@/lib/site/validate";

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
            <EditorCard title="WhatsApp number" lede="Used by every WhatsApp button after you publish. Social profiles, the YouTube link, and the office details are edited under Socials and contact.">
              <TreeForm
                value={{ whatsapp: chrome.contact?.whatsapp ?? "" }}
                path="contact"
                errors={errors}
                onChange={(contact) =>
                  update({
                    ...chrome,
                    contact: { ...chrome.contact, whatsapp: (contact as { whatsapp: string }).whatsapp },
                  })
                }
              />
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
      lede="The banner, the short description, and the link columns. Social profiles and the YouTube link are edited under Socials and contact. You can use up to four columns. The MLS trademark sentence under the footer cannot be edited."
      validate={validateChrome}
      previewOf={(draft) => ({ kind: "footer", document: draft })}
    >
      {(draft, update, errors) => {
        const chrome = draft as ChromeDocument;
        const { socials, ...footerRest } = chrome.footer;
        return (
          <EditorCard title="Footer content" lede="Each column can hold up to eight links.">
            <TreeForm
              value={footerRest}
              path="footer"
              errors={errors}
              onChange={(footer) =>
                update({
                  ...chrome,
                  footer: { ...(footer as typeof footerRest), socials },
                })
              }
            />
          </EditorCard>
        );
      }}
    </DocumentEditor>
  );
}

type SocialNetwork = "facebook" | "instagram" | "youtube";

type CompanyView = {
  facebook: string;
  instagram: string;
  youtube: string;
  name: string;
  title: string;
  email: string;
  phones: Array<{ label: string; display: string }>;
  address: string;
  mapUrl: string;
  hours: Array<{ days: string; hours: string }>;
};

function profileHref(socials: ChromeDocument["footer"]["socials"] | undefined, network: SocialNetwork) {
  const row = socials?.find((item) => item.network === network);
  const fallback = COMPANY_SOCIALS.find((item) => item.network === network)?.href ?? "";
  if (!row) return fallback;
  if (!row.href.trim() || isGenericSocialHome(row.href)) return row.href.trim() ? fallback : "";
  return row.href;
}

function viewFromChrome(chrome: ChromeDocument): CompanyView {
  const contact = chrome.contact;
  const phones = Array.isArray(contact?.phones)
    ? contact.phones.slice(0, 2).map((phone) => ({ label: phone.label || "", display: phone.display || "" }))
    : COMPANY_CONTACT.phones.map(({ label, display }) => ({ label, display }));
  while (phones.length < 2) phones.push({ label: "", display: "" });
  const hours = Array.isArray(contact?.hours)
    ? contact.hours.slice(0, 4).map((row) => ({ days: row.days || "", hours: row.hours || "" }))
    : COMPANY_CONTACT.hours.map(({ days, hours: when }) => ({ days, hours: when }));
  while (hours.length < 3) hours.push({ days: "", hours: "" });
  return {
    facebook: profileHref(chrome.footer?.socials, "facebook"),
    instagram: profileHref(chrome.footer?.socials, "instagram"),
    youtube: profileHref(chrome.footer?.socials, "youtube"),
    name: typeof contact?.name === "string" ? contact.name : COMPANY_CONTACT.name,
    title: typeof contact?.title === "string" ? contact.title : COMPANY_CONTACT.title,
    email: typeof contact?.email === "string" ? contact.email : COMPANY_CONTACT.email,
    phones,
    address: typeof contact?.address === "string" ? contact.address : COMPANY_CONTACT.address,
    mapUrl: typeof contact?.mapUrl === "string" ? contact.mapUrl : COMPANY_CONTACT.mapUrl,
    hours,
  };
}

function applyCompany(chrome: ChromeDocument, view: CompanyView): ChromeDocument {
  const phones = view.phones.filter((phone) => phone.label.trim() || phone.display.trim());
  const hours = view.hours.filter((row) => row.days.trim() || row.hours.trim());
  return {
    ...chrome,
    footer: {
      ...chrome.footer,
      socials: [
        { network: "facebook", href: view.facebook.trim() },
        { network: "instagram", href: view.instagram.trim() },
        { network: "youtube", href: view.youtube.trim() },
      ],
    },
    contact: {
      ...chrome.contact,
      whatsapp: chrome.contact?.whatsapp ?? "",
      name: view.name,
      title: view.title,
      email: view.email,
      phones,
      address: view.address,
      mapUrl: view.mapUrl.trim(),
      hours,
    },
  };
}

function companyMatches(chrome: ChromeDocument, view: CompanyView) {
  const next = applyCompany(chrome, view);
  const currentSocials = chrome.footer?.socials ?? [];
  const socialsMatch =
    next.footer.socials.length === currentSocials.length &&
    next.footer.socials.every((item, index) => {
      const current = currentSocials[index];
      return current?.network === item.network && current.href === item.href;
    });
  const contact = chrome.contact;
  const savedPhones = contact?.phones ?? [];
  const savedHours = contact?.hours ?? [];
  return (
    socialsMatch &&
    (contact?.name ?? "") === view.name &&
    (contact?.title ?? "") === view.title &&
    (contact?.email ?? "") === view.email &&
    (contact?.address ?? "") === view.address &&
    (contact?.mapUrl ?? "") === view.mapUrl.trim() &&
    savedPhones.length === next.contact.phones!.length &&
    savedPhones.every((phone, index) => phone.label === next.contact.phones![index].label && phone.display === next.contact.phones![index].display) &&
    savedHours.length === next.contact.hours!.length &&
    savedHours.every((row, index) => row.days === next.contact.hours![index].days && row.hours === next.contact.hours![index].hours)
  );
}

export function SocialsContactEditor() {
  return (
    <DocumentEditor
      siteKey="chrome"
      title="Socials and contact"
      lede="Facebook, Instagram, YouTube, and the phone, email, address, and hours shown on the contact page. These are the only fields on this screen. Publish to update the live site."
      validate={validateChrome}
      previewOf={(draft) => ({ kind: "footer", document: draft })}
    >
      {(draft, update, errors) => (
        <SocialsContactForm chrome={draft as ChromeDocument} errors={errors} update={update} />
      )}
    </DocumentEditor>
  );
}

function SocialsContactForm({
  chrome,
  errors,
  update,
}: {
  chrome: ChromeDocument;
  errors: FieldErrors;
  update: (next: unknown) => void;
}) {
  const view = viewFromChrome(chrome);
  useEffect(() => {
    const next = viewFromChrome(chrome);
    if (!companyMatches(chrome, next)) update(applyCompany(chrome, next));
  }, [chrome, update]);

  function write(next: CompanyView) {
    update(applyCompany(chrome, next));
  }

  return (
    <div className="space-y-8">
      <EditorCard title="Social and video links" lede="Each address must start with https. YouTube can be the channel or a single video. Leave a box blank to hide that icon.">
        <div className="space-y-4">
          <TextControl label="Facebook" value={view.facebook} max={300} error={errors["footer.socials.0.href"]} hint="Profile link" onChange={(facebook) => write({ ...view, facebook })} />
          <TextControl label="Instagram" value={view.instagram} max={300} error={errors["footer.socials.1.href"]} hint="Profile link" onChange={(instagram) => write({ ...view, instagram })} />
          <TextControl label="YouTube" value={view.youtube} max={300} error={errors["footer.socials.2.href"]} hint="Channel or video link" onChange={(youtube) => write({ ...view, youtube })} />
        </div>
      </EditorCard>
      <EditorCard title="Office and contact" lede="Shown on the contact page. Phone numbers should include the country code, the way a visitor would dial them.">
        <div className="space-y-4">
          <TextControl label="Name" value={view.name} max={80} error={errors["contact.name"]} onChange={(name) => write({ ...view, name })} />
          <TextControl label="Title" value={view.title} max={80} error={errors["contact.title"]} onChange={(title) => write({ ...view, title })} />
          <TextControl label="Email" value={view.email} max={120} error={errors["contact.email"]} onChange={(email) => write({ ...view, email })} />
          {view.phones.map((phone, index) => (
            <div key={index} className="grid gap-4 sm:grid-cols-2">
              <TextControl
                label={`Phone ${index + 1} label`}
                value={phone.label}
                max={24}
                error={errors[`contact.phones.${index}.label`] || errors[`contact.phones.${index}`]}
                onChange={(label) => {
                  const phones = view.phones.map((item, itemIndex) => (itemIndex === index ? { ...item, label } : item));
                  write({ ...view, phones });
                }}
              />
              <TextControl
                label={`Phone ${index + 1} number`}
                value={phone.display}
                max={40}
                error={errors[`contact.phones.${index}.display`]}
                onChange={(display) => {
                  const phones = view.phones.map((item, itemIndex) => (itemIndex === index ? { ...item, display } : item));
                  write({ ...view, phones });
                }}
              />
            </div>
          ))}
          <TextControl label="Office address" value={view.address} max={160} error={errors["contact.address"]} onChange={(address) => write({ ...view, address })} />
          <TextControl label="Google Maps link" value={view.mapUrl} max={300} error={errors["contact.mapUrl"]} hint="A full https link" onChange={(mapUrl) => write({ ...view, mapUrl })} />
          {view.hours.map((row, index) => (
            <div key={index} className="grid gap-4 sm:grid-cols-2">
              <TextControl
                label={`Hours ${index + 1} days`}
                value={row.days}
                max={40}
                error={errors[`contact.hours.${index}.days`] || errors[`contact.hours.${index}`]}
                onChange={(days) => {
                  const hours = view.hours.map((item, itemIndex) => (itemIndex === index ? { ...item, days } : item));
                  write({ ...view, hours });
                }}
              />
              <TextControl
                label={`Hours ${index + 1} time`}
                value={row.hours}
                max={40}
                error={errors[`contact.hours.${index}.hours`]}
                onChange={(when) => {
                  const hours = view.hours.map((item, itemIndex) => (itemIndex === index ? { ...item, hours: when } : item));
                  write({ ...view, hours });
                }}
              />
            </div>
          ))}
        </div>
      </EditorCard>
    </div>
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
