// Supabase operations on ptac_units + custody_transfers, ported from _shared.py.

import { supabase } from "@/lib/supabase/client";
import { inferLocationType, statusForLocationType } from "@/lib/domain/locations";
import { friendlyWriteError } from "./errors";
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
  // Explicit type for custom location categories, whose names inferLocationType
  // can't recognize (e.g. "Rooftop"). Omit for built-in locations.
  locationType?: string;
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
      location_type: input.locationType ?? inferLocationType(input.location),
    })
    .eq("ptac_id", input.ptacId);
  if (updateError) throw friendlyWriteError(updateError);
}

export interface RegisterSpareInput {
  ptacId: string;
  serialNumber: string;
  modelSpecs: string;
  location: string;
  // Explicit type for custom category locations; omit to infer from the name.
  locationType?: string;
}

// Registers a new unit into ptac_units at the chosen location. Type and status
// follow the location (storage → Spare, a room → active Room unit, etc.), so a
// unit placed anywhere is classified correctly — no separate spares table.
export async function registerSpareUnit(input: RegisterSpareInput): Promise<void> {
  const locationType = input.locationType ?? inferLocationType(input.location);
  const { error } = await supabase.from("ptac_units").insert({
    ptac_id: input.ptacId,
    serial_number: input.serialNumber,
    model_specs: input.modelSpecs,
    current_location_name: input.location,
    location_type: locationType,
    status: statusForLocationType(locationType),
  });
  if (error) throw friendlyWriteError(error);
}

export interface EditUnitInput {
  ptacId: string;
  modelSpecs: string;
  serialNumber: string;
  locationName: string;
  locationType: string;
  status: string;
  // When the location changed, log a custody transfer for the history feed.
  logTransfer?: { fromLocation: string; technician: string; notes: string };
}

// Full specification edit: model, serial, and location (name + type + status).
// If a transfer is supplied, it's written first so the move shows in history.
export async function editUnitSpecifications(input: EditUnitInput): Promise<void> {
  if (input.logTransfer) {
    const { error: transferError } = await supabase.from("custody_transfers").insert({
      ptac_id: input.ptacId,
      from_location: input.logTransfer.fromLocation || "Unknown",
      to_location: input.locationName,
      technician_name: input.logTransfer.technician,
      notes: input.logTransfer.notes,
    });
    if (transferError) throw transferError;
  }

  const { error } = await supabase
    .from("ptac_units")
    .update({
      model_specs: input.modelSpecs,
      serial_number: input.serialNumber,
      current_location_name: input.locationName,
      location_type: input.locationType,
      status: input.status,
    })
    .eq("ptac_id", input.ptacId);
  if (error) throw friendlyWriteError(error);
}

export async function deleteUnit(ptacId: string): Promise<void> {
  const { error } = await supabase.from("ptac_units").delete().eq("ptac_id", ptacId);
  if (error) throw error;
}

// Lightweight spec-only update (model + serial) for the settings spec table.
export async function updateUnitModelSerial(
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

// Manually flag a unit as due for PM: clear its last PM date so it reads as
// "Needs PM" until a PM is logged. Past PM logs are untouched.
export async function markUnitDueForPM(ptacId: string): Promise<void> {
  const { error } = await supabase
    .from("ptac_units")
    .update({ last_pm_date: null })
    .eq("ptac_id", ptacId);
  if (error) throw error;
}
