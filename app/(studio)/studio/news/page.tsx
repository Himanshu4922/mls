import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorialManager } from "@/components/studio/site/EditorialManager";
import { apiFetch } from "@/lib/api/client";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "News" };
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  const body = await apiFetch<{ results: Array<Record<string, unknown>> }>("/api/home/studio/news/", { token: session.token }).catch(() => ({ results: [] }));
  return (
    <EditorialManager
      resource="news"
      title="News"
      lede="Add headlines manually for the homepage Daily News strip, or hide an off-topic feed item. Feed ingest can still bring new stories in — hidden ones stay off the homepage."
      rows={body.results}
      idKey="id"
      fields={["title", "source", "url", "image_url", "is_hidden"]}
      createBody={{
        title: "New headline",
        source: "HomeAtlas",
        url: "https://www.homeatlas.ca/news/draft",
        image_url: "",
        is_hidden: false,
      }}
    />
  );
}
