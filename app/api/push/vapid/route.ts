import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";

/** GET /api/push/vapid — public key only. The private key never leaves the backend. */
export async function GET() {
  try {
    const data = await apiFetch<{ enabled?: boolean; public_key?: string }>("/api/mls/push/vapid/");
    return NextResponse.json({
      enabled: Boolean(data.enabled && data.public_key),
      publicKey: data.public_key || "",
    });
  } catch {
    return NextResponse.json({ enabled: false, publicKey: "" });
  }
}
