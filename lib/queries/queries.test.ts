import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson, HttpError, httpErrorFrom, shouldRetry } from "./fetcher";
import { mapViewKey, qk } from "./keys";

describe("query keys", () => {
  it("sorts id sets so order doesn't fragment the cache", () => {
    expect(qk.properties.byIds(["b", "a"])).toEqual(qk.properties.byIds(["a", "b"]));
  });

  it("does not mutate the caller's array", () => {
    const ids = ["b", "a"];
    qk.properties.byIds(ids);
    expect(ids).toEqual(["b", "a"]);
  });

  it("scopes per-user keys by user id under one root", () => {
    expect(qk.me(1).overview).not.toEqual(qk.me(2).overview);
    expect(qk.me(1).overview.slice(0, 1)).toEqual(qk.meRoot);
    expect(qk.me(1).note("X").slice(0, 2)).toEqual(qk.me(1).all);
  });

  it("normalises free text", () => {
    expect(qk.geo.place("  Vaughan ")).toEqual(qk.geo.place("vaughan"));
  });

  it("rounds map bounds and sorts filters", () => {
    const a = mapViewKey({
      south: 43.70001, west: -79.40004, north: 43.8, east: -79.3, zoom: 12.4,
      filters: "type=Condo&beds=2",
    });
    const b = mapViewKey({
      south: 43.70004, west: -79.40001, north: 43.8, east: -79.3, zoom: 12,
      filters: "beds=2&type=Condo",
    });
    expect(a).toEqual(b);
    expect(a.poly).toBe("");
  });
});

describe("errors and retry", () => {
  it("prefers the server's message, then the fallback", () => {
    expect(httpErrorFrom(400, { error: "Bad postal code." }).message).toBe("Bad postal code.");
    expect(httpErrorFrom(500, null, "Could not save.").message).toBe("Could not save.");
    expect(httpErrorFrom(401, null, "Could not save.").message).toMatch(/session expired/);
  });

  it("carries field errors", () => {
    const error = httpErrorFrom(400, { error: "x", fieldErrors: { city: "Required" } });
    expect(error.fieldErrors).toEqual({ city: "Required" });
  });

  it("retries network and 5xx once, never 4xx", () => {
    expect(shouldRetry(0, new HttpError("x", 0))).toBe(true);
    expect(shouldRetry(0, new HttpError("x", 502))).toBe(true);
    expect(shouldRetry(1, new HttpError("x", 502))).toBe(false);
    expect(shouldRetry(0, new HttpError("x", 401))).toBe(false);
    expect(shouldRetry(0, new HttpError("x", 404))).toBe(false);
    expect(shouldRetry(0, new Error("bug"))).toBe(false);
  });
});

describe("fetchJson", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns parsed JSON and sends a JSON body", async () => {
    const spy = vi.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    vi.stubGlobal("fetch", spy);
    await expect(fetchJson("/api/x", { method: "POST", body: { a: 1 } })).resolves.toEqual({ ok: 1 });
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.body).toBe('{"a":1}');
  });

  it("throws HttpError with status on failure", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: "Nope" }), { status: 403 }));
    await expect(fetchJson("/api/x")).rejects.toMatchObject({ status: 403, message: "Nope" });
  });

  it("maps a network failure to status 0", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(fetchJson("/api/x")).rejects.toMatchObject({ status: 0 });
  });

  it("handles 204", async () => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 204 }));
    await expect(fetchJson("/api/x", { method: "DELETE" })).resolves.toBeUndefined();
  });
});
