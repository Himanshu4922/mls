import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { getRecentSales, RECENT_SALES_DAYS } from "@/lib/api/market";
import { requireAccessToken } from "@/lib/auth/session";

/** GET /api/market/recent-sales?city=&days=&page= — signed-in only (TRREB VOW rules). */
export async function GET(request: Request) {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in to see sold prices." }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const city = (params.get("city") ?? "").trim();
  if (!city) return NextResponse.json({ error: "Choose a city." }, { status: 400 });
  const days = Number(params.get("days"));
  const page = Math.max(1, Number(params.get("page")) || 1);

  try {
    return NextResponse.json(
      await getRecentSales(token, {
        city,
        days: (RECENT_SALES_DAYS as readonly number[]).includes(days) ? days : 30,
        page,
      }),
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Could not load recent sales." }, { status: 500 });
  }
}
