import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeaturedManager } from "@/components/studio/site/FeaturedManager";
import { apiFetch } from "@/lib/api/client";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Featured homes" };
export const dynamic = "force-dynamic";

export default async function FeaturedPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  let initial = { pins: [], results: [] };
  try {
    initial = await apiFetch("/api/mls/studio/featured/", { token: session.token });
  } catch {
    initial = { pins: [], results: [] };
  }
  return <FeaturedManager initial={initial} />;
}
