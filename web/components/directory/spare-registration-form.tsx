"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SPARE_STORAGE } from "@/lib/domain/constants";
import { availableLocationGroups, nextPtacId } from "@/lib/domain/locations";
import { useEnabledLocationNames } from "@/lib/hooks/use-location-categories";
import { useEnabledModelNames } from "@/lib/hooks/use-model-options";
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
  // null draft → default to the first available model; a string → user picked.
  const [modelDraft, setModelDraft] = useState<string | null>(null);
  const [serialNumber, setSerialNumber] = useState("");
  const [location, setLocation] = useState(SPARE_STORAGE);

  const registerSpare = useRegisterSpareMutation();
  const newId = nextPtacId(allUnits);
  const categoryNames = useEnabledLocationNames();
  const locationGroups = availableLocationGroups(allUnits, categoryNames);
  const modelOptions = useEnabledModelNames();
  const modelSpecs = modelDraft ?? modelOptions[0] ?? "";

  const handleSubmit = async () => {
    if (!serialNumber.trim()) {
      toast.error("Serial number is required.");
      return;
    }
    if (!location) {
      toast.error("Choose a location for the new unit.");
      return;
    }
    if (!modelSpecs) {
      toast.error("No models available. Add one in Settings → Unit Models.");
      return;
    }
    try {
      await registerSpare.mutateAsync({
        ptacId: newId,
        serialNumber: serialNumber.trim(),
        modelSpecs,
        location,
        // A custom category's name is also its type; built-ins infer from name.
        locationType: categoryNames.includes(location) ? location : undefined,
      });
      toast.success(`${newId} was registered at ${location}.`);
      setSerialNumber("");
      onDone();
    } catch (error) {
      // 23505 = unique violation: someone else registered a spare at the same
      // time and took this ID. The list refetches, producing a fresh next ID.
      if ((error as { code?: string }).code === "23505") {
        toast.error(`${newId} was just taken by another registration — please try again.`);
      } else {
        toast.error(`Registration failed: ${(error as Error).message}`);
      }
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
          <Select value={modelSpecs} onValueChange={setModelDraft}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a model..." />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((model) => (
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
          <Label>Initial Location</Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a location..." />
            </SelectTrigger>
            <SelectContent>
              {locationGroups.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button className="mt-4" disabled={registerSpare.isPending} onClick={handleSubmit}>
        {registerSpare.isPending ? "Ingesting…" : "Ingest Stock Spare"}
      </Button>
    </div>
  );
}
