import type { Metadata } from "next";
import { LegalDocument } from "@/components/company/LegalDocument";
import { COMPANY_UPDATED, COOKIES } from "@/lib/content/company";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How HomeAtlas uses cookies and similar technologies on this website.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalDocument
      current="/cookies"
      title="Cookie Policy"
      updated={COMPANY_UPDATED}
      intro="This Cookie Policy explains how HomeAtlas uses cookies and similar technologies on our website. By continuing to use our website, you consent to our use of cookies as described in this policy."
      sections={COOKIES}
    />
  );
}
