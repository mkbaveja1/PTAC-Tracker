// CRUD for the editable PTAC model list (supabase/model_options.sql). Reads
// return null when the table isn't set up (fall back to the built-in models)
// vs [] when set up but empty (a deleted model stays gone).

import { supabase } from "@/lib/supabase/client";
import type { ModelOption } from "@/types/database";

function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

const MISSING_TABLE_MESSAGE =
  "Model list table not found. Run supabase/model_options.sql once in the Supabase SQL Editor, then try again.";

export async function fetchModelOptions(): Promise<ModelOption[] | null> {
  const { data, error } = await supabase
    .from("model_options")
    .select("*")
    .order("sort_order")
    .order("name");
  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  return data ?? [];
}

export async function addModelOption(name: string): Promise<void> {
  const { error } = await supabase
    .from("model_options")
    .insert({ name: name.trim(), enabled: true, sort_order: 100 });
  if (error) {
    if (isMissingTable(error)) throw new Error(MISSING_TABLE_MESSAGE);
    if (error.code === "23505") throw new Error(`"${name.trim()}" is already in the model list.`);
    throw error;
  }
}

export async function renameModelOption(id: number, name: string): Promise<void> {
  const { error } = await supabase.from("model_options").update({ name: name.trim() }).eq("id", id);
  if (error) {
    if (error.code === "23505") throw new Error(`"${name.trim()}" is already in the model list.`);
    throw error;
  }
}

export async function setModelOptionEnabled(id: number, enabled: boolean): Promise<void> {
  const { error } = await supabase.from("model_options").update({ enabled }).eq("id", id);
  if (error) throw error;
}

export async function deleteModelOption(id: number): Promise<void> {
  const { error } = await supabase.from("model_options").delete().eq("id", id);
  if (error) throw error;
}
