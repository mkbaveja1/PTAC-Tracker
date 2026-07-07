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

export interface PmTasks {
  filters: boolean;
  coils: boolean;
  wiring: boolean;
  blower: boolean;
}

export interface RegisterPmInput {
  unit: PtacUnit;
  technician: string;
  notes: string;
  tasks: PmTasks;
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

  const { error: insertError } = await supabase.from("pm_logs").insert({
    ptac_id: input.unit.ptac_id,
    technician_name: input.technician,
    filters_washed_replaced: input.tasks.filters,
    coils_vacuumed_inspected: input.tasks.coils,
    wiring_thermostat_calibrated: input.tasks.wiring,
    blower_fan_centered_oiled: input.tasks.blower,
    diagnostic_notes: input.notes,
  });
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
