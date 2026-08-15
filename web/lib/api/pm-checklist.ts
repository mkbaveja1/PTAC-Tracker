// CRUD for the editable PM checklist (supabase/pm_checklist.sql). Reads fall
// back to an empty list before the table exists; writes surface a clear
// "run the SQL" message.

import { supabase } from "@/lib/supabase/client";
import type { PmChecklistItem } from "@/types/database";

function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

const MISSING_TABLE_MESSAGE =
  "PM checklist table not found. Run supabase/pm_checklist.sql once in the Supabase SQL Editor, then try again.";

export async function fetchPmChecklistItems(): Promise<PmChecklistItem[]> {
  const { data, error } = await supabase
    .from("pm_checklist_items")
    .select("*")
    .order("sort_order")
    .order("label");
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  return data ?? [];
}

export async function addPmChecklistItem(label: string): Promise<void> {
  const { error } = await supabase
    .from("pm_checklist_items")
    .insert({ label: label.trim(), enabled: true, sort_order: 100 });
  if (error) {
    if (isMissingTable(error)) throw new Error(MISSING_TABLE_MESSAGE);
    if (error.code === "23505") throw new Error(`"${label.trim()}" is already on the checklist.`);
    throw error;
  }
}

export async function renamePmChecklistItem(id: number, label: string): Promise<void> {
  const { error } = await supabase
    .from("pm_checklist_items")
    .update({ label: label.trim() })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error(`"${label.trim()}" is already on the checklist.`);
    throw error;
  }
}

export async function setPmChecklistItemEnabled(id: number, enabled: boolean): Promise<void> {
  const { error } = await supabase.from("pm_checklist_items").update({ enabled }).eq("id", id);
  if (error) throw error;
}

export async function deletePmChecklistItem(id: number): Promise<void> {
  const { error } = await supabase.from("pm_checklist_items").delete().eq("id", id);
  if (error) throw error;
}
