"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODEL_OPTIONS, SPARE_STORAGE } from "@/lib/domain/constants";
import { nextPtacId } from "@/lib/domain/locations";
import { useRegisterSpareMutation } from "@/lib/hooks/use-unit-mutations";
import type { PtacUnit } from "@/types/database";

// Port of the directory add-spare form: inserts into ptac_units with
// location_type = "Spare" — no separate spares table.
export function SpareRegistrationForm({
  allUnits,
  onDone,
}: {
  allUnits: PtacUnit[];
  onDone: () => void;
}) {
  const [modelSpecs, setModelSpecs] = useState<string>(MODEL_OPTIONS[0]);
  const [serialNumber, setSerialNumber] = useState("");
  const [storageLocation, setStorageLocation] = useState(SPARE_STORAGE);

  const registerSpare = useRegisterSpareMutation();
  const newId = nextPtacId(allUnits);

  const handleSubmit = async () => {
    if (!serialNumber.trim()) {
      toast.error("Serial number is required.");
      return;
    }
    try {
      await registerSpare.mutateAsync({
        ptacId: newId,
        serialNumber: serialNumber.trim(),
        modelSpecs,
        storageLocation: storageLocation.trim() || SPARE_STORAGE,
      });
      toast.success(`${newId} was added as a spare unit.`);
      setSerialNumber("");
      onDone();
    } catch (error) {
      toast.error(`Registration failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h4 className="text-base font-black text-slate-900">Register New Spare Unit</h4>
      <p className="mt-1 text-xs font-semibold text-slate-500">
        This inserts a new row into the existing <code>ptac_units</code> table. It does not require
        a separate spares table.
      </p>
      <div className="mt-3 inline-block rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs font-bold text-slate-700">
        Next ID: {newId}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Model Specifications</Label>
          <Select value={modelSpecs} onValueChange={setModelSpecs}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="spare-serial">Serial Number</Label>
          <Input
            id="spare-serial"
            value={serialNumber}
            onChange={(event) => setSerialNumber(event.target.value)}
            placeholder="AMN-12345678"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="spare-location">Storage Location</Label>
          <Input
            id="spare-location"
            value={storageLocation}
            onChange={(event) => setStorageLocation(event.target.value)}
          />
        </div>
      </div>

      <Button className="mt-4" disabled={registerSpare.isPending} onClick={handleSubmit}>
        {registerSpare.isPending ? "Ingesting…" : "Ingest Stock Spare"}
      </Button>
    </div>
  );
}
