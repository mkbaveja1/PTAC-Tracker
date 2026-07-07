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
import { useUpdateSpecsMutation } from "@/lib/hooks/use-unit-mutations";
import type { PtacUnit } from "@/types/database";

// Port of render_edit_form(): both fields required.
export function EditSpecsDialog({ unit, trigger }: { unit: PtacUnit; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [modelSpecs, setModelSpecs] = useState(unit.model_specs ?? "");
  const [serialNumber, setSerialNumber] = useState(unit.serial_number ?? "");

  const updateSpecs = useUpdateSpecsMutation();

  const handleSubmit = async () => {
    if (!modelSpecs.trim() || !serialNumber.trim()) {
      toast.error("Model specifications and serial number are required.");
      return;
    }
    try {
      await updateSpecs.mutateAsync({
        ptacId: unit.ptac_id,
        modelSpecs: modelSpecs.trim(),
        serialNumber: serialNumber.trim(),
      });
      toast.success("Specifications updated.");
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
        if (next) {
          setModelSpecs(unit.model_specs ?? "");
          setSerialNumber(unit.serial_number ?? "");
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
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

          <Button className="w-full" disabled={updateSpecs.isPending} onClick={handleSubmit}>
            {updateSpecs.isPending ? "Saving…" : "Save Specification Edits"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
