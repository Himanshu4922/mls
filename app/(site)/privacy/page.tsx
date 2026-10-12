import type { Metadata } from "next";
import { LegalDocument } from "@/components/company/LegalDocument";
import { COMPANY_UPDATED, PRIVACY } from "@/lib/content/company";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How HomeAtlas collects, uses, and safeguards personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      current="/privacy"
      title="Privacy Policy"
      updated={COMPANY_UPDATED}
      intro='HomeAtlas ("we", "our", or "us") is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website or use our services.'
      sections={PRIVACY}
    />
  );
}
