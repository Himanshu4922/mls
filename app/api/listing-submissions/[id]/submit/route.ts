import { NextResponse } from "next/server";
import { submitSubmission } from "@/lib/api/listingSubmissions";
import { clientMetaHeaders } from "@/lib/utils/clientMeta";
import { invalidId, parseId, submissionError, tokenOr401 } from "../../_shared";

/** POST /api/listing-submissions/<id>/submit — send a draft for review (needs a verified phone and both consents). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await tokenOr401();
  if (token instanceof NextResponse) return token;
  const id = parseId((await params).id);
  if (!id) return invalidId();

  try {
    return NextResponse.json(await submitSubmission(token, id, clientMetaHeaders(request)));
  } catch (error) {
    return submissionError(error, "Could not submit your listing.");
  }
}
