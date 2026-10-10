import { NextResponse } from "next/server";
import { buildSitemap, sitemapToXml } from "@/lib/seo/buildSitemap";
import { sitemapIds } from "@/lib/seo/sitemap";

export const revalidate = 3600;

/** /sitemap/static.xml, /sitemap/blog.xml, /sitemap/listings-0.xml, and so on. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id: raw } = await context.params;
  const id = raw.endsWith(".xml") ? raw.slice(0, -4) : raw;
  const known = await sitemapIds();
  if (!known.includes(id)) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const xml = sitemapToXml(await buildSitemap(id));
  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
