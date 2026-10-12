import type { Metadata } from "next";
import { LegalDocument } from "@/components/company/LegalDocument";
import { COMPANY_UPDATED, TERMS } from "@/lib/content/company";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "The terms that govern use of the HomeAtlas website and services.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalDocument
      current="/terms"
      title="Terms and Conditions"
      updated={COMPANY_UPDATED}
      intro="Please read these Terms and Conditions carefully before using the HomeAtlas website. These terms govern your use of our website and services."
      sections={TERMS}
    />
  );
}
