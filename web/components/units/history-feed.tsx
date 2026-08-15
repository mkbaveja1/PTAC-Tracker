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
} from "@/components/ui/dialog";
import { btuFromModel, doyleRepairCost } from "@/lib/domain/display";
import type { HistoryRowRef } from "@/lib/api/maintenance";
import { useDeleteHistoryMutation } from "@/lib/hooks/use-unit-mutations";
import {
  useDoyleRepairs,
  useOnsiteRepairs,
  usePmLogs,
  useTransfers,
} from "@/lib/hooks/use-units";
import type { PtacUnit } from "@/types/database";

interface HistoryEvent {
  date: string;
  title: string;
  location: string;
  notes: string;
  // Underlying log row; null for the Installation event (derived from
  // ptac_units.created_at, not deletable).
  source: HistoryRowRef | null;
}

const rowKey = (source: HistoryRowRef) => `${source.table}:${source.id}`;

// Port of fetch_history(): merge install, transfers, PM, onsite, and Doyle
// records into one timeline, newest first. Each log-backed event has a
// selection square on the right so testing entries can be deleted.
export function HistoryFeed({ unit }: { unit: PtacUnit }) {
  const ptacId = unit.ptac_id;
  const { data: transfers = [] } = useTransfers(ptacId);
  const { data: pmLogs = [] } = usePmLogs(ptacId);
  const { data: onsiteRepairs = [] } = useOnsiteRepairs(ptacId);
  const { data: doyleRepairs = [] } = useDoyleRepairs(ptacId);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteHistory = useDeleteHistoryMutation();

  const events: HistoryEvent[] = [];

  if (unit.created_at) {
    events.push({
      date: unit.created_at,
      title: "Installation",
      location: unit.current_location_name ?? "Initial Location",
      notes: `Initial ${btuFromModel(unit.model_specs)} unit deployment.`,
      source: null,
    });
  }

  for (const transfer of transfers) {
    events.push({
      date: transfer.transfer_date ?? "",
      title: "Custody Transfer",
      location: transfer.to_location ?? "Unknown",
      notes:
        transfer.notes ||
        `Moved from ${transfer.from_location} to ${transfer.to_location}.`,
      source: { table: "custody_transfers", id: transfer.transfer_id },
    });
  }

  for (const log of pmLogs) {
    // Prefer the stored checklist snapshot; fall back to the legacy booleans.
    let checks: string[] = [];
    if (log.completed_tasks) {
      try {
        checks = JSON.parse(log.completed_tasks) as string[];
      } catch {
        checks = [];
      }
    }
    if (checks.length === 0) {
      if (log.filters_washed_replaced) checks.push("filters");
      if (log.coils_vacuumed_inspected) checks.push("coils");
      if (log.wiring_thermostat_calibrated) checks.push("wiring");
      if (log.blower_fan_centered_oiled) checks.push("blower fan");
    }
    events.push({
      date: log.date_performed ?? "",
      title: "Preventative Maintenance",
      location: unit.current_location_name ?? "Unknown",
      notes: `Completed checks: ${checks.join(", ") || "general inspection"}. ${log.diagnostic_notes ?? ""}`.trim(),
      source: { table: "pm_logs", id: log.pm_id },
    });
  }

  for (const repair of onsiteRepairs) {
    events.push({
      date: repair.repair_date ?? "",
      title: "Onsite Repair",
      location: "Maintenance Office",
      notes: `Parts: ${repair.parts_replaced}. Cost: $${repair.repair_cost}. ${repair.diagnostic_notes ?? ""}`.trim(),
      source: { table: "onsite_repairs", id: repair.repair_id },
    });
  }

  for (const repair of doyleRepairs) {
    events.push({
      date: repair.return_date ?? repair.sent_date ?? "",
      title: "Doyle Repair",
      location: "Doyle Shop",
      notes: `Diagnosis: ${repair.doyle_diagnosis || "Pending"}. Cost: $${doyleRepairCost(repair).toLocaleString("en-US", { minimumFractionDigits: 2 })}.`,
      source: { table: "doyle_repairs", id: repair.doyle_id },
    });
  }

  events.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const toggleSelected = (source: HistoryRowRef, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(rowKey(source));
      else next.delete(rowKey(source));
      return next;
    });
  };

  const selectedRows: HistoryRowRef[] = events
    .filter((event) => event.source && selected.has(rowKey(event.source)))
    .map((event) => event.source!);

  const handleDelete = async () => {
    try {
      await deleteHistory.mutateAsync(selectedRows);
      toast.success(
        `${selectedRows.length} history ${selectedRows.length === 1 ? "entry" : "entries"} deleted.`
      );
      setSelected(new Set());
      setConfirmOpen(false);
    } catch (error) {
      toast.error(`Delete failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className="mt-6 rounded-[22px] border border-slate-200 bg-white px-7 py-6 shadow-sm">
      <div className="mb-4.5 flex items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <h3 className="text-lg font-black text-slate-900">Location History &amp; Maintenance Feed</h3>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={deleteHistory.isPending}
            >
              Delete Selected ({selected.size})
            </Button>
          )}
          <span className="text-xs font-black text-slate-400">Newest First</span>
        </div>
      </div>
      {events.length === 0 ? (
        <p className="text-[13px] font-semibold text-slate-400">No history found for this unit yet.</p>
      ) : (
        events.map((event, index) => (
          <div
            key={event.source ? rowKey(event.source) : `install-${index}`}
            className="relative ml-2 border-l-2 border-slate-200 pb-4.5 pl-5.5"
          >
            <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-slate-400" />
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-black text-slate-900">{event.title}</span>
              <span className="flex items-center gap-2.5 text-xs font-extrabold text-slate-400">
                {String(event.date).slice(0, 10)}
                {event.source && (
                  <Checkbox
                    aria-label={`Select ${event.title} on ${String(event.date).slice(0, 10)} for deletion`}
                    checked={selected.has(rowKey(event.source))}
                    onCheckedChange={(checked) => toggleSelected(event.source!, checked === true)}
                  />
                )}
              </span>
            </div>
            <div className="mt-1 text-[10px] font-black uppercase text-slate-400">
              Location: {event.location}
            </div>
            <div className="mt-2 rounded-xl bg-slate-50 p-3 text-xs font-medium text-slate-600">
              &quot;{event.notes}&quot;
            </div>
          </div>
        ))
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete History Entries</DialogTitle>
          </DialogHeader>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
            This permanently deletes {selectedRows.length}{" "}
            {selectedRows.length === 1 ? "entry" : "entries"} from the maintenance logs. Deleted
            repair entries also disappear from Spending Audits. This cannot be undone.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteHistory.isPending} onClick={handleDelete}>
              {deleteHistory.isPending ? "Deleting…" : "Delete Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
