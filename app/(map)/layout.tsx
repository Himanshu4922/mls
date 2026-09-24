import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { AuthModal } from "@/components/auth/AuthModal";
import { PhoneVerifyModal } from "@/components/auth/PhoneVerifyModal";

/**
 * Full-bleed layout for the map: no announcement bar and no footer, matching
 * the reference where the map fills the viewport below the header.
 */
export default function MapLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main" className="flex-1 overflow-hidden">
        {children}
      </main>
      <AuthModal />
      <PhoneVerifyModal />
    </>
  );
}
