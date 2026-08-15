// Doyle contractor flow — two stages:
//   1) markDoyleFixed: record the repair + bill; the unit stays at Doyle in a
//      "fixed, awaiting shipment" state (a doyle_repairs row with
//      is_completed = true and return_date = null).
//   2) shipDoyleUnit: close that row (set return_date) and move the unit back
//      to the hotel (Maintenance Office or Spare Storage).

import { format } from "date-fns";

import { supabase } from "@/lib/supabase/client";
import { updateUnitLocation } from "./units";
import { fetchTransfers } from "./logs";
import { friendlyWriteError } from "./errors";
import type { CustodyTransfer, DoyleRepair, PtacUnit } from "@/types/database";

export function latestDoyleDispatchNote(ptacId: string, transfers: CustodyTransfer[]): string {
  for (const transfer of transfers) {
    if (transfer.ptac_id !== ptacId) continue;
    const toLocation = transfer.to_location ?? "";
    if (toLocation.includes("Doyle")) {
      const note = (transfer.notes ?? "").trim();
      return note || "Offsite dispatch to Doyle Repair Shop.";
    }
  }
  return "Offsite dispatch to Doyle Repair Shop.";
}

// A repair that's been marked fixed but not yet shipped back.
export function isFixedAwaitingShipment(repair: DoyleRepair): boolean {
  return Boolean(repair.is_completed) && !repair.return_date;
}

// The open "fixed, awaiting shipment" repair row for a unit, if any.
export function openFixedRepair(ptacId: string, repairs: DoyleRepair[]): DoyleRepair | null {
  return repairs.find((r) => r.ptac_id === ptacId && isFixedAwaitingShipment(r)) ?? null;
}

export interface MarkDoyleFixedInput {
  ptacId: string;
  unit: PtacUnit;
  technician: string;
  invoice: string;
  components: string[];
  extraParts: string;
  notes: string;
  partsCost: number;
  laborRate1: number;
  laborHours1: number;
  laborRate2: number;
  laborHours2: number;
}

export function computeLaborCost(input: {
  laborRate1: number;
  laborHours1: number;
  laborRate2: number;
  laborHours2: number;
}): number {
  return (
    (input.laborRate1 || 0) * (input.laborHours1 || 0) +
    (input.laborRate2 || 0) * (input.laborHours2 || 0)
  );
}

// Records the repair; the unit stays at Doyle Shop (fixed, awaiting shipment).
export async function markDoyleFixed(input: MarkDoyleFixedInput): Promise<void> {
  const laborCost = computeLaborCost(input);
  const totalCost = laborCost + (input.partsCost || 0);
  const allParts = [
    ...input.components,
    ...input.extraParts.split(",").map((p) => p.trim()).filter(Boolean),
  ];

  // sent_date = when the unit was dispatched to Doyle (its custody transfer).
  const transfers = await fetchTransfers(input.ptacId);
  const dispatch = transfers.find((t) => (t.to_location ?? "").includes("Doyle"));
  const sentDate = dispatch?.transfer_date
    ? String(dispatch.transfer_date).slice(0, 10)
    : format(new Date(), "yyyy-MM-dd");

  const { error } = await supabase.from("doyle_repairs").insert({
    ptac_id: input.ptacId,
    sent_date: sentDate,
    return_date: null, // fixed but not shipped yet
    doyle_diagnosis: `Invoice ${input.invoice}. Parts: ${allParts.join(", ") || "None"}. ${input.notes}`.trim(),
    parts_cost: input.partsCost,
    labor_cost: laborCost,
    total_cost: totalCost,
    labor_rate1: input.laborRate1,
    labor_hours1: input.laborHours1,
    labor_rate2: input.laborRate2,
    labor_hours2: input.laborHours2,
    is_completed: true,
  });
  if (error) throw friendlyWriteError(error);
}

export interface ShipDoyleUnitInput {
  ptacId: string;
  unit: PtacUnit;
  technician: string;
  targetLocation: string; // "Maintenance Office" or the spare storage closet
  repairId: number; // the open fixed repair to close
}

// Closes the open fixed repair (records the return date) and moves the unit
// back to the hotel.
export async function shipDoyleUnit(input: ShipDoyleUnitInput): Promise<void> {
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { error: closeError } = await supabase
    .from("doyle_repairs")
    .update({ return_date: todayStr })
    .eq("doyle_id", input.repairId);
  if (closeError) throw closeError;

  await updateUnitLocation({
    ptacId: input.ptacId,
    status: input.targetLocation === "Maintenance Office" ? "Maintenance Office" : "Active",
    location: input.targetLocation,
    technician: input.technician.trim() || "Doyle return",
    notes: `Returned from Doyle Shop to ${input.targetLocation}.`,
  });
}
