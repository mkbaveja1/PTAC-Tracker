// Translates the Postgres enum error you get when a custom location type is
// written before the location_type column has been converted to text.

export function friendlyWriteError(error: unknown): Error {
  const e = error as { message?: string; details?: string; hint?: string } | null;
  const message = e?.message ?? "";
  if (message.includes("asset_location_type")) {
    return new Error(
      "Custom locations need a one-time database update. Run supabase/location_type_to_text.sql in Supabase, then try again."
    );
  }
  if (message.includes("labor_rate") || message.includes("labor_hours")) {
    return new Error(
      "Doyle labor billing needs a one-time database update. Run supabase/doyle_labor_columns.sql in Supabase, then try again."
    );
  }
  if (error instanceof Error) return error;
  // Supabase errors are plain objects — pull out their message/details rather
  // than stringifying to "[object Object]".
  if (message) return new Error(details(e) ? `${message} (${details(e)})` : message);
  return new Error(String(error));
}

function details(e: { details?: string; hint?: string } | null): string {
  return e?.details || e?.hint || "";
}
