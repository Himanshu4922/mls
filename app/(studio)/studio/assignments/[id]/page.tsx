import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SubmissionReviewPanel } from "@/components/studio/SubmissionReviewPanel";
import { SubmissionStatusPill } from "@/components/studio/StudioPills";
import { ApiError } from "@/lib/api/client";
import { getReviewSubmission, type ReviewSubmission } from "@/lib/api/studioAdmin";
import { requireStudioAccess } from "@/lib/auth/session";
import { formatDate, formatPrice } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Review submission" };
export const dynamic = "force-dynamic";

const money = (value: number | null) => (value === null ? "—" : formatPrice(value));
const dateOrDash = (value: string | null) => (value ? formatDate(value) : "—");

export default async function ReviewSubmissionPage({ params }: PageProps<"/studio/assignments/[id]">) {
  const session = await requireStudioAccess();
  if (!session || !session.user.isStaff) notFound();

  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id) || id <= 0) notFound();

  let submission: ReviewSubmission;
  try {
    submission = await getReviewSubmission(session.token, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <p role="alert" className="rounded-surface border border-negative/30 bg-surface p-4 text-small text-ink">
        We couldn&apos;t load this submission. Refresh to try again.
      </p>
    );
  }

  const photos = submission.media.filter((m) => m.type === "photo");
  const documents = submission.media.filter((m) => m.type !== "photo");
  const isAssignment = submission.purpose === "assignment";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/studio/assignments" className="text-caption text-ink-muted hover:text-navy">
          ← Review queue
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-h1 text-ink">{submission.title}</h1>
          <SubmissionStatusPill status={submission.status} label={submission.statusLabel} />
        </div>
        <p className="mt-1 text-small text-ink-muted">
          #{submission.id} · {submission.purposeLabel} · submitted {dateOrDash(submission.submittedAt)}
          {submission.reviewedAt && ` · last reviewed ${formatDate(submission.reviewedAt)}`}
          {submission.reviewedByEmail && ` by ${submission.reviewedByEmail}`}
          {submission.status === "approved" && isAssignment && (
            <>
              {" · "}
              <Link href={`/assignments/${submission.id}`} target="_blank" className="font-medium text-navy hover:underline">
                View public page ↗
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Section title={`Photos (${photos.length})`}>
            {photos.length === 0 ? (
              <p className="text-small text-ink-muted">No photos were uploaded.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {photos.map((photo) => (
                  <li key={photo.id}>
                    <a href={photo.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-control border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.name} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {documents.length > 0 && (
            <Section title="Floor plans and documents" note="Private: never shown on the public page.">
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 rounded-control border border-line px-3 py-2 text-small">
                    <span className="min-w-0 truncate text-ink">
                      <span className="text-ink-muted">{doc.typeLabel}:</span> {doc.name || "file"}
                    </span>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="shrink-0 font-medium text-navy hover:underline">
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Property">
            <Details
              rows={[
                ["Address", [submission.address, submission.addressLine2].filter(Boolean).join(", ")],
                ["City", [submission.city, submission.province, submission.postalCode].filter(Boolean).join(", ")],
                ["Property type", submission.propertyType],
                ["Bedrooms / bathrooms", `${submission.bedrooms ?? "—"} / ${submission.bathrooms ?? "—"}`],
                ["Interior area", submission.interiorAreaSqft ? `${submission.interiorAreaSqft.toLocaleString("en-CA")} sq ft` : "—"],
                [isAssignment ? "Asking price (to buyer)" : "Asking price", money(submission.askingPrice)],
                ["Available from", dateOrDash(submission.availableFrom)],
              ]}
            />
            {submission.description && (
              <div className="mt-4">
                <p className="text-caption font-medium text-ink-muted">Description</p>
                <p className="mt-1 whitespace-pre-line text-small text-ink">{submission.description}</p>
              </div>
            )}
          </Section>

          {isAssignment && (
            <Section title="Assignment" note="Purchase price, deposit and fee are private to reviewers.">
              <Details
                rows={[
                  ["Project (as submitted)", submission.projectName],
                  ["Builder", submission.builderName],
                  ["Occupancy date", dateOrDash(submission.occupancyDate)],
                  ["Original purchase price", money(submission.originalPurchasePrice)],
                  ["Deposit paid", money(submission.depositPaid)],
                  ["Assignment fee", money(submission.assignmentFee)],
                ]}
              />
            </Section>
          )}

          <Section title="Submitter" note="Private contact details.">
            <Details
              rows={[
                ["Name", submission.contactName],
                ["Type", submission.submitterTypeLabel],
                ["Email", submission.contactEmail],
                ["Phone", submission.contactPhone],
                ["Account", submission.submittedByEmail ?? "—"],
                ["Confirms ownership / right to sell", submission.ownershipConfirmed ? "Yes" : "No"],
                ["Consents to publication", submission.publicationConsent ? "Yes" : "No"],
                ["Submitted from", submission.submittedIp ?? "—"],
              ]}
            />
            {submission.submittedUserAgent && (
              <p className="mt-2 break-all text-caption text-ink-subtle">{submission.submittedUserAgent}</p>
            )}
          </Section>
        </div>

        <aside className="lg:sticky lg:top-0 lg:h-fit">
          {!submission.publicationConsent && (
            <p className="mb-4 rounded-control border border-gold/40 bg-gold-soft px-3 py-2 text-caption text-ink">
              The submitter did not consent to publication. Don&apos;t approve until they do.
            </p>
          )}
          <SubmissionReviewPanel key={submission.id} submission={submission} />
        </aside>
      </div>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="rounded-surface border border-line bg-surface p-5">
      <h2 className="text-h3 text-ink">{title}</h2>
      {note && <p className="mt-1 text-caption text-ink-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Details({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-caption text-ink-muted">{label}</dt>
          <dd className="text-small text-ink">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
