"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { RichTextEditor } from "@/components/studio/RichTextEditor";
import { StudioBack } from "@/components/studio/chrome";
import { ListingStatusPill } from "@/components/studio/StudioPills";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialogs";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Switch } from "@/components/ui/Switch";
import {
  generateListingKey,
  LISTING_MARKET_STATUSES,
  LISTING_PROPERTY_TYPES,
  LISTING_PUBLISH_STATUSES,
  type ListingPublishStatus,
  type StudioListing,
  type StudioListingInput,
} from "@/lib/api/estateListings";
import { HttpError } from "@/lib/queries/fetcher";
import { useDeleteListing, useSaveListing, useUploadListingMedia } from "@/lib/queries/studioAdmin";
import { estateListingPath, slugify } from "@/lib/seo/urls";

type NumberKey =
  | "listPrice"
  | "secondPrice"
  | "bedrooms"
  | "bathrooms"
  | "rooms"
  | "garages"
  | "buildingArea"
  | "landArea"
  | "yearBuilt"
  | "kitchens"
  | "taxAnnualAmount"
  | "taxYear"
  | "latitude"
  | "longitude";

interface FormState {
  title: string;
  listingKey: string;
  slug: string;
  publishStatus: ListingPublishStatus;
  standardStatus: string;
  propertyType: string;
  description: string;
  address: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  country: string;
  pricePrefix: string;
  afterPrice: string;
  pricePlaceholder: string;
  enablePricePlaceholder: boolean;
  sizePostfix: string;
  lotSize: string;
  garageSize: string;
  basement: string;
  exteriorFeatures: string;
  developer: string;
  listingId: string;
  customTags: string;
  expiresAt: string;
  isFeatured: boolean;
  images: string[];
  numbers: Record<NumberKey, string>;
}

function numText(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function initialState(listing: StudioListing | null): FormState {
  return {
    title: listing?.title ?? "",
    listingKey: listing?.listingKey ?? "",
    slug: listing?.slug ?? "",
    publishStatus: (LISTING_PUBLISH_STATUSES.find((s) => s.value === listing?.publishStatus)?.value ??
      "draft") as ListingPublishStatus,
    standardStatus: listing?.standardStatus || "Active",
    propertyType: listing?.propertyType ?? "",
    description: listing?.description ?? "",
    address: listing?.address ?? "",
    city: listing?.city ?? "",
    stateOrProvince: listing?.stateOrProvince || "ON",
    postalCode: listing?.postalCode ?? "",
    country: listing?.country || "Canada",
    pricePrefix: listing?.pricePrefix ?? "",
    afterPrice: listing?.afterPrice ?? "",
    pricePlaceholder: listing?.pricePlaceholder ?? "",
    enablePricePlaceholder: listing?.enablePricePlaceholder ?? false,
    sizePostfix: listing?.sizePostfix || "sqft",
    lotSize: listing?.lotSize ?? "",
    garageSize: listing?.garageSize ?? "",
    basement: listing?.basement ?? "",
    exteriorFeatures: listing?.exteriorFeatures ?? "",
    developer: listing?.developer ?? "",
    listingId: listing?.listingId ?? "",
    customTags: listing?.customTags ?? "",
    expiresAt: listing?.expiresAt ? listing.expiresAt.slice(0, 10) : "",
    isFeatured: listing?.isFeatured ?? false,
    images: listing?.images ?? [],
    numbers: {
      listPrice: numText(listing?.listPrice),
      secondPrice: numText(listing?.secondPrice),
      bedrooms: numText(listing?.bedrooms),
      bathrooms: numText(listing?.bathrooms),
      rooms: numText(listing?.rooms),
      garages: numText(listing?.garages),
      buildingArea: numText(listing?.buildingArea),
      landArea: numText(listing?.landArea),
      yearBuilt: numText(listing?.yearBuilt),
      kitchens: numText(listing?.kitchens),
      taxAnnualAmount: numText(listing?.taxAnnualAmount),
      taxYear: numText(listing?.taxYear),
      latitude: numText(listing?.latitude),
      longitude: numText(listing?.longitude),
    },
  };
}

export function buildListingPayload(form: FormState): StudioListingInput {
  const n = form.numbers;
  const title = form.title.trim();
  return {
    listing_key: form.listingKey.trim() || generateListingKey(),
    property_title: title,
    property_slug: form.slug.trim() || slugify(title),
    property_description: form.description,
    publish_status: form.publishStatus,
    standard_status: form.standardStatus || "Active",
    is_featured: form.isFeatured,
    list_price: parseNumber(n.listPrice),
    second_price: parseNumber(n.secondPrice),
    price_prefix: form.pricePrefix.trim(),
    after_price: form.afterPrice.trim(),
    price_placeholder: form.pricePlaceholder.trim(),
    enable_price_placeholder: form.enablePricePlaceholder,
    unparsed_address: form.address.trim(),
    city: form.city.trim(),
    state_or_province: form.stateOrProvince.trim() || "ON",
    postal_code: form.postalCode.trim(),
    country: form.country.trim() || "Canada",
    latitude: parseNumber(n.latitude),
    longitude: parseNumber(n.longitude),
    bedrooms_total: parseNumber(n.bedrooms),
    bathrooms_total_integer: parseNumber(n.bathrooms),
    rooms: parseNumber(n.rooms),
    garages: parseNumber(n.garages),
    garage_size: form.garageSize.trim(),
    building_area_total: parseNumber(n.buildingArea),
    size_postfix: form.sizePostfix.trim() || "sqft",
    land_area: parseNumber(n.landArea),
    lot_size: form.lotSize.trim(),
    year_built: parseNumber(n.yearBuilt),
    kitchens: parseNumber(n.kitchens),
    tax_annual_amount: parseNumber(n.taxAnnualAmount),
    tax_year: parseNumber(n.taxYear),
    basement: form.basement.trim(),
    exterior_features: form.exteriorFeatures.trim(),
    developer: form.developer.trim(),
    listing_id: form.listingId.trim(),
    custom_tags: form.customTags.trim(),
    expires_at: form.expiresAt.trim() || null,
    featured_image_url: form.images[0] ?? "",
    image_urls: form.images,
    type: form.propertyType ? [form.propertyType] : [],
    status: form.standardStatus ? [form.standardStatus] : [],
  };
}

export function ListingEditor({ listing }: { listing: StudioListing | null }) {
  const id = useId();
  const router = useRouter();
  const save = useSaveListing();
  const remove = useDeleteListing();
  const upload = useUploadListingMedia();
  const photoInput = useRef<HTMLInputElement>(null);

  const [saved, setSaved] = useState<StudioListing | null>(listing);
  const [form, setForm] = useState<FormState>(() => initialState(listing));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(buildListingPayload(form)) !== JSON.stringify(buildListingPayload(initialState(saved))),
    [form, saved],
  );

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setNotice(null);
  }

  function setNumber(key: NumberKey, value: string) {
    setForm((prev) => ({ ...prev, numbers: { ...prev.numbers, [key]: value } }));
    setNotice(null);
  }

  async function submit(statusOverride?: ListingPublishStatus) {
    setErrors({});
    setNotice(null);
    const next = statusOverride ? { ...form, publishStatus: statusOverride } : form;
    if (statusOverride) setForm(next);
    if (!next.title.trim()) {
      setErrors({ title: "Add a title so buyers know what this home is." });
      return;
    }
    try {
      const result = await save.mutateAsync({
        id: saved?.id ?? null,
        payload: buildListingPayload(next),
      });
      setSaved(result);
      setForm(initialState(result));
      setNotice(statusOverride === "publish" || next.publishStatus === "publish" ? "Published." : "Saved.");
      if (!saved) router.replace(`/studio/listings/${result.id}`);
    } catch (error) {
      if (error instanceof HttpError && Object.keys(error.fieldErrors).length) {
        setErrors(error.fieldErrors);
      }
    }
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const asset = await upload.mutateAsync(file);
        uploaded.push(asset.url);
      }
      setForm((prev) => ({ ...prev, images: [...prev.images, ...uploaded] }));
      setNotice(null);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Could not upload that photo.");
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= form.images.length) return;
    setForm((prev) => {
      const images = [...prev.images];
      const [item] = images.splice(index, 1);
      images.splice(next, 0, item);
      return { ...prev, images };
    });
  }

  async function confirmRemove() {
    if (!saved) return;
    setDeleteError(null);
    try {
      await remove.mutateAsync(saved.id);
      router.push("/studio/listings");
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete the listing.");
    }
  }

  const fid = (name: string) => `${id}-${name}`;
  const isLive = saved?.publishStatus === "publish";

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div className="min-w-0">
          <StudioBack href="/studio/listings">All brokerage listings</StudioBack>
          <p className="mt-3 text-caption font-medium text-ink-muted">Listings</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <h1 className="truncate text-h1 text-ink">{saved ? saved.title : "New brokerage listing"}</h1>
            {saved && <ListingStatusPill status={saved.publishStatus} />}
          </div>
          <p className="mt-1.5 max-w-2xl text-small text-ink-muted">
            Homes your team adds here — not from the MLS® feed. Fill in the details buyers need, add photos, then publish.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLive && saved && (
            <Link
              href={estateListingPath(saved.id)}
              target="_blank"
              className="text-caption font-medium text-ink-muted hover:text-navy"
            >
              View on site ↗
            </Link>
          )}
          {saved && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
          <Button type="submit" variant="secondary" size="sm" loading={save.isPending} disabled={!form.title.trim()}>
            Save
          </Button>
          {form.publishStatus !== "publish" && (
            <Button size="sm" onClick={() => void submit("publish")} disabled={save.isPending || !form.title.trim()}>
              Save and publish
            </Button>
          )}
        </div>
      </div>

      <ol className="flex flex-wrap gap-2 text-caption text-ink-muted">
        {["Basics & location", "Price & home details", "Photos & publish"].map((step, index) => (
          <li key={step} className="inline-flex items-center gap-2 rounded-control bg-surface-alt px-3 py-1.5">
            <span className="font-semibold text-navy">{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <div aria-live="polite">
        {save.error && (
          <p role="alert" className="rounded-control border border-negative/30 bg-negative-soft/40 px-3 py-2 text-small text-ink">
            {Object.keys(errors).length ? "Fix the highlighted fields and save again." : save.error.message}
          </p>
        )}
        {notice && !dirty && <p className="rounded-control bg-positive-soft px-3 py-2 text-small text-positive">{notice}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Panel title="Basics" description="What buyers see first — the name, ID, and story of the home.">
            <Field label="Listing title" htmlFor={fid("title")} required error={errors.title || errors.property_title}>
              <Input
                id={fid("title")}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Bright 3-bed freehold in Milton"
                maxLength={500}
                required
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Listing key"
                htmlFor={fid("key")}
                hint="Unique ID. Leave blank on a new listing and we generate one."
                error={errors.listing_key}
              >
                <Input
                  id={fid("key")}
                  value={form.listingKey}
                  onChange={(e) => set("listingKey", e.target.value)}
                  placeholder="Auto on save"
                  disabled={Boolean(saved)}
                />
              </Field>
              <Field label="Your reference / board ID" htmlFor={fid("listingId")} hint="Optional internal or board number.">
                <Input id={fid("listingId")} value={form.listingId} onChange={(e) => set("listingId", e.target.value)} />
              </Field>
            </div>
            <Field label="URL slug" htmlFor={fid("slug")} hint="Leave blank to generate from the title.">
              <Input id={fid("slug")} value={form.slug} onChange={(e) => set("slug", e.target.value)} maxLength={255} />
            </Field>
            <div className="space-y-1.5">
              <p className="text-small font-medium text-ink">Description</p>
              <p className="text-caption text-ink-muted">Tell the story of the home — rooms, finishes, neighbourhood.</p>
              <RichTextEditor value={form.description} onChange={(html) => set("description", html)} onUploadError={setUploadError} />
            </div>
          </Panel>

          <Panel title="Location" description="Street address and map pin.">
            <Field label="Street address" htmlFor={fid("address")} error={errors.unparsed_address}>
              <Input
                id={fid("address")}
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="123 Main St"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City" htmlFor={fid("city")}>
                <Input id={fid("city")} value={form.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="Province / state" htmlFor={fid("province")}>
                <Input id={fid("province")} value={form.stateOrProvince} onChange={(e) => set("stateOrProvince", e.target.value)} />
              </Field>
              <Field label="Postal code" htmlFor={fid("postal")}>
                <Input id={fid("postal")} value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
              </Field>
              <Field label="Country" htmlFor={fid("country")}>
                <Input id={fid("country")} value={form.country} onChange={(e) => set("country", e.target.value)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Latitude" htmlFor={fid("lat")} hint="Places the home on the map.">
                <Input
                  id={fid("lat")}
                  inputMode="decimal"
                  value={form.numbers.latitude}
                  onChange={(e) => setNumber("latitude", e.target.value)}
                />
              </Field>
              <Field label="Longitude" htmlFor={fid("lng")}>
                <Input
                  id={fid("lng")}
                  inputMode="decimal"
                  value={form.numbers.longitude}
                  onChange={(e) => setNumber("longitude", e.target.value)}
                />
              </Field>
            </div>
          </Panel>

          <Panel title="Pricing" description="Asking price and how it should read on the card.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="List price ($)" htmlFor={fid("price")} error={errors.list_price}>
                <Input
                  id={fid("price")}
                  inputMode="decimal"
                  value={form.numbers.listPrice}
                  onChange={(e) => setNumber("listPrice", e.target.value)}
                  placeholder="899000"
                />
              </Field>
              <Field label="Second price ($)" htmlFor={fid("second")} hint="Optional — e.g. lease amount.">
                <Input
                  id={fid("second")}
                  inputMode="decimal"
                  value={form.numbers.secondPrice}
                  onChange={(e) => setNumber("secondPrice", e.target.value)}
                />
              </Field>
              <Field label="Price prefix" htmlFor={fid("prefix")} hint='e.g. "From" or "Asking".'>
                <Input id={fid("prefix")} value={form.pricePrefix} onChange={(e) => set("pricePrefix", e.target.value)} />
              </Field>
              <Field label="After price" htmlFor={fid("after")} hint='e.g. "/mo" or "+ HST".'>
                <Input id={fid("after")} value={form.afterPrice} onChange={(e) => set("afterPrice", e.target.value)} />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-control border border-line px-4 py-3">
              <div>
                <p className="text-small font-medium text-ink">Use a price placeholder instead</p>
                <p className="text-caption text-ink-muted">Shows custom text like “Contact for price” instead of a number.</p>
              </div>
              <Switch
                checked={form.enablePricePlaceholder}
                onCheckedChange={(checked) => set("enablePricePlaceholder", checked)}
                aria-label="Use price placeholder"
              />
            </div>
            {form.enablePricePlaceholder && (
              <Field label="Placeholder text" htmlFor={fid("placeholder")}>
                <Input
                  id={fid("placeholder")}
                  value={form.pricePlaceholder}
                  onChange={(e) => set("pricePlaceholder", e.target.value)}
                  placeholder="Contact for price"
                />
              </Field>
            )}
          </Panel>

          <Panel title="Home details" description="Beds, baths, size, and the facts that belong on the listing card.">
            <Field label="Property type" htmlFor={fid("type")}>
              <Select id={fid("type")} value={form.propertyType} onChange={(e) => set("propertyType", e.target.value)}>
                <option value="">Select type</option>
                {LISTING_PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["bedrooms", "Bedrooms"],
                  ["bathrooms", "Bathrooms"],
                  ["rooms", "Total rooms"],
                  ["garages", "Garages / parking"],
                  ["kitchens", "Kitchens"],
                  ["yearBuilt", "Year built"],
                  ["buildingArea", "Living area"],
                  ["landArea", "Land area"],
                  ["taxAnnualAmount", "Annual taxes ($)"],
                  ["taxYear", "Tax year"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label} htmlFor={fid(key)}>
                  <Input
                    id={fid(key)}
                    inputMode="decimal"
                    value={form.numbers[key]}
                    onChange={(e) => setNumber(key, e.target.value)}
                  />
                </Field>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Size unit" htmlFor={fid("sizeUnit")} hint="Shown after living area.">
                <Input id={fid("sizeUnit")} value={form.sizePostfix} onChange={(e) => set("sizePostfix", e.target.value)} />
              </Field>
              <Field label="Lot size (text)" htmlFor={fid("lot")}>
                <Input
                  id={fid("lot")}
                  value={form.lotSize}
                  onChange={(e) => set("lotSize", e.target.value)}
                  placeholder="e.g. 40 x 100 ft"
                />
              </Field>
              <Field label="Garage size" htmlFor={fid("garageSize")}>
                <Input id={fid("garageSize")} value={form.garageSize} onChange={(e) => set("garageSize", e.target.value)} />
              </Field>
              <Field label="Basement" htmlFor={fid("basement")}>
                <Input
                  id={fid("basement")}
                  value={form.basement}
                  onChange={(e) => set("basement", e.target.value)}
                  placeholder="Finished, walk-out…"
                />
              </Field>
            </div>
            <Field label="Exterior features" htmlFor={fid("exterior")} hint="Comma-separated is fine.">
              <Textarea
                id={fid("exterior")}
                value={form.exteriorFeatures}
                onChange={(e) => set("exteriorFeatures", e.target.value)}
                className="min-h-20"
              />
            </Field>
            <Field label="Builder / developer" htmlFor={fid("developer")}>
              <Input id={fid("developer")} value={form.developer} onChange={(e) => set("developer", e.target.value)} />
            </Field>
            <Field label="Tags" htmlFor={fid("tags")} hint="Comma-separated labels, e.g. Waterfront, Luxury.">
              <Input id={fid("tags")} value={form.customTags} onChange={(e) => set("customTags", e.target.value)} />
            </Field>
          </Panel>

          <Panel
            title="Photos"
            description="The first photo is the cover on cards and the listing page. Use the arrows to reorder."
          >
            {form.images.length === 0 ? (
              <p className="rounded-control bg-surface-alt px-4 py-3 text-small text-ink-muted">
                No photos yet. Upload clear exterior and interior shots.
              </p>
            ) : (
              <ul className="space-y-2">
                {form.images.map((url, index) => (
                  <li key={`${url}-${index}`} className="flex items-center gap-3 rounded-control border border-line p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-14 w-20 shrink-0 rounded-control object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-caption text-ink-muted">{url}</p>
                      {index === 0 && <span className="text-caption font-medium text-navy">Cover</span>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <IconAction label="Move up" onClick={() => moveImage(index, -1)} disabled={index === 0}>
                        ↑
                      </IconAction>
                      <IconAction
                        label="Move down"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === form.images.length - 1}
                      >
                        ↓
                      </IconAction>
                      <IconAction
                        label="Remove"
                        onClick={() => set("images", form.images.filter((_, i) => i !== index))}
                      >
                        ×
                      </IconAction>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={photoInput}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                aria-label="Upload photos"
                onChange={(e) => {
                  void uploadFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button size="sm" variant="secondary" onClick={() => photoInput.current?.click()} loading={upload.isPending}>
                Upload photos
              </Button>
              {uploadError && <p className="text-caption text-negative">{uploadError}</p>}
            </div>
          </Panel>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-0 lg:h-fit">
          <Panel title="Publishing">
            <Field label="Visibility" htmlFor={fid("publish")} hint="Only Published listings appear on the public site.">
              <Select
                id={fid("publish")}
                value={form.publishStatus}
                onChange={(e) => set("publishStatus", e.target.value as ListingPublishStatus)}
              >
                {LISTING_PUBLISH_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Market status" htmlFor={fid("market")}>
              <Select id={fid("market")} value={form.standardStatus} onChange={(e) => set("standardStatus", e.target.value)}>
                {LISTING_MARKET_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Expires on" htmlFor={fid("expires")} hint="Optional. Leave blank for no expiry.">
              <Input
                id={fid("expires")}
                type="date"
                value={form.expiresAt}
                onChange={(e) => set("expiresAt", e.target.value)}
              />
            </Field>
            <div className="flex items-center justify-between gap-4 rounded-control border border-line px-4 py-3">
              <div>
                <p className="text-small font-medium text-ink">Featured</p>
                <p className="text-caption text-ink-muted">Highlight this home in brokerage rails.</p>
              </div>
              <Switch
                checked={form.isFeatured}
                onCheckedChange={(checked) => set("isFeatured", checked)}
                aria-label="Featured listing"
              />
            </div>
          </Panel>

          <Panel title="Checklist">
            <ul className="space-y-2 text-small text-ink-muted">
              <Check ok={Boolean(form.title.trim())}>Title</Check>
              <Check ok={Boolean(form.address.trim() || form.city.trim())}>Address or city</Check>
              <Check ok={Boolean(form.numbers.listPrice.trim()) || form.enablePricePlaceholder}>Price or placeholder</Check>
              <Check ok={form.images.length > 0}>At least one photo</Check>
              <Check ok={Boolean(form.description.replace(/<[^>]+>/g, "").trim())}>Description</Check>
            </ul>
          </Panel>

          {saved && (
            <p className="text-caption text-ink-subtle">
              Listing #{saved.id}
              {saved.listingKey ? ` · ${saved.listingKey}` : ""}
            </p>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => {
          setConfirmDelete(false);
          setDeleteError(null);
        }}
        onConfirm={() => void confirmRemove()}
        title="Delete this listing?"
        confirmLabel="Delete listing"
        tone="danger"
        busy={remove.isPending}
        error={deleteError}
      >
        <p>
          <strong className="text-ink">{saved?.title}</strong> and its photos will be permanently deleted.
          {isLive && " It is live now, so its public page will stop working."} To hide it without deleting, set visibility
          to Draft or Private.
        </p>
      </ConfirmDialog>
    </form>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-surface border border-line bg-surface p-5">
      <div>
        <h2 className="text-h3 text-ink">{title}</h2>
        {description && <p className="mt-1 text-caption text-ink-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={
          ok
            ? "flex h-5 w-5 items-center justify-center rounded-full bg-positive-soft text-caption font-semibold text-positive"
            : "flex h-5 w-5 items-center justify-center rounded-full bg-surface-alt text-caption text-ink-subtle"
        }
      >
        {ok ? "✓" : "·"}
      </span>
      <span className={ok ? "text-ink" : undefined}>{children}</span>
    </li>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-control border border-line text-ink-muted transition-colors hover:border-navy hover:text-navy disabled:opacity-40"
    >
      {children}
    </button>
  );
}
