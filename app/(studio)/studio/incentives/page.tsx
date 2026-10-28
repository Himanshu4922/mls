import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorialManager } from "@/components/studio/site/EditorialManager";
import { apiFetch } from "@/lib/api/client";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Incentives" };
export const dynamic = "force-dynamic";

export default async function IncentivesPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  const body = await apiFetch<{ results: Array<Record<string, unknown>> }>("/api/home/studio/incentives/", { token: session.token }).catch(() => ({ results: [] }));
  return (
    <EditorialManager
      resource="incentives"
      title="Buyer incentives"
      lede="Programs shown in the homepage incentives section. Edit any row and click Save. Turn “Show on the site” off to hide a program without deleting it."
      rows={body.results}
      idKey="id"
      fields={["title", "label", "icon", "amount_text", "description", "source_url", "reviewed_at", "is_active", "display_order"]}
      createBody={{ title: "New program", label: "Program", icon: "home", amount_text: "Amount", description: "Describe who qualifies.", is_active: true, display_order: 0 }}
    />
  );
}
