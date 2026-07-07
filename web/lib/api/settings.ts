// App-level settings stored in the app_settings table (supabase/app_settings.sql).
// The app must keep working before that table exists, so reads fall back to
// defaults instead of throwing.

import { supabase } from "@/lib/supabase/client";

export const PM_INTERVAL_KEY = "pm_interval_months";
export const DEFAULT_PM_INTERVAL_MONTHS = 6; // twice a year

export async function fetchPmIntervalMonths(): Promise<number> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", PM_INTERVAL_KEY)
    .maybeSingle();

  // Missing table (or any read failure) → default schedule, app stays usable.
  if (error || !data) return DEFAULT_PM_INTERVAL_MONTHS;

  const parsed = parseInt(data.value, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_PM_INTERVAL_MONTHS;
}

export async function updatePmIntervalMonths(months: number): Promise<void> {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: PM_INTERVAL_KEY, value: String(months), updated_at: new Date().toISOString() });

  if (error) {
    // PGRST205 (PostgREST schema cache) / 42P01 (Postgres) = table does not
    // exist — the one-time SQL hasn't been run yet.
    if (error.code === "PGRST205" || error.code === "42P01") {
      throw new Error(
        "Settings table not found. Run supabase/app_settings.sql once in the Supabase SQL Editor, then try again."
      );
    }
    throw error;
  }
}
