"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { statusForLocationType } from "@/lib/domain/locations";
import { useEditSpecsMutation } from "@/lib/hooks/use-unit-mutations";
import type { PtacUnit } from "@/types/database";

// Location types the editor exposes, with friendlier labels.
const LOCATION_TYPE_CHOICES = [
  { value: "Room", label: "Guest Room" },
  { value: "Hallway", label: "Hallway / Corridor" },
  { value: "Elevator Closet", label: "Elevator Closet" },
  { value: "Maintenance Office", label: "Maintenance Office" },
  { value: "Doyle Shop", label: "Doyle Shop" },
  { value: "Spare", label: "Spare / Storage" },
];

// Full specification editor: model + serial, plus location (name & type).
// Renaming a corridor or moving a unit anywhere happens here; location changes
// are written to the history feed as a custody transfer.
export function EditSpecsDialog({ unit, trigger }: { unit: PtacUnit; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [modelSpecs, setModelSpecs] = useState(unit.model_specs ?? "");
  const [serialNumber, setSerialNumber] = useState(unit.serial_number ?? "");
  const [locationName, setLocationName] = useState(unit.current_location_name ?? "");
  const [locationType, setLocationType] = useState(unit.location_type ?? "Room");
  const [changedBy, setChangedBy] = useState("");

  const editSpecs = useEditSpecsMutation();

  const resetToUnit = () => {
    setModelSpecs(unit.model_specs ?? "");
    setSerialNumber(unit.serial_number ?? "");
    setLocationName(unit.current_location_name ?? "");
    setLocationType(unit.location_type ?? "Room");
    setChangedBy("");
  };

  const locationChanged =
    locationName.trim() !== (unit.current_location_name ?? "") ||
    locationType !== (unit.location_type ?? "");

  const handleSubmit = async () => {
    if (!modelSpecs.trim() || !serialNumber.trim()) {
      toast.error("Model specifications and serial number are required.");
      return;
    }
    if (!locationName.trim()) {
      toast.error("Location name is required.");
      return;
    }
    if (locationChanged && !changedBy.trim()) {
      toast.error("Enter who's making this change so it can be logged in the unit's history.");
      return;
    }

    try {
      await editSpecs.mutateAsync({
        ptacId: unit.ptac_id,
        modelSpecs: modelSpecs.trim(),
        serialNumber: serialNumber.trim(),
        locationName: locationName.trim(),
        locationType,
        // Location moves take the status that matches the new type; a
        // metadata-only edit (model/serial) leaves status untouched.
        status: locationChanged ? statusForLocationType(locationType) : (unit.status ?? "Active"),
        logTransfer: locationChanged
          ? {
              fromLocation: unit.current_location_name ?? "Unknown",
              technician: changedBy.trim(),
              notes: `Location updated via Edit Specifications to ${locationName.trim()} (${locationType}).`,
            }
          : undefined,
      });
      toast.success(
        locationChanged ? `${unit.ptac_id} updated and moved to ${locationName.trim()}.` : "Specifications updated."
      );
      setOpen(false);
    } catch (error) {
      toast.error(`Update failed: ${(error as Error).message}`);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetToUnit();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Specifications</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-model">Model / Specifications</Label>
            <Input
              id="edit-model"
              value={modelSpecs}
              onChange={(event) => setModelSpecs(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-serial">Serial Number</Label>
            <Input
              id="edit-serial"
              value={serialNumber}
              onChange={(event) => setSerialNumber(event.target.value)}
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-[11px] font-black uppercase tracking-wide text-slate-500">
              Location
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Location Type</Label>
                <Select value={locationType} onValueChange={setLocationType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPE_CHOICES.map((choice) => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location-name">Location Name</Label>
                <Input
                  id="edit-location-name"
                  value={locationName}
                  onChange={(event) => setLocationName(event.target.value)}
                  placeholder="e.g. Floor 2A, Room 204"
                />
                <p className="text-[11px] font-semibold text-slate-400">
                  Type any name — e.g. rename a corridor to &quot;Floor 2A&quot; or move a unit into
                  a hallway slot.
                </p>
              </div>
            </div>
          </div>

          {locationChanged && (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <Label htmlFor="edit-changed-by" className="text-amber-900">
                Changed by (logged in history)
              </Label>
              <Input
                id="edit-changed-by"
                value={changedBy}
                onChange={(event) => setChangedBy(event.target.value)}
                placeholder="Your name"
                className="bg-white"
              />
              <p className="text-[11px] font-semibold text-amber-800">
                Moving from {unit.current_location_name || "Unknown"} → {locationName.trim() || "…"}.
                This will appear in the unit&apos;s history feed.
              </p>
            </div>
          )}

          <Button className="w-full" disabled={editSpecs.isPending} onClick={handleSubmit}>
            {editSpecs.isPending ? "Saving…" : "Save Specifications"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
