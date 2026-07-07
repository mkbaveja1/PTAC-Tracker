import { redirect } from "next/navigation";

// Root entry: legacy printed QR labels encode ?unit_detail=PTAC-### against the
// app base URL — keep resolving them. Everything else lands on the dashboard.
export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ unit_detail?: string }>;
}) {
  const params = await searchParams;
  const legacyId = params.unit_detail?.trim();
  if (legacyId) {
    redirect(`/units/${encodeURIComponent(legacyId.toUpperCase())}`);
  }
  redirect("/dashboard");
}
