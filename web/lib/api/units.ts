// Supabase operations on ptac_units + custody_transfers, ported from _shared.py.

import { supabase } from "@/lib/supabase/client";
import { inferLocationType } from "@/lib/domain/locations";
import type { PtacUnit } from "@/types/database";

const UNIT_COLUMNS =
  "ptac_id, serial_number, model_specs, current_location_name, location_type, status, last_pm_date, created_at";

export async function fetchUnits(): Promise<PtacUnit[]> {
  const { data, error } = await supabase
    .from("ptac_units")
    .select(UNIT_COLUMNS)
    .order("ptac_id");
  if (error) throw error;
  return data ?? [];
}

export async function fetchUnit(ptacId: string): Promise<PtacUnit | null> {
  const { data, error } = await supabase
    .from("ptac_units")
    .select(UNIT_COLUMNS)
    .eq("ptac_id", ptacId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export interface UpdateUnitLocationInput {
  ptacId: string;
  status: string;
  location: string;
  technician: string;
  notes: string;
}

// Moves a unit: writes the custody transfer, then updates the live ptac_units row.
export async function updateUnitLocation(input: UpdateUnitLocationInput): Promise<void> {
  const unit = await fetchUnit(input.ptacId);
  if (!unit) throw new Error(`No PTAC unit found for ${input.ptacId}`);

  const { error: transferError } = await supabase.from("custody_transfers").insert({
    ptac_id: input.ptacId,
    from_location: unit.current_location_name || "Unknown",
    to_location: input.location,
    technician_name: input.technician,
    notes: input.notes,
  });
  if (transferError) throw transferError;

  const { error: updateError } = await supabase
    .from("ptac_units")
    .update({
      status: input.status,
      current_location_name: input.location,
      location_type: inferLocationType(input.location),
    })
    .eq("ptac_id", input.ptacId);
  if (updateError) throw updateError;
}

export interface RegisterSpareInput {
  ptacId: string;
  serialNumber: string;
  modelSpecs: string;
  storageLocation: string;
}

// Spare units live in ptac_units with location_type = "Spare" — no separate table.
export async function registerSpareUnit(input: RegisterSpareInput): Promise<void> {
  const { error } = await supabase.from("ptac_units").insert({
    ptac_id: input.ptacId,
    serial_number: input.serialNumber,
    model_specs: input.modelSpecs,
    current_location_name: input.storageLocation,
    location_type: "Spare",
    // Supabase status enum does not include Spare/Storage; spares are tracked by location_type.
    status: "Active",
  });
  if (error) throw error;
}

export async function updateUnitSpecs(
  ptacId: string,
  modelSpecs: string,
  serialNumber: string
): Promise<void> {
  const { error } = await supabase
    .from("ptac_units")
    .update({ model_specs: modelSpecs, serial_number: serialNumber })
    .eq("ptac_id", ptacId);
  if (error) throw error;
}

export async function deleteUnit(ptacId: string): Promise<void> {
  const { error } = await supabase.from("ptac_units").delete().eq("ptac_id", ptacId);
  if (error) throw error;
}
