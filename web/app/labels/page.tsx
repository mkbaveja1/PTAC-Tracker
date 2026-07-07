"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AverySheet } from "@/components/labels/avery-sheet";
import { displayStatus } from "@/lib/domain/display";
import { useUnits } from "@/lib/hooks/use-units";
import type { PtacUnit } from "@/types/database";

const BATCH_OPTIONS = [
  "All Units",
  "Rooms Only",
  "Hallways Only",
  "Spares Only",
  "Maintenance Office",
  "Doyle Shop",
];

function filterUnits(units: PtacUnit[], batch: string): PtacUnit[] {
  if (batch === "Rooms Only") return units.filter((u) => u.location_type === "Room");
  if (batch === "Hallways Only") return units.filter((u) => u.location_type === "Hallway");
  if (batch === "Spares Only") return units.filter((u) => u.location_type === "Spare");
  if (batch === "Maintenance Office")
    return units.filter((u) => u.location_type === "Maintenance Office");
  if (batch === "Doyle Shop") return units.filter((u) => displayStatus(u) === "Doyle Shop");
  return units;
}

export default function LabelsPage() {
  const { data: units = [] } = useUnits();
  const [batch, setBatch] = useState("All Units");
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);

  const filtered = useMemo(() => filterUnits(units, batch), [units, batch]);
  const filteredIds = filtered.map((unit) => unit.ptac_id);

  // Default selection: first 10 of the current batch (matches Streamlit behavior).
  const effectiveSelection = selectedIds ?? new Set(filteredIds.slice(0, 10));

  const toggleUnit = (ptacId: string, checked: boolean) => {
    const next = new Set(effectiveSelection);
    if (checked) next.add(ptacId);
    else next.delete(ptacId);
    setSelectedIds(next);
  };

  const printable = filtered.filter((unit) => effectiveSelection.has(unit.ptac_id));
  const sheets: PtacUnit[][] = [];
  for (let start = 0; start < printable.length; start += 10) {
    sheets.push(printable.slice(start, start + 10));
  }

  return (
    <div>
      <div className="print:hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[28px] font-black tracking-tight text-slate-900">
              Avery Thermal Sheet Printer
            </h2>
            <p className="mt-1.5 max-w-2xl text-[13px] font-semibold leading-relaxed text-slate-500">
              Formally laid out for Avery Manufacturer Part Number <strong>PLS-591PM-10</strong> (2
              Columns x 5 Rows, 4&quot; x 2&quot; standard sticker labels).
            </p>
          </div>
          <Button onClick={() => window.print()} disabled={printable.length === 0}>
            Print Label Sheet
          </Button>
        </div>

        {/* Selection card */}
        <div className="my-5 rounded-2xl border border-slate-200 bg-white px-4.5 py-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_1fr]">
            <div>
              <div className="mb-1.5 text-[11px] font-black uppercase tracking-[0.06em] text-slate-500">
                Selection Batch
              </div>
              <Select
                value={batch}
                onValueChange={(next) => {
                  setBatch(next);
                  setSelectedIds(null); // reset to first 10 of the new batch
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BATCH_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                disabled={filteredIds.length === 0}
                onClick={() => setSelectedIds(new Set(filteredIds))}
              >
                Select All Shown
              </Button>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear All Selection
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-4 text-xs font-semibold text-slate-400">
              No units match this batch filter.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((unit) => (
                <label
                  key={unit.ptac_id}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-700"
                >
                  <Checkbox
                    checked={effectiveSelection.has(unit.ptac_id)}
                    onCheckedChange={(checked) => toggleUnit(unit.ptac_id, checked === true)}
                  />
                  {unit.ptac_id} — {unit.current_location_name || "Unassigned"}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4.5 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3.5 text-xs leading-relaxed text-amber-800">
          <strong>Avery PLS-591PM-10 Specifications:</strong> 10 Labels per Sheet (4.0&quot; x
          2.0&quot;). Perfect sizing for PTAC chassis. Selected labels use standard paper
          configuration on print output.
        </div>
      </div>

      {/* Preview / print area */}
      <div className="avery-print-area rounded-[18px] border border-indigo-200 bg-indigo-50 p-4.5 print:border-0 print:bg-white print:p-0">
        <p className="print:hidden mb-3.5 text-center text-[11px] font-black tracking-[0.14em] text-slate-500">
          AVERY PLS-591PM-10 PREVIEW LAYOUT
        </p>
        {printable.length === 0 ? (
          <p className="print:hidden py-8 text-center text-[13px] font-bold text-slate-400">
            Choose at least one unit above to preview labels.
          </p>
        ) : (
          sheets.map((pageUnits, index) => (
            <AverySheet key={index} sheetNumber={index + 1} units={pageUnits} />
          ))
        )}
      </div>
    </div>
  );
}
