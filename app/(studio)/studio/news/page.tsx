import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorialManager } from "@/components/studio/site/EditorialManager";
import { EDITORIAL_RESOURCES } from "@/components/studio/site/editorialConfig";
import { apiFetch } from "@/lib/api/client";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "News" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ created?: string }> };

export default async function NewsPage({ searchParams }: PageProps) {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  const params = await searchParams;
  const config = EDITORIAL_RESOURCES.news;
  const body = await apiFetch<{ results: Array<Record<string, unknown>> }>("/api/home/studio/news/", {
    token: session.token,
  }).catch(() => ({ results: [] }));
  return (
    <EditorialManager
      resource={config.resource}
      title={config.title}
      lede={config.lede}
      rows={body.results}
      idKey={config.idKey}
      fields={config.fields}
      createHref="/studio/news/new"
      justCreated={params.created === "1"}
    />
  );
}
