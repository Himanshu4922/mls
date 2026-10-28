import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorialManager } from "@/components/studio/site/EditorialManager";
import { apiFetch } from "@/lib/api/client";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Partners" };
export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  const body = await apiFetch<{ results: Array<Record<string, unknown>> }>("/api/home/studio/partners/", { token: session.token }).catch(() => ({ results: [] }));
  return (
    <EditorialManager
      resource="partners"
      title="Partners"
      lede="Trusted connections on the homepage. Edit any row and click Save. A website link opens in a new tab. Turn “Show on the site” off to hide a partner without deleting it."
      rows={body.results}
      idKey="id"
      fields={["name", "category", "description", "website_url", "logo_url", "is_active", "display_order"]}
      createBody={{ name: "New partner", category: "Mortgage", description: "", website_url: "", logo_url: "", is_active: true, display_order: 0 }}
    />
  );
}
