import { Suspense } from "react";
import { HeroFrame } from "@/components/home/HeroFrame";
import { ListingsFreshness, ListingsFreshnessFallback } from "@/components/home/ListingsFreshness";

export function Hero({ content }: { content?: Record<string, unknown> }) {
  return (
    <HeroFrame content={content}>
      <Suspense fallback={<ListingsFreshnessFallback />}>
        <ListingsFreshness />
      </Suspense>
    </HeroFrame>
  );
}
