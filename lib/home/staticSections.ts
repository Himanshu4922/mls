/**
 * Inline section data from HomeAtlasUI/src/pages/HomePage.tsx, ported verbatim.
 *
 * REFERENCE SAMPLE DATA, PENDING BACKEND. Investor yields, deals counts,
 * sold-below-purchase prices, school ratings, incentive amounts and the market
 * snapshot have no endpoint yet (see docs/HOMEPAGE_BACKEND_REQUIREMENTS.xlsx).
 * Per the product decision they render as the reference shows them until those
 * endpoints exist, and the sections carry an "illustration" caption wherever a
 * figure could be read as advice. Property ids point into
 * lib/home/sampleData.ts `properties`; they are not MLS® listings, so cards
 * link to a matching search, never to /property/<id>.
 */

import type { PropertyType } from "@/lib/home/sampleData";

/* HIGH RETURN PROPERTIES (reference L497-501) */

export interface InvestorPick {
  id: string;
  rentalYield: number;
  rentalIncome: number;
  capRate: number;
  desc: string;
}

export const investorPicks: InvestorPick[] = [
  { id: "p8", rentalYield: 5.2, rentalIncome: 2800, capRate: 4.1, desc: "Downtown rental with high demand" },
  { id: "p3", rentalYield: 4.8, rentalIncome: 3600, capRate: 3.9, desc: "Vaughan townhome — low vacancy area" },
  { id: "p11", rentalYield: 5.6, rentalIncome: 2200, capRate: 4.5, desc: "Mississauga condo — strong rental demand" },
];

/* GTA MARKET DEALS (reference L548-588) */

export type DealIcon = "distress" | "detached" | "powerOfSale" | "sold";
export type DealBadgeTone = "gold" | "navy" | "dark";

export interface MarketDeal {
  title: string;
  desc: string;
  icon: DealIcon;
  badge: string;
  badgeTone: DealBadgeTone;
  count: string;
  /** /listings params (see lib/utils/searchParams.ts). */
  query: { q?: string; type?: PropertyType; priceMax?: number; status?: string };
}

export const marketDeals: MarketDeal[] = [
  {
    title: "Distress Deals",
    desc: "Properties priced to move fast — motivated sellers, below-market opportunities.",
    icon: "distress",
    badge: "Urgent",
    badgeTone: "gold",
    count: "24 listings",
    query: { q: "distress" },
  },
  {
    title: "Detached Under $1M in GTA",
    desc: "Rare detached homes under $1 million in the Greater Toronto Area.",
    icon: "detached",
    badge: "Value",
    badgeTone: "navy",
    count: "31 listings",
    query: { type: "Detached", priceMax: 1000000 },
  },
  {
    title: "Power of Sale",
    desc: "Court-ordered and lender-owned properties — often below market value.",
    icon: "powerOfSale",
    badge: "Legal",
    badgeTone: "dark",
    count: "12 listings",
    query: { q: "power of sale" },
  },
  {
    title: "Just Sold",
    desc: "See the latest sold transactions to understand true market value.",
    icon: "sold",
    badge: "Recent",
    badgeTone: "gold",
    count: "189 sold",
    query: { status: "Sold" },
  },
];

/* SOLD BELOW LAST PURCHASE (reference L627-630) */

export interface SoldBelowPick {
  id: string;
  prevPrice: number;
  desc: string;
}

export const soldBelowPicks: SoldBelowPick[] = [
  { id: "s3", prevPrice: 1410000, desc: "Sold $70K below previous purchase" },
  { id: "s7", prevPrice: 1390000, desc: "Sold $95K below previous purchase" },
  { id: "s8", prevPrice: 1100000, desc: "Sold $75K below previous purchase" },
];

/* LISTINGS BY TOP-RATED SCHOOLS (reference L679-684) */

export interface TopSchool {
  school: string;
  rating: number;
  community: string;
  listings: number;
  img: string;
}

export const topSchools: TopSchool[] = [
  { school: "Westmount Collegiate", rating: 9.2, community: "Toronto", listings: 48, img: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=250&fit=crop" },
  { school: "Thornlea Secondary", rating: 8.9, community: "Markham", listings: 32, img: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&h=250&fit=crop" },
  { school: "White Oaks Secondary", rating: 8.7, community: "Oakville", listings: 27, img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=250&fit=crop" },
  { school: "St. Brother André", rating: 8.5, community: "Vaughan", listings: 41, img: "https://images.unsplash.com/photo-1605276373954-0c4a0dac5b12?w=400&h=250&fit=crop" },
];

/* BUYER'S INCENTIVES (reference L717-723) */

export type IncentiveIcon = "home" | "savings" | "green" | "construction" | "equity" | "retirement";

export interface BuyerIncentive {
  label: string;
  title: string;
  amount: string;
  desc: string;
  icon: IncentiveIcon;
}

export const buyerIncentives: BuyerIncentive[] = [
  { label: "FIRST-TIME BUYER", title: "First-Time Buyer Rebate", amount: "Up to $6,475", desc: "Ontario and Toronto land transfer tax rebates for first-time buyers purchasing their primary residence.", icon: "home" },
  { label: "TAX SAVINGS", title: "FHSA – Tax-Free Savings", amount: "Up to $40,000", desc: "The First Home Savings Account lets you save up to $8,000/year tax-free toward your first home.", icon: "savings" },
  { label: "GREEN HOMES", title: "Green Home Incentives", amount: "Up to $5,000", desc: "Federal rebates for purchasing energy-efficient homes or upgrading to qualify for green certification.", icon: "green" },
  { label: "NEW CONSTRUCTION", title: "GST/HST New Housing Rebate", amount: "Up to $24,000", desc: "Rebate for newly constructed or substantially renovated homes used as your primary residence.", icon: "construction" },
  { label: "SHARED EQUITY", title: "Shared Equity Program", amount: "5–10% Equity", desc: "CMHC's First-Time Home Buyer Incentive provides shared equity mortgage to reduce monthly payments.", icon: "equity" },
  { label: "RETIREMENT SAVINGS", title: "Home Buyers' Plan (RRSP)", amount: "Up to $35,000", desc: "Withdraw up to $35,000 from your RRSP tax-free to purchase or build your first qualifying home.", icon: "retirement" },
];

/* MARKET INTELLIGENCE (reference L768-819) */

export interface MarketStat {
  label: string;
  value: string;
  change: string;
  up: boolean;
}

export const gtaMarketSnapshot: MarketStat[] = [
  { label: "Avg. Sale Price", value: "$1,056K", change: "+3.2%", up: true },
  { label: "Days on Market", value: "24 days", change: "-5 days", up: false },
  { label: "Mortgage Rate", value: "5.14%", change: "+0.25%", up: true },
];

export const marketReportCities = ["Toronto", "Mississauga", "Vaughan", "Oakville"] as const;

export const soldDataTeaser: Array<{ label: string; value: string; highlight?: boolean }> = [
  { label: "Last 90 days", value: "1,842 homes" },
  { label: "Avg. sold price", value: "$1.08M" },
  { label: "Over asking", value: "62% of homes", highlight: true },
];
