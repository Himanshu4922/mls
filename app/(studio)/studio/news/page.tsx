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
      lede="Headlines ingested from the feeds. Hide an off-topic item and it drops off the homepage. New headlines arrive from the feed, not from this screen."
      rows={body.results}
      idKey="id"
      fields={["title", "source", "is_hidden"]}
    />
  );
}
