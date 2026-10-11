import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { getChromeDocument } from "@/lib/site/load";
import { AuthModal } from "@/components/auth/AuthModal";
import { PhoneVerifyModal } from "@/components/auth/PhoneVerifyModal";
import { AiAssistant } from "@/components/assistant/AiAssistant";

/**
 * Full-bleed layout for the map: no announcement bar and no footer, matching
 * the reference where the map fills the viewport below the header.
 */
export default async function MapLayout({ children }: { children: ReactNode }) {
  const chrome = await getChromeDocument();
  return (
    <>
      <Navbar links={chrome?.nav.links} ctaLabel={chrome?.nav.ctaLabel} ctaHref={chrome?.nav.ctaHref} />
      <main id="main" className="flex-1 overflow-hidden">
        {children}
      </main>
      <AuthModal />
      <PhoneVerifyModal />
      <AiAssistant />
    </>
  );
}
