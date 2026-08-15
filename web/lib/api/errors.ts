// Translates the Postgres enum error you get when a custom location type is
// written before the location_type column has been converted to text.

export function friendlyWriteError(error: unknown): Error {
  const e = error as { message?: string } | null;
  if (e?.message?.includes("asset_location_type")) {
    return new Error(
      "Custom locations need a one-time database update. Run supabase/location_type_to_text.sql in Supabase, then try again."
    );
  }
  return error instanceof Error ? error : new Error(String(error));
}
