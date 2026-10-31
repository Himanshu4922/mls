import { revalidatePath } from "next/cache";

/** Drop cached studio list/detail and the public estate listing page. */
export function revalidateListingPages(id?: number) {
  revalidatePath("/studio/listings");
  if (id) {
    revalidatePath(`/studio/listings/${id}`);
    revalidatePath(`/estate-listing/${id}`);
  }
}
