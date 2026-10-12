/** Copy taken from the live HomeAtlas site (estate-4u.com), July 2026 legal pages and the About / Contact records. */

export const COMPANY_UPDATED = "July 2026";

export const COMPANY_CONTACT = {
  name: "Gunneet Singh",
  title: "REALTOR® | HomeAtlas",
  email: "info@estate-4u.com",
  phones: [
    { label: "Direct", display: "+1 (416) 821-4200", tel: "+14168214200" },
    { label: "Sales", display: "+1 (647) 515-2000", tel: "+16475152000" },
  ],
  address: "115 Matheson Blvd W, Unit 102, Mississauga L5R 1C6",
  mapUrl: "https://maps.app.goo.gl/UCdgZUYWUuVkrRAe9",
  hours: [
    { days: "Monday – Friday", hours: "9:00 AM – 7:00 PM" },
    { days: "Saturday", hours: "10:00 AM – 5:00 PM" },
    { days: "Sunday", hours: "By appointment" },
  ],
};

export const COMPANY_SOCIALS = [
  { network: "facebook" as const, label: "Facebook", href: "https://www.facebook.com/estate4uprec/" },
  { network: "instagram" as const, label: "Instagram", href: "https://www.instagram.com/estate4uprec/" },
  { network: "youtube" as const, label: "YouTube", href: "https://www.youtube.com/channel/UC7g87rmbTk4N8v5n4QAGfWw" },
];

/** Bare network homepages left in older footer content. A real profile has a path. */
export function isGenericSocialHome(href: string): boolean {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname.replace(/\/$/, "");
    return ["facebook.com", "instagram.com", "x.com", "twitter.com", "linkedin.com", "youtube.com"].includes(host) && path === "";
  } catch {
    return false;
  }
}

export function resolveSocials<T extends { network: string; href: string }>(socials?: T[] | null): T[] {
  const incoming = (socials ?? []).filter((item) => item.href);
  const useFallback = incoming.length === 0 || incoming.every((item) => isGenericSocialHome(item.href));
  return (useFallback ? COMPANY_SOCIALS : incoming) as T[];
}

function phoneTel(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return "";
}

/** Published chrome wins. Blank or missing fields keep the built-in HomeAtlas details. */
export function resolveCompanyContact(contact?: {
  name?: string;
  title?: string;
  email?: string;
  phones?: Array<{ label?: string; display?: string }>;
  address?: string;
  mapUrl?: string;
  hours?: Array<{ days?: string; hours?: string }>;
} | null) {
  if (!contact) return COMPANY_CONTACT;
  const phones = Array.isArray(contact.phones)
    ? contact.phones.flatMap((phone) => {
        const display = phone?.display?.trim() || "";
        const label = phone?.label?.trim() || "";
        const tel = phoneTel(display);
        if (!display || !tel) return [];
        return [{ label: label || "Phone", display, tel }];
      })
    : [];
  const hours = Array.isArray(contact.hours)
    ? contact.hours.flatMap((row) => {
        const days = row?.days?.trim() || "";
        const when = row?.hours?.trim() || "";
        if (!days || !when) return [];
        return [{ days, hours: when }];
      })
    : [];
  return {
    name: contact.name?.trim() || COMPANY_CONTACT.name,
    title: contact.title?.trim() || COMPANY_CONTACT.title,
    email: contact.email?.trim() || COMPANY_CONTACT.email,
    phones: phones.length ? phones : COMPANY_CONTACT.phones,
    address: contact.address?.trim() || COMPANY_CONTACT.address,
    mapUrl: contact.mapUrl?.trim() || COMPANY_CONTACT.mapUrl,
    hours: hours.length ? hours : COMPANY_CONTACT.hours,
  };
}

export const ABOUT = {
  eyebrow: "About HomeAtlas",
  title: "Real People. Real Guidance. Real Results.",
  description:
    "At HomeAtlas, real estate is about more than transactions — it's about people, families, and the places they call home.",
  person: "Gunneet Singh",
  role: "REALTOR® | HomeAtlas",
  badges: ["Family-First Approach", "GTA Expert", "Trusted Advisor"],
  quote: "\"Where dreams turn into Realty\" — Gunneet Singh",
  award: "Diamond Award Winner",
  awardYear: "2025",
  stats: [
    { value: "100M+", label: "In transactions" },
    { value: "7+", label: "Years in the GTA" },
    { value: "140+", label: "Families guided home" },
    { value: "5.0", label: "Client rating" },
  ],
  values: {
    eyebrow: "What we stand for",
    title: "Our values",
    description: "These principles guide everything we do and every decision we make on your behalf.",
    items: [
      {
        title: "People over transactions",
        body: "We don't sell homes. We help families find where they belong. Every recommendation we make is guided by your family's well-being, not the size of the commission.",
      },
      {
        title: "Transparent always",
        body: "No pressure. No hidden agendas. We tell you the truth about every property, every neighbourhood, and every price — even when it's not what you want to hear.",
      },
      {
        title: "Local knowledge, deep roots",
        body: "We've walked every street in Oakville, Milton, and Mississauga. Our hyper-local expertise helps you find homes — and communities — that truly fit your life.",
      },
      {
        title: "Relationships that last",
        body: "We aim to be your Realtor for life. Long after closing day, we're here for advice, referrals, and support whenever you need it.",
      },
    ],
  },
  story: {
    eyebrow: "Our story",
    title: "Built on a simple belief",
    body: "HomeAtlas was built on a simple belief: real estate should be about people, not properties. After years of working in the GTA market, Gunneet Singh founded HomeAtlas to create a premier experience rooted in honesty, local expertise, and a genuine commitment to helping families find a place they can truly call home. Today, HomeAtlas serves buyers and sellers across Oakville, Milton, Mississauga, Brampton, and Greater Toronto — with the same values that started it all: integrity, transparency, and an unwavering commitment to your family's future.",
    quote: "Every family deserves a guide who truly cares about where they end up. That's why I do this work.",
    mission: {
      title: "Our mission",
      body: "To make finding a family home a joyful, transparent, and empowering experience.",
    },
    vision: {
      title: "Our vision",
      body: "To be the most trusted real estate partner for GTA families.",
    },
  },
  awards: {
    eyebrow: "Recognition and excellence",
    title: "Awards and accolades",
    description:
      "Recognized year after year for sales leadership, outstanding performance, and client excellence across Canada's top real estate networks.",
    items: [
      { year: "2021", title: "GOLD Award Winner", by: "Royal LePage Flower City Realty", body: "Awarded for exceptional professionalism and outstanding sales achievement." },
      { year: "2022", title: "Diamond Award", by: "TFN Platinum Realty", body: "Presented for achieving the highest tier of sales volume and client excellence." },
      { year: "2022", title: "Grand Master Platinum Winner", by: "TFN Platinum Realty", body: "One of the most prestigious designations in the TFN Platinum network." },
      { year: "2023", title: "Sapphire Award of Excellence", by: "TFN Realty", body: "Recognised for sustained excellence, outstanding client results, and exceptional sales leadership." },
      { year: "2024", title: "Diamond Award of Excellence", by: "TFN Realty", body: "Awarded for outstanding sales achievement and consistent client excellence." },
      { year: "2024", title: "Top Sales Agent Award", by: "TFN Realty", body: "Recognised for exemplary results and consistently delivering the highest sales performance." },
      { year: "2024", title: "Top Pre-Construction Agent", by: "TFN Realty", body: "Awarded for leading pre-construction sales with unmatched expertise and client satisfaction." },
      { year: "2025", title: "Diamond Award", by: "RE/MAX Excellence Real Estate Brokerage", body: "RE/MAX Diamond status — highest tier of national sales achievement." },
    ],
  },
  team: {
    eyebrow: "The people behind HomeAtlas",
    title: "Meet our team",
    description: "A dedicated group of professionals committed to making your real estate journey seamless and rewarding.",
    people: [
      { name: "Gunneet Singh", role: "REALTOR®", image: "/images/company/gunneet.png" },
      { name: "Gurneet Walia", role: "REALTOR®", image: "/images/company/gurneet.png" },
    ],
  },
};

export interface LegalSection {
  title: string;
  body: string;
  aside?: string;
}

export const TERMS: LegalSection[] = [
  { title: "1. Acceptance of Terms", body: "By accessing or using the HomeAtlas website and services, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our services. These terms apply to all visitors, users, and others who access or use our website." },
  { title: "2. Use of Services", body: "Our services are provided for informational and real estate inquiry purposes only. You agree to use our website lawfully and not to misuse any information presented. You may not reproduce, duplicate, copy, sell, or exploit any portion of the service without our express written permission." },
  { title: "3. Real Estate Information Disclaimer", body: "All property listings, pricing, floor plans, incentives, and deposit structures displayed on this website are for informational purposes only and are subject to change without notice. HomeAtlas makes no representations or warranties regarding the accuracy, completeness, or fitness for any particular purpose of any information provided. Always verify details directly with the builder or listing agent." },
  { title: "4. Intellectual Property", body: "All content on this website — including text, graphics, logos, images, and software — is the property of HomeAtlas or its content suppliers and is protected by Canadian and international copyright laws. Unauthorized use of our content is prohibited." },
  { title: "5. Privacy", body: "Your use of our website is also governed by our Privacy Policy, which is incorporated by reference into these Terms and Conditions. Please review our Privacy Policy to understand our practices." },
  { title: "6. Third-Party Links", body: "Our website may contain links to third-party websites that are not owned or controlled by HomeAtlas. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party websites. We strongly advise you to read the terms and conditions and privacy policies of any third-party websites you visit." },
  { title: "7. Limitation of Liability", body: "To the maximum extent permitted by law, HomeAtlas shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the service, even if HomeAtlas has been advised of the possibility of such damages." },
  { title: "8. Indemnification", body: "You agree to defend, indemnify, and hold harmless HomeAtlas, its agents, and employees from any claims, liabilities, damages, losses, and expenses arising out of your use of the website or violation of these terms." },
  { title: "9. Governing Law", body: "These Terms shall be governed by and construed in accordance with the laws of the Province of Ontario and the federal laws of Canada applicable therein, without regard to conflict of law provisions." },
  { title: "10. Changes to Terms", body: "HomeAtlas reserves the right to modify these terms at any time. We will notify users of any changes by updating the date at the top of this page. Continued use of the service after changes constitutes acceptance of the revised terms." },
  { title: "11. Contact", body: "If you have any questions about these Terms and Conditions, please contact us at info@estate-4u.com or call +1 (416) 821-4200." },
];

export const PRIVACY: LegalSection[] = [
  { title: "1. Information We Collect", body: "We collect information you provide directly to us, such as when you fill out a contact form, register for VIP access, request a consultation, or communicate with us. This may include your name, email address, phone number, and any preferences or notes you share. We also automatically collect certain information when you visit our website, including your IP address, browser type, pages visited, and time spent on the site." },
  { title: "2. How We Use Your Information", body: "We use the information we collect to respond to your inquiries and provide real estate services, send you property listings, pricing updates, and market insights you request, improve our website and services, comply with legal obligations, and communicate important updates about properties you've expressed interest in. We do not sell your personal information to third parties." },
  { title: "3. Cookies and Tracking", body: "We use cookies and similar tracking technologies to enhance your browsing experience, remember your preferences, and analyze website traffic. You can control cookie settings through your browser preferences. Please see our Cookie Policy for more details." },
  { title: "4. Information Sharing", body: "We may share your information with trusted service providers who assist us in operating our website and conducting our business, subject to confidentiality agreements. We may also share information when required by law or to protect our rights. We may share de-identified, aggregated data that cannot reasonably be used to identify you." },
  { title: "5. Data Retention", body: "We retain your personal information for as long as necessary to provide our services and comply with legal obligations. You may request deletion of your personal information at any time by contacting us at info@estate-4u.com." },
  { title: "6. Your Rights (PIPEDA)", body: "Under Canada's Personal Information Protection and Electronic Documents Act (PIPEDA), you have the right to access your personal information we hold, correct inaccurate information, withdraw consent for certain uses, and request deletion of your data. To exercise these rights, please contact our Privacy Officer at info@estate-4u.com." },
  { title: "7. Canada's Anti-Spam Legislation (CASL)", body: "We comply with Canada's Anti-Spam Legislation (CASL). We will only send you commercial electronic messages (CEMs) — including emails, text messages, or other electronic communications promoting our services — if you have provided express or implied consent to receive them. Express consent is obtained when you actively opt in (e.g., checking a subscription box or submitting a contact form). Implied consent may exist where you have an existing business relationship with us, such as a prior purchase or inquiry within the preceding two years. Every CEM we send includes: a clear identification of HomeAtlas as the sender, our contact information, and a simple, functional unsubscribe mechanism. You may withdraw your consent at any time by clicking the unsubscribe link in any of our emails or by contacting us at info@estate-4u.com. Unsubscribe requests are honoured within 10 business days. We do not send unsolicited commercial messages and we do not share your contact information with third parties for the purpose of sending you their marketing materials." },
  { title: "8. Security", body: "We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security." },
  { title: "9. Third-Party Services", body: "Our website may use third-party services such as QuickAdPro (for lead capture forms), Chatbase (for AI chat), and Google Maps (for location features). These services have their own privacy policies governing the use of your information. We encourage you to review their policies." },
  { title: "10. Children's Privacy", body: "Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately." },
  { title: "11. Changes to This Policy", body: "We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on our website. Your continued use of our services after changes are posted constitutes your acceptance of the updated policy." },
  { title: "12. Contact Our Privacy Officer", body: "If you have questions, concerns, or requests regarding your personal information or this Privacy Policy, please contact us at: info@estate-4u.com | +1 (416) 821-4200 | 100 Milverton Dr #610, Mississauga, Ontario, L5R 4H1." },
];

export const COOKIES: LegalSection[] = [
  { title: "Strictly Necessary Cookies", aside: "Required · Examples: session cookies, security tokens", body: "These cookies are essential for the website to function and cannot be switched off. They are usually set in response to actions you take, such as setting privacy preferences, logging in, or filling in forms." },
  { title: "Performance & Analytics Cookies", aside: "Optional · Examples: Google Analytics, session duration tracking", body: "These cookies allow us to count visits and traffic sources so we can measure and improve website performance. They help us know which pages are most popular and see how visitors move around the site. All information collected is aggregated and therefore anonymous." },
  { title: "Functional Cookies", aside: "Optional · Examples: Chatbase widget, QuickAdPro form preferences", body: "These cookies enable the website to provide enhanced functionality and personalisation. They may be set by us or by third-party providers whose services we use, such as our chat widget and lead capture forms." },
  { title: "Marketing Cookies", aside: "Optional · Examples: Meta Pixel, Google Ads tracking", body: "These cookies may be set through our site by our advertising partners. They may be used to build a profile of your interests and show you relevant adverts on other sites. They do not store directly personal information, but are based on uniquely identifying your browser and internet device." },
  { title: "What Are Cookies?", body: "Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and to provide information to website owners. Cookies can be 'session cookies' that are deleted when you close your browser, or 'persistent cookies' that remain on your device for a set period of time." },
  { title: "How We Use Cookies", body: "We use cookies to remember your preferences and settings, analyse how you use our website, improve the functionality and performance of our site, and provide relevant content and advertising. We do not use cookies to collect sensitive personal information." },
  { title: "Third-Party Cookies", body: "Some cookies are placed by third-party services that appear on our website. These include QuickAdPro (lead capture forms), Chatbase (AI chat assistant), and Google Maps (location services). These third parties have their own privacy and cookie policies." },
  { title: "Managing Cookies", body: "You can control and manage cookies through your browser settings. Most browsers allow you to refuse cookies, accept or reject specific cookies, or delete cookies already stored on your device. Please note that disabling certain cookies may affect the functionality of our website." },
  { title: "Browser Controls", body: "To manage cookies in your browser: Chrome — Settings > Privacy and Security > Cookies and other site data. Firefox — Options > Privacy & Security > Cookies and Site Data. Safari — Preferences > Privacy. Edge — Settings > Cookies and Site Permissions." },
  { title: "Changes to This Policy", body: "We may update this Cookie Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. Please revisit this page periodically to stay informed about our use of cookies." },
];
