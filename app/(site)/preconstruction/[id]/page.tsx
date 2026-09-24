import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { ListingActionBar } from "@/components/listing/ListingActionBar";
import { PreconSectionNav } from "@/components/precon/PreconSectionNav";
import {
  AmenitiesSection,
  BuyerInfoSection,
  DepositSection,
  FeaturesSection,
  HomeCollectionsSection,
  IncentivesSection,
  NearbySection,
} from "@/components/precon/PreconSections";
import { SimilarPrecon } from "@/components/precon/SimilarPrecon";
import { Gallery } from "@/components/property/Gallery";
import { JsonLd } from "@/components/seo/JsonLd";
import { ArticleBody } from "@/components/studio/ArticleBody";
import { Badge } from "@/components/ui/Badge";
import { KeyFacts, SectionCard } from "@/components/ui/SectionCard";
import { ApiError } from "@/lib/api/client";
import {
  getPreconProject,
  salesStageLabel,
  type PreconProjectDetail,
} from "@/lib/api/preconstruction";
import {
  parsePreconSegment,
  preconCanonical,
  preconDescription,
  preconJsonLd,
} from "@/lib/precon/seo";
import { formatNumber, formatPrice } from "@/lib/utils/format";

export const revalidate = 300;

/**
 * Mirrors the property detail route's error handling: null only when the
 * backend genuinely reports the project is missing. A network or 5xx failure
 * is re-thrown so the error boundary shows "something went wrong" rather than
 * claiming the project does not exist.
 */
async function load(segment: string): Promise<PreconProjectDetail | null> {
  const id = parsePreconSegment(segment);
  if (id === null) return null;
  try {
    return await getPreconProject(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/preconstruction/[id]">): Promise<Metadata> {
  const { id } = await params;

  let project: PreconProjectDetail | null = null;
  try {
    project = await load(id);
  } catch {
    return { title: "Project unavailable" };
  }
  if (!project) return { title: "Project not found" };

  const title = project.seoTitle ?? project.title;
  const description = preconDescription(project);
  return {
    title,
    description,
    alternates: { canonical: preconCanonical(project) },
    openGraph: {
      title,
      description,
      url: preconCanonical(project),
      ...(project.images[0] ? { images: [{ url: project.images[0] }] } : {}),
    },
  };
}

export default async function PreconProjectPage({
  params,
}: PageProps<"/preconstruction/[id]">) {
  const { id: segment } = await params;
  const project = await load(segment);
  if (!project) notFound();

  // `/preconstruction/{id}-{slug}` is canonical; the bare id (old links) or a
  // stale slug 308s to it so ranking signals collect on one URL.
  const canonical = preconCanonical(project);
  if (`/preconstruction/${segment}` !== canonical) permanentRedirect(canonical);

  const stage = salesStageLabel(project.salesStage);
  const price = project.priceDisplay ?? (project.price ? formatPrice(project.price) : null);
  const unit = project.areaUnit;

  const sections = [
    { id: "facts", label: "Key facts", show: true },
    { id: "about", label: "About", show: Boolean(project.overviewHtml || project.excerpt) },
    { id: "deposit", label: "Deposits", show: project.depositPlans.length > 0 },
    { id: "incentives", label: "Incentives", show: project.incentives.length > 0 },
    { id: "collections", label: "Home collections", show: project.homeCollections.length > 0 },
    {
      id: "amenities",
      label: "Amenities",
      show: project.amenities.length > 0 || project.communityHighlights.length > 0,
    },
    {
      id: "features",
      label: "Features",
      show: project.interiorFeatures.length > 0 || project.exteriorFeatures.length > 0,
    },
    { id: "nearby", label: "Nearby", show: project.nearbyPlaces.length > 0 },
    {
      id: "buyer",
      label: "Buyer info",
      show: project.buyerInformation.length > 0 || project.purchaseNotes.length > 0,
    },
  ]
    .filter((section) => section.show)
    .map(({ id, label }) => ({ id, label }));

  return (
    <article className="container-page py-8">
      <JsonLd data={preconJsonLd(project)} />

      <nav aria-label="Breadcrumb" className="mb-5">
        <Link
          href="/preconstruction"
          className="inline-flex items-center gap-1.5 text-small text-ink-muted transition-colors hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M14.25 9H3.75M9 14.25 3.75 9 9 3.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to preconstruction
        </Link>
      </nav>

      <Gallery
        images={project.images.map((url) => ({ url, category: null, isPreferred: false }))}
        address={project.title}
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <Header project={project} stage={stage} price={price} />

          <div className="mt-6">
            <PreconSectionNav sections={sections} />
          </div>

          <div className="mt-6 space-y-6">
            <SectionCard id="facts" title="Key facts">
              <KeyFacts
                items={[
                  { label: "Developer", value: project.developer },
                  { label: "Occupancy", value: project.occupancy },
                  { label: "Sales stage", value: stage },
                  { label: "Home types", value: project.propertyTypes.join(", ") || null },
                  { label: "Style", value: project.propertyStyle },
                  { label: "Starting price", value: price },
                  { label: "Bedrooms", value: project.bedroomRange },
                  { label: "Bathrooms", value: project.bathroomRange },
                  {
                    label: "Interior",
                    value: project.areaRange ? `${project.areaRange} ${unit}` : null,
                  },
                  { label: "Parking", value: project.garageCount },
                  {
                    label: "Lot size",
                    value: project.lotSize !== null ? formatNumber(project.lotSize) : null,
                  },
                  { label: "Total deposit", value: project.depositTotal },
                  { label: "Location", value: project.location },
                ]}
              />
            </SectionCard>

            {(project.overviewHtml || project.excerpt) && (
              <SectionCard id="about" title="About this project">
                {project.overviewHtml ? (
                  // WordPress HTML: sanitized in ArticleBody, never rendered raw.
                  <ArticleBody html={project.overviewHtml} emptyMessage="" />
                ) : (
                  <p className="whitespace-pre-line text-body leading-relaxed text-ink-soft">
                    {project.excerpt}
                  </p>
                )}
              </SectionCard>
            )}

            <DepositSection plans={project.depositPlans} total={project.depositTotal} />
            <IncentivesSection incentives={project.incentives} />
            <HomeCollectionsSection
              collections={project.homeCollections}
              projectId={project.id}
              hasFloorPlan={project.documents.floorPlan}
            />
            <AmenitiesSection
              amenities={project.amenities}
              highlights={project.communityHighlights}
            />
            <FeaturesSection
              interior={project.interiorFeatures}
              exterior={project.exteriorFeatures}
            />
            <NearbySection places={project.nearbyPlaces} />
            <BuyerInfoSection info={project.buyerInformation} notes={project.purchaseNotes} />
          </div>

          <p className="mt-10 text-caption text-ink-subtle">
            Preconstruction details, pricing and availability are provided by the
            developer and are subject to change without notice.
          </p>
        </div>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <ListingActionBar
            projectId={project.id}
            title={project.title}
            documents={project.documents}
          />
        </aside>
      </div>

      <Suspense fallback={null}>
        <SimilarPrecon projectId={project.id} />
      </Suspense>
    </article>
  );
}

function Header({
  project,
  stage,
  price,
}: {
  project: PreconProjectDetail;
  stage: string | null;
  price: string | null;
}) {
  // Stat chips (HomeAtlasUI PropertyDetailPage L247-259); missing ranges drop out.
  const chips = [
    project.bedroomRange && `${project.bedroomRange} bed`,
    project.bathroomRange && `${project.bathroomRange} bath`,
    project.areaRange && `${project.areaRange} ${project.areaUnit}`,
    project.occupancy && `Occupancy ${project.occupancy}`,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <header>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {stage && <Badge tone="navy">{stage}</Badge>}
          <h1 className="mt-3 text-h1 text-ink">{project.title}</h1>
          {project.developer && (
            <p className="mt-1 text-small font-medium text-ink-soft">By {project.developer}</p>
          )}
          {(project.address || project.location) && (
            <p className="mt-1 text-small text-ink-muted">{project.address ?? project.location}</p>
          )}
        </div>

        <div className="text-left sm:text-right">
          <p className="text-caption text-ink-muted">Starting from</p>
          <p className="text-display text-ink">{price ?? "TBA"}</p>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li
              key={chip}
              className="rounded-control border border-line bg-surface-alt px-3 py-1.5 text-caption font-medium text-ink"
            >
              {chip}
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
