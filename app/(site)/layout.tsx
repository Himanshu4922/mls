import type { ReactNode } from "react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthModal } from "@/components/auth/AuthModal";
import { PhoneVerifyModal } from "@/components/auth/PhoneVerifyModal";
import { CompareTray } from "@/components/property/CompareTray";

/** Chrome-wrapped pages. The map search route uses its own full-bleed layout. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <AuthModal />
      <PhoneVerifyModal />
      {/* Mounted at layout level so a compare selection survives navigation. */}
      <CompareTray />
    </>
  );
}
