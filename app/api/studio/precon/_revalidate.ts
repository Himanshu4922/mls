import { revalidatePath } from "next/cache";

/**
 * Drop cached public pre-con pages after a Studio change. The list and detail
 * pages are ISR'd (5 min); the home page carries the featured pre-con rail.
 * The detail route is revalidated as a route pattern because its URL carries
 * the slug, which may have just changed.
 */
export function revalidatePreconPages() {
  revalidatePath("/preconstruction");
  revalidatePath("/preconstruction/[id]", "page");
  revalidatePath("/");
}

/** Assignment pages read approved submissions and their project links. */
export function revalidateAssignmentPages() {
  revalidatePath("/assignments");
  revalidatePath("/assignments/[id]", "page");
  revalidatePath("/preconstruction/[id]", "page");
}
