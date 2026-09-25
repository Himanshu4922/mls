/**
 * Cities the site browses by, in the product owner's order (the first eight
 * are the reference design's). Shared by /communities and the HTML sitemap so
 * the two never list different cities. The bulk stats endpoint caps a request
 * at 20 cities.
 */
export const COMMUNITY_CITIES = [
  "Toronto",
  "Mississauga",
  "Vaughan",
  "Oakville",
  "Markham",
  "Milton",
  "Brampton",
  "Pickering",
  "Burlington",
  "Hamilton",
  "Richmond Hill",
  "Ajax",
] as const;
