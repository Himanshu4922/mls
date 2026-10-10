import { NextResponse } from "next/server";
import { absoluteUrl } from "@/components/seo/JsonLd";
import { sitemapIds } from "@/lib/seo/sitemap";

export const revalidate = 3600;

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Sitemap index at /sitemap.xml.
 *
 * Next serves each section at /sitemap/{id}.xml and does not emit this index,
 * so /sitemap.xml was falling through to the site 404. Crawlers and the
 * robots file use this address as the one entry point.
 */
export async function GET() {
  const ids = await sitemapIds();
  const entries = ids
    .map((id) => `  <sitemap><loc>${escapeXml(absoluteUrl(`/sitemap/${id}.xml`))}</loc></sitemap>`)
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;
  return new NextResponse(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
