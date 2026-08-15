"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMarkDueForPmMutation } from "@/lib/hooks/use-unit-mutations";
import { useUnits } from "@/lib/hooks/use-units";

// Manually flag a specific unit as due for PM, regardless of the schedule.
export function PmDueSetting() {
  const { data: units = [] } = useUnits();
  const [ptacId, setPtacId] = useState("");
  const markDue = useMarkDueForPmMutation();

  const sorted = useMemo(
    () => [...units].sort((a, b) => a.ptac_id.localeCompare(b.ptac_id)),
    [units]
  );

  const handleMarkDue = async () => {
    if (!ptacId) {
      toast.error("Choose a unit first.");
      return;
    }
    try {
      await markDue.mutateAsync(ptacId);
      toast.success(`${ptacId} marked due for PM.`);
      setPtacId("");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500">
        Force a specific unit to show &quot;Needs PM&quot; now, no matter the schedule. It stays due
        until a PM is logged. (Deployed units show it immediately; a unit in storage or at Doyle
        shows it once it&apos;s back in service.)
      </p>
      <div className="flex flex-wrap gap-2">
        <Select value={ptacId} onValueChange={setPtacId}>
          <SelectTrigger className="min-w-[240px] flex-1">
            <SelectValue placeholder="Choose a unit..." />
          </SelectTrigger>
          <SelectContent>
            {sorted.map((unit) => (
              <SelectItem key={unit.ptac_id} value={unit.ptac_id}>
                {unit.ptac_id} — {unit.current_location_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleMarkDue} disabled={markDue.isPending}>
          {markDue.isPending ? "Flagging…" : "Mark Due for PM"}
        </Button>
      </div>
    </div>
  );
}
