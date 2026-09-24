import { NextResponse } from "next/server";
import { withdrawSubmission } from "@/lib/api/listingSubmissions";
import { invalidId, parseId, submissionError, tokenOr401 } from "../../_shared";

/** POST /api/listing-submissions/<id>/withdraw — take a submission out of review or off the site. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await tokenOr401();
  if (token instanceof NextResponse) return token;
  const id = parseId((await params).id);
  if (!id) return invalidId();

  try {
    return NextResponse.json(await withdrawSubmission(token, id));
  } catch (error) {
    return submissionError(error, "Could not withdraw your listing.");
  }
}
