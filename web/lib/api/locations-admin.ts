// CRUD for user-editable location categories (supabase/location_categories.sql).
// The app must keep working before that table exists, so reads fall back to an
// empty list and writes surface a clear "run the SQL" message.

import { supabase } from "@/lib/supabase/client";
import type { LocationCategory } from "@/types/database";

// PGRST205 (PostgREST schema cache) / 42P01 (Postgres) = table doesn't exist.
function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

const MISSING_TABLE_MESSAGE =
  "Locations table not found. Run supabase/location_categories.sql once in the Supabase SQL Editor, then try again.";

// Returns null when the table doesn't exist yet (not set up), vs [] when it's
// set up but empty — so a deleted location never reappears from a fallback.
export async function fetchLocationCategories(): Promise<LocationCategory[] | null> {
  const { data, error } = await supabase
    .from("location_categories")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  return data ?? [];
}

export async function addLocationCategory(name: string): Promise<void> {
  const { error } = await supabase
    .from("location_categories")
    .insert({ name: name.trim(), is_builtin: false, enabled: true, sort_order: 100 });
  if (error) {
    if (isMissingTable(error)) throw new Error(MISSING_TABLE_MESSAGE);
    if (error.code === "23505") throw new Error(`A location named "${name.trim()}" already exists.`);
    throw error;
  }
}

export async function renameLocationCategory(id: number, name: string): Promise<void> {
  const { error } = await supabase
    .from("location_categories")
    .update({ name: name.trim() })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error(`A location named "${name.trim()}" already exists.`);
    throw error;
  }
}

export async function setLocationCategoryEnabled(id: number, enabled: boolean): Promise<void> {
  const { error } = await supabase.from("location_categories").update({ enabled }).eq("id", id);
  if (error) throw error;
}

export async function deleteLocationCategory(id: number): Promise<void> {
  const { error } = await supabase.from("location_categories").delete().eq("id", id);
  if (error) throw error;
}
