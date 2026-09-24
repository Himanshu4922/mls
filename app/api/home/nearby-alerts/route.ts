import { NextResponse } from "next/server";
import {
  createNearbyAlert,
  listNearbyAlerts,
  NEARBY_RADIUS_MAX_KM,
  NEARBY_RADIUS_MIN_KM,
} from "@/lib/api/homeForms";
import { requireAccessToken } from "@/lib/auth/session";
import { fail, finiteNumber, homeErrorJson, readJsonObject } from "../_forms";

const SIGN_IN = "Sign in to set up nearby alerts.";

/** GET /api/home/nearby-alerts — the signed-in user's active nearby alerts. */
export async function GET() {
  const token = await requireAccessToken();
  if (!token) return fail(SIGN_IN, 401);
  try {
    return NextResponse.json({ results: await listNearbyAlerts(token) });
  } catch (error) {
    return homeErrorJson(error, "Could not load your nearby alerts.");
  }
}

/**
 * POST /api/home/nearby-alerts — create one. The backend always emails the
 * account's own address, so no email is accepted or forwarded here.
 */
export async function POST(request: Request) {
  const token = await requireAccessToken();
  if (!token) return fail(SIGN_IN, 401);

  const body = await readJsonObject(request);
  if (!body) return fail("Invalid request.", 400);

  const label = typeof body.label === "string" ? body.label.trim().slice(0, 255) : "";
  const latitude = finiteNumber(body.latitude);
  const longitude = finiteNumber(body.longitude);
  if (!label || latitude === null || longitude === null) {
    return fail("Pick a location from the suggestions.", 400);
  }
  if (body.consent !== true) {
    const message = "Please confirm you'd like these emails.";
    return NextResponse.json({ error: message, fieldErrors: { consent: message } }, { status: 400 });
  }
  const radius = finiteNumber(body.radius_km);
  const radiusKm =
    radius === null
      ? undefined
      : Math.min(Math.max(radius, NEARBY_RADIUS_MIN_KM), NEARBY_RADIUS_MAX_KM);

  try {
    const created = await createNearbyAlert(token, {
      label,
      latitude,
      longitude,
      radius_km: radiusKm,
      consent: true,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return homeErrorJson(error, "Could not save your alert.");
  }
}
