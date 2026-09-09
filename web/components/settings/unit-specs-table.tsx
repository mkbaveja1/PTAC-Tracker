"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateSpecsMutation } from "@/lib/hooks/use-unit-mutations";
import { useUnits } from "@/lib/hooks/use-units";
import type { PtacUnit } from "@/types/database";

// One editable row: model + serial with an inline Save that lights up on edit.
function SpecRow({ unit }: { unit: PtacUnit }) {
  const [model, setModel] = useState(unit.model_specs ?? "");
  const [serial, setSerial] = useState(unit.serial_number ?? "");
  const [mfgDate, setMfgDate] = useState(unit.manufacturing_date ?? "");
  const save = useUpdateSpecsMutation();

  const dirty =
    model !== (unit.model_specs ?? "") ||
    serial !== (unit.serial_number ?? "") ||
    mfgDate !== (unit.manufacturing_date ?? "");

  const handleSave = async () => {
    if (!model.trim() || !serial.trim()) {
      toast.error("Model and serial can't be empty.");
      return;
    }
    try {
      await save.mutateAsync({
        ptacId: unit.ptac_id,
        modelSpecs: model.trim(),
        serialNumber: serial.trim(),
        // Manufacturing date is optional — empty clears it.
        manufacturingDate: mfgDate.trim() || null,
      });
      toast.success(`${unit.ptac_id} updated.`);
    } catch (error) {
      toast.error(`Update failed: ${(error as Error).message}`);
    }
  };

  return (
    <div className="grid grid-cols-[88px_1.2fr_1fr_0.95fr_1fr_72px] items-center gap-2 border-b border-slate-100 px-2 py-2 last:border-b-0">
      <span className="inline-block w-fit rounded-[7px] border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-black text-slate-900">
        {unit.ptac_id}
      </span>
      <Input value={model} onChange={(e) => setModel(e.target.value)} className="h-9" />
      <Input value={serial} onChange={(e) => setSerial(e.target.value)} className="h-9" />
      <Input
        value={mfgDate}
        onChange={(e) => setMfgDate(e.target.value)}
        className="h-9"
        placeholder="e.g. 2019-06"
      />
      <span className="truncate text-xs font-bold text-slate-600" title={unit.current_location_name ?? ""}>
        {unit.current_location_name}
      </span>
      <Button
        size="sm"
        variant={dirty ? "default" : "outline"}
        disabled={!dirty || save.isPending}
        onClick={handleSave}
      >
        {save.isPending ? "…" : "Save"}
      </Button>
    </div>
  );
}

// Spreadsheet-style editor for unit model + serial across all units.
export function UnitSpecsTable() {
  const { data: units = [] } = useUnits();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const sorted = [...units].sort((a, b) => a.ptac_id.localeCompare(b.ptac_id));
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((u) =>
      [
        u.ptac_id,
        u.model_specs ?? "",
        u.serial_number ?? "",
        u.manufacturing_date ?? "",
        u.current_location_name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [units, query]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500">
        Edit model, serial, and manufacturing date inline. Change a field and hit Save on that row.
      </p>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by PTAC ID, model, or serial…"
      />

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[88px_1.2fr_1fr_0.95fr_1fr_72px] gap-2 border-b border-slate-200 bg-slate-50 px-2 py-2 text-[11px] font-black uppercase tracking-[0.06em] text-slate-500">
            <span>ID</span>
            <span>Model</span>
            <span>Serial</span>
            <span>Mfg Date</span>
            <span>Location</span>
            <span />
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {rows.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs font-bold text-slate-400">
                No units match that search.
              </p>
            ) : (
              rows.map((unit) => <SpecRow key={unit.ptac_id} unit={unit} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
