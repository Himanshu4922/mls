import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/Badge";
import { SchoolsDirectory } from "@/components/schools/SchoolsDirectory";
import { getTopSchools } from "@/lib/api/schools";

export const metadata: Metadata = {
  title: "Schools",
  description:
    "Search Ontario schools by name and find nearby homes. EQAO results from the Ministry of Education open file.",
  alternates: { canonical: "/schools" },
};

export const revalidate = 86_400;

export default async function SchoolsPage() {
  const initialSchools = await getTopSchools({ limit: 8 }).catch(() => []);

  return (
    <>
      <header className="border-b border-line bg-surface-alt py-8 sm:py-12">
        <div className="container-page">
          <Eyebrow>Schools &amp; families</Eyebrow>
          <h1 className="mt-3 text-h1 text-ink">Find homes by school</h1>
          <p className="mt-2 max-w-2xl text-small text-ink-muted">
            Search the Ministry school list, then open listings near a school location.
            Attendance boundaries are set by each board and are not in this file.
          </p>
        </div>
      </header>

      <div className="container-page py-10">
        <SchoolsDirectory initialSchools={initialSchools} />
      </div>
    </>
  );
}
