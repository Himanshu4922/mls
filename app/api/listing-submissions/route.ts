import { NextResponse } from "next/server";
import {
  createSubmission,
  listMySubmissions,
  type ListingSubmissionInput,
} from "@/lib/api/listingSubmissions";
import { readJsonObject, submissionError, tokenOr401 } from "./_shared";

/**
 * GET  /api/listing-submissions — the signed-in user's submissions (`mine/`).
 * POST /api/listing-submissions — create a draft.
 *
 * The backend has no GET on the collection path itself, so GET maps to `mine/`.
 */
export async function GET() {
  const token = await tokenOr401();
  if (token instanceof NextResponse) return token;
  try {
    return NextResponse.json(await listMySubmissions(token));
  } catch (error) {
    return submissionError(error, "Could not load your listings.");
  }
}

export async function POST(request: Request) {
  const token = await tokenOr401();
  if (token instanceof NextResponse) return token;

  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid request.", fieldErrors: {} }, { status: 400 });
  }

  try {
    const created = await createSubmission(token, body as Partial<ListingSubmissionInput>);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return submissionError(error, "Could not save your listing.");
  }
}
