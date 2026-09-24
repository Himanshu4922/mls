import Link from "next/link";
import type { ComponentType } from "react";
import {
  IconArrowRight,
  IconBuy,
  IconPrecon,
  IconRent,
  IconSell,
} from "@/components/home/icons";

/**
 * Quick-action cards under the hero (HomeAtlasUI HomePage L204-232).
 * Static by design — these are entry points, not data. Each card is a real
 * link (the reference used onClick buttons), so it is crawlable and
 * middle-clickable.
 */
const ACTIONS: Array<{
  label: string;
  desc: string;
  href: string;
  Icon: ComponentType<{ className?: string }>;
}> = [
  { label: "Buy", desc: "Browse MLS® listings", href: "/listings?status=Active", Icon: IconBuy },
  { label: "Rent", desc: "Find rental homes", href: "/listings?tx=rent", Icon: IconRent },
  { label: "Preconstruction", desc: "Invest early", href: "/preconstruction", Icon: IconPrecon },
  { label: "Sell", desc: "Request a home valuation", href: "/sell", Icon: IconSell },
];

export function QuickActions() {
  return (
    <section aria-label="Quick actions" className="bg-surface py-10 sm:py-14 lg:py-16">
      <div className="container-page">
        <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {ACTIONS.map(({ label, desc, href, Icon }) => (
            <li key={label} className="h-full">
              <Link
                href={href}
                className="group flex h-full flex-col gap-4 rounded-control border border-line bg-surface p-5 transition-all hover:border-gold/30 hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy sm:gap-6 sm:p-6"
              >
                <Icon className="transition-transform group-hover:scale-110" />
                <span>
                  <span className="block text-h2 text-ink">{label}</span>
                  <span className="mt-0.5 block text-small text-ink-muted">{desc}</span>
                </span>
                <span className="mt-auto flex items-center gap-1 text-small font-medium text-ink group-hover:text-navy">
                  Explore
                  <IconArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
