import { hasVisibleHtml, sanitizeHtml } from "@/lib/utils/sanitizeHtml";

/**
 * Renders a post body from backend HTML.
 *
 * Shared by the public post page and the Studio preview so the two cannot drift
 * — a preview that renders differently from the live page is worse than no
 * preview, because it is trusted and wrong.
 *
 * Sanitizing here (not at the call site) means every consumer of post HTML is
 * covered by construction. The backend sanitizes on write too; this is the
 * second layer, not the only one.
 */
export function ArticleBody({
  html,
  emptyMessage = "This article doesn't have a body yet.",
}: {
  html: string | null;
  emptyMessage?: string;
}) {
  const clean = sanitizeHtml(html);

  if (!hasVisibleHtml(clean)) {
    return <p className="text-small text-ink-muted">{emptyMessage}</p>;
  }

  return (
    <div className="prose-article" dangerouslySetInnerHTML={{ __html: clean }} />
  );
}
