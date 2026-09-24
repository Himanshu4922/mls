/**
 * Maximum homes in one comparison.
 *
 * Deliberately NOT exported from WatchedProvider: that module is `"use client"`,
 * and importing a plain value from it into a Server Component yields `undefined`
 * at runtime (the client module is replaced by a reference proxy on the server).
 * That silently turned the compare page's id parsing into an empty array.
 * Shared constants used on both sides must live in a neutral module like this.
 */
export const MAX_COMPARE = 3;
