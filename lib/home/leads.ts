import type { AuthUser } from "@/lib/types/domain";
import type { InquiryInput } from "@/lib/queries/inquiries";

/**
 * Builds an inquiry payload for the homepage lead forms from the signed-in
 * user's account details (the same fields InquiryForm prefills).
 */
export function leadFromUser(
  user: Pick<AuthUser, "name" | "email" | "phone">,
  fields: { intent: InquiryInput["intent"]; message: string; preferredLocations?: string },
): InquiryInput {
  const [firstName = "", ...rest] = user.name.trim().split(/\s+/);
  return {
    // first_name is required by the backend; an account with no display name
    // falls back to the email's local part rather than failing the lead.
    first_name: firstName || user.email.split("@")[0],
    last_name: rest.join(" "),
    email: user.email,
    phone: user.phone ?? "",
    intent: fields.intent,
    message: fields.message,
    preferred_locations: fields.preferredLocations ?? "",
    page_url: typeof window !== "undefined" ? window.location.href : undefined,
    listing_key: "",
  };
}
