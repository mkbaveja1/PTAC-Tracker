// Doyle contractor completion flow, ported exactly from complete_doyle_repair()
// and latest_doyle_dispatch_note() in _shared.py — including the
// occupied-room displacement logic. Do not simplify.

import { format } from "date-fns";

import { supabase } from "@/lib/supabase/client";
import {
  inferLocationType,
  occupantAtLocation,
  targetStatusForLocation,
} from "@/lib/domain/locations";
import { fetchTransfers } from "./logs";
import { fetchUnits, updateUnitLocation } from "./units";
import { friendlyWriteError } from "./errors";
import type { CustodyTransfer, PtacUnit } from "@/types/database";

export const OCCUPIED_ROOM_OVERRIDE_REQUIRED = "occupied_room_override_required";

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

export interface CompleteDoyleRepairInput {
  ptacId: string;
  unit: PtacUnit;
  technician: string;
  invoice: string;
  totalBill: number;
  components: string[];
  extraParts: string;
  notes: string;
  targetLocation: string;
  // Explicit type for a custom category destination; omit to infer.
  targetLocationType?: string;
  overrideOccupied?: boolean;
}

export async function completeDoyleRepair(input: CompleteDoyleRepairInput): Promise<void> {
  const allUnits = await fetchUnits();
  let occupyingUnit: PtacUnit | null = null;
  // Only a real single-slot guest room is occupancy-checked. A custom category
  // (targetLocationType set) is a multi-capacity bucket — skip the check, or
  // inferLocationType would misread its name as "Room".
  if (
    input.targetLocation &&
    !input.targetLocationType &&
    inferLocationType(input.targetLocation) === "Room"
  ) {
    occupyingUnit = occupantAtLocation(allUnits, input.targetLocation, input.ptacId);
  }

  if (occupyingUnit && !input.overrideOccupied) {
    throw new Error(OCCUPIED_ROOM_OVERRIDE_REQUIRED);
  }

  const allParts = [
    ...input.components,
    ...input.extraParts.split(",").map((part) => part.trim()).filter(Boolean),
  ];
  const targetType = input.targetLocationType ?? inferLocationType(input.targetLocation);
  const targetStatus = targetStatusForLocation(input.targetLocation);
  const technician = input.technician.trim();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // The unit was sent to Doyle when its custody transfer to the shop was
  // logged — use that date, not today, so sent_date reflects reality.
  const transfers = await fetchTransfers(input.ptacId);
  const dispatchTransfer = transfers.find((transfer) =>
    (transfer.to_location ?? "").includes("Doyle")
  );
  const sentDate = dispatchTransfer?.transfer_date
    ? String(dispatchTransfer.transfer_date).slice(0, 10)
    : todayStr;

  let transferNotes =
    `Doyle return invoice ${input.invoice}. Parts: ${allParts.join(", ") || "None"}. ${input.notes}`.trim();

  if (occupyingUnit) {
    const overrideNote = `Occupied-location override: ${occupyingUnit.ptac_id} was moved to Maintenance Office.`;
    transferNotes = `${transferNotes} ${overrideNote}`;
    await updateUnitLocation({
      ptacId: occupyingUnit.ptac_id,
      status: "Maintenance Office",
      location: "Maintenance Office",
      technician,
      notes: `Displaced by ${input.ptacId} Doyle return deployment to ${input.targetLocation}.`,
    });
  }

  const { error: repairError } = await supabase.from("doyle_repairs").insert({
    ptac_id: input.ptacId,
    sent_date: sentDate,
    return_date: todayStr,
    doyle_diagnosis: `Invoice ${input.invoice}. ${input.notes}`.trim(),
    labor_cost: 0,
    parts_cost: input.totalBill,
    is_completed: true,
  });
  if (repairError) throw repairError;

  const { error: transferError } = await supabase.from("custody_transfers").insert({
    ptac_id: input.ptacId,
    from_location: input.unit.current_location_name || "Doyle Shop",
    to_location: input.targetLocation,
    technician_name: technician,
    notes: transferNotes,
  });
  if (transferError) throw transferError;

  const { error: updateError } = await supabase
    .from("ptac_units")
    .update({
      status: targetStatus,
      location_type: targetType,
      current_location_name: input.targetLocation,
    })
    .eq("ptac_id", input.ptacId);
  if (updateError) throw friendlyWriteError(updateError);
}
