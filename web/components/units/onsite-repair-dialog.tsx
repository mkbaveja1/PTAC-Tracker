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
import { Textarea } from "@/components/ui/textarea";
import { useOnsiteRepairMutation } from "@/lib/hooks/use-unit-mutations";
import type { PtacUnit } from "@/types/database";

// Port of render_repair_form(): technician + notes required; unit moves to
// Maintenance Office first if needed.
export function OnsiteRepairDialog({
  unit,
  trigger,
}: {
  unit: PtacUnit;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [technician, setTechnician] = useState("");
  const [parts, setParts] = useState("");
  const [cost, setCost] = useState("");
  const [notes, setNotes] = useState("");

  const repairMutation = useOnsiteRepairMutation();

  const resetForm = () => {
    setTechnician("");
    setParts("");
    setCost("");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!technician.trim()) {
      toast.error("Technician name is required.");
      return;
    }
    if (!notes.trim()) {
      toast.error("Diagnostic or repair notes are required.");
      return;
    }
    const costValue = parseFloat(cost) || 0;
    if (costValue < 0) {
      toast.error("Repair cost cannot be negative.");
      return;
    }

    try {
      await repairMutation.mutateAsync({
        unit,
        technician: technician.trim(),
        parts,
        cost: costValue,
        notes,
      });
      toast.success("Onsite repair logged.");
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error(`Repair log failed: ${(error as Error).message}`);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Document Repair Costs</DialogTitle>
        </DialogHeader>

        <p className="text-xs font-semibold text-slate-500">
          Onsite repairs are performed from the Maintenance Office. Submitting this will move the
          unit there first if needed.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="repair-technician">Technician Name</Label>
            <Input
              id="repair-technician"
              value={technician}
              onChange={(event) => setTechnician(event.target.value)}
              placeholder="Enter technician name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repair-parts">Replaced Parts</Label>
            <Input
              id="repair-parts"
              value={parts}
              onChange={(event) => setParts(event.target.value)}
              placeholder="Capacitor, fan relay, blower wheel"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repair-cost">Total Repair Cost ($)</Label>
            <Input
              id="repair-cost"
              type="number"
              min={0}
              step={10}
              value={cost}
              onChange={(event) => setCost(event.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="repair-notes">Diagnostic / Repair Notes</Label>
            <Textarea
              id="repair-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>

          <Button className="w-full" disabled={repairMutation.isPending} onClick={handleSubmit}>
            {repairMutation.isPending ? "Logging…" : "Log Onsite Repair"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
