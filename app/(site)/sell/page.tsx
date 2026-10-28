import type { Metadata } from "next";
import { SellPageClient } from "@/components/sell/SellPageClient";

export const metadata: Metadata = {
  title: "Sell your home",
  description:
    "Get a data-backed market analysis, full MLS exposure, and expert negotiation — or list a pre-construction assignment with HomeAtlas.",
};

/**
 * Seller landing page — layout matches HomeAtlasUI `SellPage.tsx`:
 * hero property entry, sticky valuation lead form, sold comps (sign-in gated),
 * why-sell advantages, market analysis form, and preconstruction assignment.
 */
export default function SellPage() {
  return <SellPageClient />;
}
