import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorialManager } from "@/components/studio/site/EditorialManager";
import { apiFetch } from "@/lib/api/client";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Community photos" };
export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  const body = await apiFetch<{ results: Array<Record<string, unknown>> }>("/api/home/studio/community-images/", { token: session.token }).catch(() => ({ results: [] }));
  return (
    <EditorialManager
      resource="community-images"
      title="Community photos"
      lede="Photos for community tiles on the home page and /communities. Upload a new photo or paste a link, then Save. The city key must match the city name in lowercase, such as mississauga or richmond hill."
      rows={body.results}
      idKey="city_key"
      fields={["city_key", "city_label", "image_url", "credit"]}
      createBody={{ city_key: "new-city", city_label: "New city", image_url: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800", credit: "" }}
    />
  );
}
