import type { Metadata } from "next";
import { InquiryForm } from "@/components/property/InquiryForm";
import { Eyebrow } from "@/components/ui/Badge";
import { resolveCompanyContact } from "@/lib/content/company";
import { getChromeDocument } from "@/lib/site/load";

export const metadata: Metadata = {
  title: "Contact HomeAtlas",
  description: "Reach HomeAtlas about buying or selling in the GTA. Call, email, or send a message.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const chrome = await getChromeDocument();
  const contact = resolveCompanyContact(chrome?.contact);
  return (
    <>
      <section className="bg-navy py-16">
        <div className="container-page">
          <Eyebrow>Get in touch</Eyebrow>
          <h1 className="mt-3 text-display text-white">Contact HomeAtlas</h1>
          <p className="mt-4 max-w-2xl text-body text-white/70">
            We&apos;d love to hear from you. Reach out for any questions about buying, selling, or our services.
          </p>
        </div>
      </section>

      <section className="container-page grid gap-10 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div>
          <h2 className="text-h2 text-ink">{contact.name}</h2>
          <p className="mt-1 text-small text-ink-muted">{contact.title}</p>

          <div className="mt-8 space-y-5 text-small">
            <div>
              <p className="text-caption text-ink-muted">Phone</p>
              {contact.phones.map((phone) => (
                <p key={phone.tel}>
                  <a href={`tel:${phone.tel}`} className="text-navy hover:underline">
                    {phone.label}: {phone.display}
                  </a>
                </p>
              ))}
            </div>
            <div>
              <p className="text-caption text-ink-muted">Email</p>
              <p>
                <a href={`mailto:${contact.email}`} className="text-navy hover:underline">
                  {contact.email}
                </a>
              </p>
            </div>
            <div>
              <p className="text-caption text-ink-muted">Office</p>
              <p className="text-ink">{contact.address}</p>
              <p className="mt-1">
                <a href={contact.mapUrl} target="_blank" rel="noopener noreferrer" className="text-navy hover:underline">
                  Open in Google Maps
                </a>
              </p>
            </div>
            <div>
              <p className="text-caption text-ink-muted">Hours</p>
              {contact.hours.map((row) => (
                <p key={row.days} className="text-ink">
                  {row.days}: {row.hours}
                </p>
              ))}
            </div>
          </div>
        </div>

        <InquiryForm listingKey="contact" address="HomeAtlas" variant="contact" />
      </section>
    </>
  );
}
