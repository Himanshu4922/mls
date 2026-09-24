import type {
  ListingSubmission,
  ListingSubmissionInput,
  SubmissionPurpose,
  SubmitterType,
} from "@/lib/api/listingSubmissions";
import type { AuthUser } from "@/lib/types/domain";
import { formatPostal, normalizePostal } from "@/lib/utils/postal";
import { validateEmail, validateName, validatePhone } from "@/lib/utils/validation";

/**
 * Wizard form model.
 *
 * Keys are the backend field names so a server `{field: [msg]}` error lands on
 * the matching input with no translation table. Every value is held as the
 * string the input shows; conversion to the API shape happens in `payloadFor`.
 */
export interface ListingForm {
  purpose: SubmissionPurpose | null;
  submitter_type: SubmitterType;
  property_type: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  postal_code: string;
  bedrooms: string;
  bathrooms: string;
  interior_area_sqft: string;
  project_name: string;
  builder_name: string;
  occupancy_date: string;
  original_purchase_price: string;
  deposit_paid: string;
  assignment_fee: string;
  asking_price: string;
  available_from: string;
  description: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  ownership_confirmed: boolean;
  publication_consent: boolean;
}

export type FieldKey = keyof ListingForm;
export type FieldErrors = Partial<Record<string, string>>;

/** Shared props for the step components. */
export interface StepProps {
  form: ListingForm;
  errors: FieldErrors;
  set: <K extends FieldKey>(key: K, value: ListingForm[K]) => void;
}

/** Stable input id per field, also used to focus the first invalid input. */
export const fieldId = (key: FieldKey) => `listing-${key.replace(/_/g, "-")}`;

/** id + aria wiring matching the ids `Field` renders for its hint / error. */
export function controlProps(key: FieldKey, errors: FieldErrors) {
  const id = fieldId(key);
  return {
    id,
    name: key,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${id}-error` : undefined,
  };
}

export const PROPERTY_TYPES = [
  "Detached home",
  "Semi-detached home",
  "Townhouse",
  "Condo apartment",
  "Condo townhouse",
  "Multiplex",
  "Vacant land",
  "Commercial",
  "Other",
];

export const SUBMITTER_TYPES: Array<{ value: SubmitterType; label: string }> = [
  { value: "owner", label: "I own the property" },
  { value: "agent", label: "I'm the listing agent" },
  { value: "builder", label: "I'm the builder" },
];

export const STEP_LABELS = ["Details", "Pricing & contact", "Photos & submit"];

/** Which step owns each field, so a server error can send the user back to it. */
const STEP_FIELDS: FieldKey[][] = [
  [
    "purpose", "submitter_type", "property_type", "address_line_1", "address_line_2",
    "city", "postal_code", "bedrooms", "bathrooms", "interior_area_sqft",
    "project_name", "builder_name", "occupancy_date", "original_purchase_price",
    "deposit_paid", "assignment_fee",
  ],
  ["asking_price", "available_from", "description", "contact_name", "contact_email", "contact_phone"],
  ["ownership_confirmed", "publication_consent"],
];

export function stepOfField(field: string): number | null {
  const index = STEP_FIELDS.findIndex((fields) => (fields as string[]).includes(field));
  return index === -1 ? null : index;
}

export function emptyForm(user: AuthUser | null): ListingForm {
  return {
    purpose: null,
    submitter_type: "owner",
    property_type: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    postal_code: "",
    bedrooms: "",
    bathrooms: "",
    interior_area_sqft: "",
    project_name: "",
    builder_name: "",
    occupancy_date: "",
    original_purchase_price: "",
    deposit_paid: "",
    assignment_fee: "",
    asking_price: "",
    available_from: "",
    description: "",
    contact_name: user?.name ?? "",
    contact_email: user?.email ?? "",
    contact_phone: user?.phone ?? "",
    ownership_confirmed: false,
    publication_consent: false,
  };
}

/** DRF decimals arrive as "4.0" / "650000.00"; show them without noise. */
function decimalText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : "";
}

export function formFromSubmission(s: ListingSubmission, user: AuthUser | null): ListingForm {
  const base = emptyForm(user);
  return {
    ...base,
    purpose: s.purpose,
    submitter_type: s.submitter_type,
    property_type: s.property_type ?? "",
    address_line_1: s.address_line_1 ?? "",
    address_line_2: s.address_line_2 ?? "",
    city: s.city ?? "",
    postal_code: s.postal_code ? formatPostal(s.postal_code.replace(/\s+/g, "")) : "",
    bedrooms: decimalText(s.bedrooms),
    bathrooms: decimalText(s.bathrooms),
    interior_area_sqft: decimalText(s.interior_area_sqft),
    project_name: s.project_name ?? "",
    builder_name: s.builder_name ?? "",
    occupancy_date: s.occupancy_date ?? "",
    original_purchase_price: decimalText(s.original_purchase_price),
    deposit_paid: decimalText(s.deposit_paid),
    assignment_fee: decimalText(s.assignment_fee),
    asking_price: decimalText(s.asking_price),
    available_from: s.available_from ?? "",
    description: s.description ?? "",
    contact_name: s.contact_name || base.contact_name,
    contact_email: s.contact_email || base.contact_email,
    contact_phone: s.contact_phone || base.contact_phone,
    ownership_confirmed: Boolean(s.ownership_confirmed),
    publication_consent: Boolean(s.publication_consent),
  };
}

const orNull = (value: string) => (value.trim() === "" ? null : value.trim());

/**
 * API payload for one step. Step 0 also carries the contact fields because the
 * backend requires them to create the draft; they are prefilled from the
 * account, and step 1 lets the user change them.
 */
export function payloadFor(step: number, form: ListingForm): Partial<ListingSubmissionInput> {
  const contact = {
    contact_name: form.contact_name.trim(),
    contact_email: form.contact_email.trim(),
    contact_phone: form.contact_phone.trim(),
  };
  if (step === 0) {
    const assignment = form.purpose === "assignment";
    const sqft = orNull(form.interior_area_sqft);
    return {
      purpose: form.purpose ?? undefined,
      submitter_type: form.submitter_type,
      property_type: form.property_type,
      address_line_1: form.address_line_1.trim(),
      address_line_2: form.address_line_2.trim(),
      city: form.city.trim(),
      postal_code: normalizePostal(form.postal_code) ? formatPostal(normalizePostal(form.postal_code)!) : "",
      bedrooms: orNull(form.bedrooms),
      bathrooms: orNull(form.bathrooms),
      interior_area_sqft: sqft === null ? null : Number(sqft),
      // Switching away from "assignment" clears its details so a sale listing
      // never carries a stale purchase price into review.
      project_name: assignment ? form.project_name.trim() : "",
      builder_name: assignment ? form.builder_name.trim() : "",
      occupancy_date: assignment ? orNull(form.occupancy_date) : null,
      original_purchase_price: assignment ? orNull(form.original_purchase_price) : null,
      deposit_paid: assignment ? orNull(form.deposit_paid) : null,
      assignment_fee: assignment ? orNull(form.assignment_fee) : null,
      ...contact,
    };
  }
  if (step === 1) {
    return {
      asking_price: orNull(form.asking_price),
      available_from: orNull(form.available_from),
      description: form.description.trim(),
      ...contact,
    };
  }
  return {
    ownership_confirmed: form.ownership_confirmed,
    publication_consent: form.publication_consent,
  };
}

/** Client-side checks per step. Mirrors the serializer; the server still decides. */
export function validateStep(step: number, form: ListingForm): FieldErrors {
  const errors: FieldErrors = {};
  const need = (key: FieldKey, message: string) => {
    const value = form[key];
    if (typeof value === "string" ? !value.trim() : !value) errors[key] = message;
  };

  if (step === 0) {
    need("purpose", "Choose what you're listing.");
    need("property_type", "Choose a property type.");
    need("address_line_1", "Enter the street address.");
    need("city", "Enter the city.");
    if (form.postal_code.trim()) {
      const code = normalizePostal(form.postal_code);
      if (!code || code.length !== 6) errors.postal_code = "Enter a full postal code, like L7A 3K9.";
    }
    for (const key of ["bedrooms", "bathrooms"] as const) {
      if (form[key] && Number(form[key]) > 99) errors[key] = "That looks too high.";
    }
    if (form.purpose === "assignment") {
      need("project_name", "Enter the pre-construction project name.");
      need("builder_name", "Enter the builder name.");
      need("occupancy_date", "Enter the expected occupancy date.");
      need("original_purchase_price", "Enter the original purchase price.");
    }
  } else if (step === 1) {
    need("asking_price", form.purpose === "rent" ? "Enter the monthly rent." : "Enter an asking price.");
    const name = validateName(form.contact_name);
    const email = validateEmail(form.contact_email);
    const phone = validatePhone(form.contact_phone);
    if (name) errors.contact_name = name;
    if (email) errors.contact_email = email;
    if (phone) errors.contact_phone = phone;
  } else {
    if (!form.ownership_confirmed) {
      errors.ownership_confirmed = "Confirm you own or are authorized to list this property.";
    }
    if (!form.publication_consent) {
      errors.publication_consent = "Consent is required before we can publish the listing.";
    }
  }
  return errors;
}
