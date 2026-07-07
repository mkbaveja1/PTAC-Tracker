"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { usePmMutation } from "@/lib/hooks/use-unit-mutations";
import type { PtacUnit } from "@/types/database";

const PM_TASKS = [
  { key: "filters", label: "Filters washed / replaced" },
  { key: "coils", label: "Coils vacuumed & inspected" },
  { key: "wiring", label: "Wiring & thermostat calibrated" },
  { key: "blower", label: "Blower fan centered & oiled" },
] as const;

// Port of render_pm_form(): all 4 tasks required; unit moves to Maintenance
// Office first if needed and stays there after PM.
export function PmDialog({ unit, trigger }: { unit: PtacUnit; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [technician, setTechnician] = useState("");
  const [notes, setNotes] = useState("");
  const [tasks, setTasks] = useState({ filters: false, coils: false, wiring: false, blower: false });

  const pmMutation = usePmMutation();

  const resetForm = () => {
    setTechnician("");
    setNotes("");
    setTasks({ filters: false, coils: false, wiring: false, blower: false });
  };

  const handleSubmit = async () => {
    if (!technician.trim()) {
      toast.error("Technician name is required.");
      return;
    }
    if (!(tasks.filters && tasks.coils && tasks.wiring && tasks.blower)) {
      toast.error("All four PM checklist items must be checked before logging PM completion.");
      return;
    }

    try {
      await pmMutation.mutateAsync({
        unit,
        technician: technician.trim(),
        notes,
        tasks,
      });
      toast.success(
        "Preventative maintenance logged. Unit remains at Maintenance Office until deployed back."
      );
      resetForm();
      setOpen(false);
    } catch (error) {
      toast.error(`PM log failed: ${(error as Error).message}`);
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
          <DialogTitle>Preventative Maintenance</DialogTitle>
        </DialogHeader>

        <p className="text-xs font-semibold text-slate-500">
          PM work is logged from the Maintenance Office. Submitting this will move the unit there
          first if needed.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pm-technician">Technician Name</Label>
            <Input
              id="pm-technician"
              value={technician}
              onChange={(event) => setTechnician(event.target.value)}
              placeholder="Enter technician name"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PM_TASKS.map((task) => (
              <label
                key={task.key}
                className="flex items-start gap-2 text-xs font-semibold text-slate-700"
              >
                <Checkbox
                  checked={tasks[task.key]}
                  onCheckedChange={(checked) =>
                    setTasks((prev) => ({ ...prev, [task.key]: checked === true }))
                  }
                />
                {task.label}
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pm-notes">Diagnostic Notes</Label>
            <Textarea
              id="pm-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="e.g. Filters cleaned. Air output temperature verified optimal."
              rows={3}
            />
          </div>

          <Button className="w-full" disabled={pmMutation.isPending} onClick={handleSubmit}>
            {pmMutation.isPending ? "Registering…" : "Register PM Log"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
