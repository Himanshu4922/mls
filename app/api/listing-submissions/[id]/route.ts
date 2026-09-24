import { NextResponse } from "next/server";
import {
  getSubmission,
  updateSubmission,
  type ListingSubmissionInput,
} from "@/lib/api/listingSubmissions";
import { invalidId, parseId, readJsonObject, submissionError, tokenOr401 } from "../_shared";

type Context = { params: Promise<{ id: string }> };

/** GET /api/listing-submissions/<id> — one of the user's own submissions. */
export async function GET(_request: Request, { params }: Context) {
  const token = await tokenOr401();
  if (token instanceof NextResponse) return token;
  const id = parseId((await params).id);
  if (!id) return invalidId();

  try {
    return NextResponse.json(await getSubmission(token, id));
  } catch (error) {
    return submissionError(error, "Could not load that listing.");
  }
}

/** PATCH /api/listing-submissions/<id> — partial update (draft / needs changes only). */
export async function PATCH(request: Request, { params }: Context) {
  const token = await tokenOr401();
  if (token instanceof NextResponse) return token;
  const id = parseId((await params).id);
  if (!id) return invalidId();

  const body = await readJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: "Invalid request.", fieldErrors: {} }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await updateSubmission(token, id, body as Partial<ListingSubmissionInput>),
    );
  } catch (error) {
    return submissionError(error, "Could not save your listing.");
  }
}
