"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePmIntervalMonths, useUpdatePmIntervalMutation } from "@/lib/hooks/use-settings";

// How often routine PM is due. Active units past this schedule show "Needs PM".
export function PmScheduleSetting() {
  const pmIntervalMonths = usePmIntervalMonths();
  const updatePmInterval = useUpdatePmIntervalMutation();
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? String(pmIntervalMonths);
  const checksPerYear = Math.round((12 / (parseInt(value, 10) || pmIntervalMonths)) * 10) / 10;

  const handleSave = async () => {
    const months = parseInt(value, 10);
    if (!Number.isFinite(months) || months < 1 || months > 24) {
      toast.error("PM interval must be between 1 and 24 months.");
      return;
    }
    try {
      await updatePmInterval.mutateAsync(months);
      setDraft(null);
      toast.success(`Routine PM schedule set to every ${months} month${months === 1 ? "" : "s"}.`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-600">Every</span>
        <Input
          type="number"
          min={1}
          max={24}
          className="w-20"
          value={value}
          onChange={(e) => setDraft(e.target.value)}
        />
        <span className="text-xs font-bold text-slate-600">
          month{parseInt(value, 10) === 1 ? "" : "s"} (~{checksPerYear}×/year)
        </span>
        <Button size="sm" disabled={draft === null || updatePmInterval.isPending} onClick={handleSave}>
          {updatePmInterval.isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-slate-400">
        Active units past this schedule show as &quot;Needs PM&quot; across the app. Units also show
        Needs PM until their first PM is logged.
      </p>
    </div>
  );
}
