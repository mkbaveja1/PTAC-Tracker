// PM, custody transfer, and onsite repair operations, ported from
// _shared.py and views/unit_detail.py.

import { format } from "date-fns";

import { supabase } from "@/lib/supabase/client";
import { updateUnitLocation } from "./units";
import type { CustodyTransfer, DoyleRepair, OnsiteRepair, PmLog, PtacUnit } from "@/types/database";

function today(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export async function fetchPmLogs(ptacId?: string): Promise<PmLog[]> {
  let query = supabase.from("pm_logs").select("*").order("date_performed", { ascending: false });
  if (ptacId) query = query.eq("ptac_id", ptacId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchTransfers(ptacId?: string): Promise<CustodyTransfer[]> {
  let query = supabase
    .from("custody_transfers")
    .select("*")
    .order("transfer_date", { ascending: false });
  if (ptacId) query = query.eq("ptac_id", ptacId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchOnsiteRepairs(ptacId?: string): Promise<OnsiteRepair[]> {
  let query = supabase
    .from("onsite_repairs")
    .select("*")
    .order("repair_date", { ascending: false });
  if (ptacId) query = query.eq("ptac_id", ptacId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchDoyleRepairs(ptacId?: string): Promise<DoyleRepair[]> {
  let query = supabase.from("doyle_repairs").select("*").order("sent_date", { ascending: false });
  if (ptacId) query = query.eq("ptac_id", ptacId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export interface RegisterPmInput {
  unit: PtacUnit;
  technician: string;
  notes: string;
  // Labels of the checklist items that were completed (all enabled items).
  completedTasks: string[];
  // Whether the pm_checklist_items table is configured (so completed_tasks can
  // be stored). Off before the migration is run — legacy booleans only.
  storeCompletedTasks: boolean;
}

// PM work is logged from the Maintenance Office: the unit moves there first
// if needed, and stays there after PM (redeploy via a separate custody transfer).
export async function registerPmLog(input: RegisterPmInput): Promise<void> {
  if (input.unit.current_location_name !== "Maintenance Office") {
    await updateUnitLocation({
      ptacId: input.unit.ptac_id,
      status: "Maintenance Office",
      location: "Maintenance Office",
      technician: input.technician,
      notes: "Moved to Maintenance Office for routine PM service.",
    });
  }

  const done = new Set(input.completedTasks);
  const row: Record<string, unknown> = {
    ptac_id: input.unit.ptac_id,
    technician_name: input.technician,
    // Keep the legacy boolean columns in sync for the default items.
    filters_washed_replaced: done.has("Filters washed / replaced"),
    coils_vacuumed_inspected: done.has("Coils vacuumed & inspected"),
    wiring_thermostat_calibrated: done.has("Wiring & thermostat calibrated"),
    blower_fan_centered_oiled: done.has("Blower fan centered & oiled"),
    diagnostic_notes: input.notes,
  };
  if (input.storeCompletedTasks) {
    row.completed_tasks = JSON.stringify(input.completedTasks);
  }

  const { error: insertError } = await supabase.from("pm_logs").insert(row);
  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from("ptac_units")
    .update({ last_pm_date: today() })
    .eq("ptac_id", input.unit.ptac_id);
  if (updateError) throw updateError;
}

export interface RegisterOnsiteRepairInput {
  unit: PtacUnit;
  technician: string;
  parts: string;
  cost: number;
  notes: string;
}

// Onsite repairs happen at the Maintenance Office — move the unit there first if needed.
export async function registerOnsiteRepair(input: RegisterOnsiteRepairInput): Promise<void> {
  if (input.unit.current_location_name !== "Maintenance Office") {
    await updateUnitLocation({
      ptacId: input.unit.ptac_id,
      status: "Maintenance Office",
      location: "Maintenance Office",
      technician: input.technician,
      notes: "Moved to Maintenance Office for onsite repair.",
    });
  }

  const { error } = await supabase.from("onsite_repairs").insert({
    ptac_id: input.unit.ptac_id,
    technician_name: input.technician,
    parts_replaced: input.parts.trim() || "None",
    repair_cost: input.cost,
    diagnostic_notes: input.notes,
  });
  if (error) throw error;
}
