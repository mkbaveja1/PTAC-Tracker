"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  activeUnitAtLocation,
  allowedTransferPaths,
  corridorOptions,
  resolveTargetLocation,
  roomOptions,
  targetStatusForLocation,
  type TransferRoute,
} from "@/lib/domain/locations";
import { useUnits } from "@/lib/hooks/use-units";
import { useTransferMutation } from "@/lib/hooks/use-unit-mutations";
import type { PtacUnit } from "@/types/database";

// Port of render_transfer_form(): destination options depend on the unit's
// current state; dependent dropdowns update immediately (controlled state).
export function CustodyTransferDialog({
  unit,
  trigger,
}: {
  unit: PtacUnit;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [route, setRoute] = useState<TransferRoute | null>(null);
  const [roomChoice, setRoomChoice] = useState<string | null>(null);
  const [corridorChoice, setCorridorChoice] = useState<string | null>(null);
  const [overrideOccupied, setOverrideOccupied] = useState(false);
  const [technician, setTechnician] = useState("");
  // null → show the prefilled default note for the chosen destination
  const [notesOverride, setNotesOverride] = useState<string | null>(null);

  const { data: allUnits = [] } = useUnits();
  const transferMutation = useTransferMutation();

  const routeOptions = allowedTransferPaths(unit);
  const targetLocation = resolveTargetLocation(route, roomChoice, corridorChoice);
  const occupyingUnit = useMemo(
    () => (targetLocation ? activeUnitAtLocation(allUnits, targetLocation, unit.ptac_id) : null),
    [allUnits, targetLocation, unit.ptac_id]
  );

  // Prefilled transfer notes for the destination (matches the Streamlit default).
  let defaultNotes = "";
  if (targetLocation) {
    defaultNotes = `Transfer ${unit.ptac_id} from ${unit.current_location_name || "Unknown"} to ${targetLocation}.`;
    if (occupyingUnit) {
      defaultNotes += ` Occupied-location override: ${occupyingUnit.ptac_id} will be moved to Maintenance Office.`;
    }
  }
  const notes = notesOverride ?? defaultNotes;

  // Destination changes invalidate the edited note and any override confirmation.
  const onDestinationChange = () => {
    setNotesOverride(null);
    setOverrideOccupied(false);
  };

  const resetForm = () => {
    setRoute(null);
    setRoomChoice(null);
    setCorridorChoice(null);
    setOverrideOccupied(false);
    setTechnician("");
    setNotesOverride(null);
  };

  const handleSubmit = async () => {
    if (occupyingUnit && !overrideOccupied) {
      toast.error("You must confirm the occupied-room override before transferring into this location.");
      return;
    }
    if (!targetLocation) {
      toast.error("Choose a valid target destination.");
      return;
    }
    if (!technician.trim()) {
      toast.error("Technician name is required.");
      return;
    }

    let finalNotes = notes.trim() || `Transfer ${unit.ptac_id} to ${targetLocation}.`;
    if (occupyingUnit) {
      const overrideNote = `Occupied-location override: ${occupyingUnit.ptac_id} was moved to Maintenance Office.`;
      if (!finalNotes.includes(overrideNote)) {
        finalNotes = `${finalNotes} ${overrideNote}`;
      }
    }

    try {
      if (occupyingUnit) {
        await transferMutation.mutateAsync({
          ptacId: occupyingUnit.ptac_id,
          status: "Maintenance Office",
          location: "Maintenance Office",
          technician: technician.trim(),
          notes: `Displaced by ${unit.ptac_id} deployment to ${targetLocation}.`,
        });
      }
      await transferMutation.mutateAsync({
        ptacId: unit.ptac_id,
        status: targetStatusForLocation(targetLocation),
        location: targetLocation,
        technician: technician.trim(),
        notes: finalNotes,
      });
      toast.success(`${unit.ptac_id} moved to ${targetLocation}.`);
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error(`Transfer failed: ${(error as Error).message}`);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transfer PTAC Custody</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Authorized Target Destination</Label>
            <Select
              value={route ?? ""}
              onValueChange={(value) => {
                setRoute(value as TransferRoute);
                setRoomChoice(null);
                setCorridorChoice(null);
                onDestinationChange();
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a destination..." />
              </SelectTrigger>
              <SelectContent>
                {routeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {route === "Guest Room" && (
            <div className="space-y-2">
              <Label>Hotel Drop Zone Selection</Label>
              <Select
                value={roomChoice ?? ""}
                onValueChange={(value) => {
                  setRoomChoice(value);
                  onDestinationChange();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a guest room..." />
                </SelectTrigger>
                <SelectContent>
                  {roomOptions().map((room) => (
                    <SelectItem key={room} value={room}>
                      {room}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {route === "Corridor/Hallway" && (
            <div className="space-y-2">
              <Label>Corridor Selection</Label>
              <Select
                value={corridorChoice ?? ""}
                onValueChange={(value) => {
                  setCorridorChoice(value);
                  onDestinationChange();
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a hallway..." />
                </SelectTrigger>
                <SelectContent>
                  {corridorOptions().map((corridor) => (
                    <SelectItem key={corridor} value={corridor}>
                      {corridor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {route && !targetLocation && (
            <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs font-semibold text-blue-800">
              Choose the specific destination before executing the transfer.
            </p>
          )}

          {occupyingUnit && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              {targetLocation} already has active unit {occupyingUnit.ptac_id}. If you continue,
              that existing unit will be moved to Maintenance Office and logged.
            </p>
          )}

          {targetLocation && (
            <>
              {occupyingUnit && (
                <label className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                  <Checkbox
                    checked={overrideOccupied}
                    onCheckedChange={(checked) => setOverrideOccupied(checked === true)}
                  />
                  Confirm occupied-room override and move existing unit to Maintenance Office
                </label>
              )}
              <div className="space-y-2">
                <Label htmlFor="transfer-technician">Technician Name</Label>
                <Input
                  id="transfer-technician"
                  value={technician}
                  onChange={(event) => setTechnician(event.target.value)}
                  placeholder="Enter technician name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer-notes">Transfer Notes</Label>
                <Textarea
                  id="transfer-notes"
                  value={notes}
                  onChange={(event) => setNotesOverride(event.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          <Button
            className="w-full"
            disabled={!targetLocation || transferMutation.isPending}
            onClick={handleSubmit}
          >
            {transferMutation.isPending ? "Executing…" : "Execute Custody Transfer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
