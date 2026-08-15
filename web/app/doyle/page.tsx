"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CORE_COMPONENTS, SPARE_STORAGE } from "@/lib/domain/constants";
import { btuFromModel, displayStatus } from "@/lib/domain/display";
import {
  computeLaborCost,
  latestDoyleDispatchNote,
  openFixedRepair,
} from "@/lib/api/doyle";
import { useDoyleRepairs, useTransfers, useUnits } from "@/lib/hooks/use-units";
import {
  useMarkDoyleFixedMutation,
  useShipDoyleUnitMutation,
} from "@/lib/hooks/use-unit-mutations";

// Where a fixed unit can be shipped back to — office or spare storage only.
const SHIP_TARGETS = [
  { value: "Maintenance Office", label: "Maintenance Office" },
  { value: SPARE_STORAGE, label: "Spare Storage Closet" },
];

function money(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface RepairForm {
  technician: string;
  invoice: string;
  components: Set<string>;
  extraParts: string;
  notes: string;
  partsCost: string;
  laborRate1: string;
  laborHours1: string;
  laborRate2: string;
  laborHours2: string;
}

const EMPTY_FORM: RepairForm = {
  technician: "",
  invoice: "",
  components: new Set(),
  extraParts: "",
  notes: "",
  partsCost: "",
  laborRate1: "",
  laborHours1: "",
  laborRate2: "",
  laborHours2: "",
};

export default function DoylePortalPage() {
  const { data: units = [] } = useUnits();
  const { data: transfers = [] } = useTransfers();
  const { data: doyleRepairs = [] } = useDoyleRepairs();
  const markFixed = useMarkDoyleFixedMutation();
  const shipUnit = useShipDoyleUnitMutation();

  // Units physically at Doyle, split into "awaiting repair" and "fixed".
  const doyleUnits = useMemo(
    () => units.filter((unit) => displayStatus(unit) === "Doyle Shop"),
    [units]
  );
  const fixedByUnit = useMemo(() => {
    const map = new Map<string, ReturnType<typeof openFixedRepair>>();
    for (const unit of doyleUnits) map.set(unit.ptac_id, openFixedRepair(unit.ptac_id, doyleRepairs));
    return map;
  }, [doyleUnits, doyleRepairs]);

  const repairQueue = doyleUnits.filter((u) => !fixedByUnit.get(u.ptac_id));
  const fixedQueue = doyleUnits.filter((u) => fixedByUnit.get(u.ptac_id));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<RepairForm>({ ...EMPTY_FORM, components: new Set() });
  const [shipTargets, setShipTargets] = useState<Record<string, string>>({});

  const effectiveId = selectedId ?? repairQueue[0]?.ptac_id ?? null;
  const selectedUnit = repairQueue.find((u) => u.ptac_id === effectiveId) ?? null;

  const resetForm = () => setForm({ ...EMPTY_FORM, components: new Set() });
  const set = <K extends keyof RepairForm>(key: K, value: RepairForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleComponent = (component: string, checked: boolean) => {
    setForm((prev) => {
      const next = new Set(prev.components);
      if (checked) next.add(component);
      else next.delete(component);
      return { ...prev, components: next };
    });
  };

  // Live labor + total preview.
  const laborCost = computeLaborCost({
    laborRate1: parseFloat(form.laborRate1) || 0,
    laborHours1: parseFloat(form.laborHours1) || 0,
    laborRate2: parseFloat(form.laborRate2) || 0,
    laborHours2: parseFloat(form.laborHours2) || 0,
  });
  const partsCost = parseFloat(form.partsCost) || 0;
  const totalCost = laborCost + partsCost;

  const handleMarkFixed = async () => {
    if (!selectedUnit) return;
    if (!form.technician.trim() || !form.invoice.trim()) {
      toast.error("Technician signature and invoice reference are required.");
      return;
    }
    try {
      await markFixed.mutateAsync({
        ptacId: selectedUnit.ptac_id,
        unit: selectedUnit,
        technician: form.technician,
        invoice: form.invoice.trim(),
        components: [...form.components],
        extraParts: form.extraParts,
        notes: form.notes,
        partsCost,
        laborRate1: parseFloat(form.laborRate1) || 0,
        laborHours1: parseFloat(form.laborHours1) || 0,
        laborRate2: parseFloat(form.laborRate2) || 0,
        laborHours2: parseFloat(form.laborHours2) || 0,
      });
      toast.success(`${selectedUnit.ptac_id} marked fixed — now awaiting shipment.`);
      setSelectedId(null);
      resetForm();
    } catch (error) {
      toast.error(`Could not mark fixed: ${(error as Error).message}`);
    }
  };

  const handleShip = async (ptacId: string) => {
    const repair = fixedByUnit.get(ptacId);
    const unit = fixedQueue.find((u) => u.ptac_id === ptacId);
    if (!repair || !unit) return;
    const target = shipTargets[ptacId] ?? "Maintenance Office";
    try {
      await shipUnit.mutateAsync({
        ptacId,
        unit,
        technician: "Doyle return",
        targetLocation: target,
        repairId: repair.doyle_id,
      });
      toast.success(`${ptacId} shipped to ${target}.`);
    } catch (error) {
      toast.error(`Could not ship: ${(error as Error).message}`);
    }
  };

  return (
    <div>
      {/* Dark contractor header */}
      <div className="mb-5 rounded-[20px] bg-slate-900 px-7 py-6 text-white">
        <span className="inline-block rounded-full border border-red-500/35 bg-red-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.06em] text-red-300">
          Contractor Interface
        </span>
        <h2 className="mb-1 mt-2.5 text-[28px] font-black">Doyle Offsite Repairs Portal</h2>
        <p className="text-[13px] text-slate-400">
          Log the repair and bill, then ship fixed units back when ready.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Queues */}
        <div className="space-y-6">
          {/* Repair queue */}
          <div>
            <h4 className="mb-3 text-[15px] font-black text-slate-900">
              Offsite Repair Queue ({repairQueue.length})
            </h4>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {repairQueue.length === 0 ? (
                <p className="text-xs font-semibold text-slate-500">No units awaiting repair.</p>
              ) : (
                repairQueue.map((unit) => {
                  const isSelected = effectiveId === unit.ptac_id;
                  let note = latestDoyleDispatchNote(unit.ptac_id, transfers);
                  if (note.length > 72) note = note.slice(0, 69) + "...";
                  return (
                    <button
                      key={unit.ptac_id}
                      onClick={() => {
                        setSelectedId(unit.ptac_id);
                        resetForm();
                      }}
                      className={`mb-2.5 block w-full rounded-[14px] bg-white px-4 py-3.5 text-left transition-shadow ${
                        isSelected
                          ? "border-2 border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.15)]"
                          : "border border-rose-200 hover:shadow-md"
                      }`}
                    >
                      <span className="float-right text-[11px] font-bold text-slate-500">
                        {btuFromModel(unit.model_specs)}
                      </span>
                      <div className="text-base font-black text-slate-900">{unit.ptac_id}</div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        S/N: {unit.serial_number || "N/A"}
                      </div>
                      <div className="mt-2.5 rounded-[10px] bg-slate-100 px-2.5 py-2 text-[11px] italic leading-snug text-slate-500">
                        {note}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Fixed queue — awaiting shipment */}
          <div>
            <h4 className="mb-3 text-[15px] font-black text-slate-900">
              Fixed — Awaiting Shipment ({fixedQueue.length})
            </h4>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {fixedQueue.length === 0 ? (
                <p className="text-xs font-semibold text-slate-500">
                  Nothing fixed and waiting. Repaired units appear here until you ship them.
                </p>
              ) : (
                fixedQueue.map((unit) => (
                  <div
                    key={unit.ptac_id}
                    className="mb-2.5 rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-base font-black text-slate-900">{unit.ptac_id}</div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
                        Fixed
                      </span>
                    </div>
                    <div className="mb-2 mt-1 text-[11px] text-slate-400">
                      S/N: {unit.serial_number || "N/A"}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={shipTargets[unit.ptac_id] ?? "Maintenance Office"}
                        onValueChange={(value) =>
                          setShipTargets((prev) => ({ ...prev, [unit.ptac_id]: value }))
                        }
                      >
                        <SelectTrigger className="h-9 flex-1 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SHIP_TARGETS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        disabled={shipUnit.isPending}
                        onClick={() => handleShip(unit.ptac_id)}
                      >
                        Ship to Hotel
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Repair entry form */}
        <div>
          <h4 className="mb-3 text-[15px] font-black text-slate-900">Tech Repair Entry Form</h4>
          <div className="min-h-[520px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {!selectedUnit ? (
              <p className="text-xs font-semibold text-slate-500">
                Select a unit from the repair queue to log its repair and mark it fixed.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Unit banner */}
                <div className="flex items-start justify-between gap-3 rounded-[14px] bg-slate-900 px-5 py-4.5 text-white">
                  <div>
                    <h3 className="mb-1.5 text-[22px] font-black">{selectedUnit.ptac_id}</h3>
                    <p className="text-xs text-slate-400">
                      {selectedUnit.model_specs} • S/N: {selectedUnit.serial_number} •{" "}
                      {btuFromModel(selectedUnit.model_specs)}
                    </p>
                  </div>
                  <span className="whitespace-nowrap rounded-full border border-red-500/40 bg-red-500/25 px-2.5 py-1 text-[10px] font-black uppercase text-red-200">
                    At Doyle Shop
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="doyle-tech">Technician Signature</Label>
                    <Input
                      id="doyle-tech"
                      value={form.technician}
                      onChange={(e) => set("technician", e.target.value)}
                      placeholder="e.g. Mechanic Steve"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doyle-invoice">Work Order / Invoice Ref #</Label>
                    <Input
                      id="doyle-invoice"
                      value={form.invoice}
                      onChange={(e) => set("invoice", e.target.value)}
                      placeholder="e.g. DOY-9082"
                    />
                  </div>
                </div>

                {/* Components */}
                <div className="rounded-xl border border-slate-200 px-3.5 py-3">
                  <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.04em] text-slate-500">
                    Replaced Core Components
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {CORE_COMPONENTS.map((component) => (
                      <label
                        key={component}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-700"
                      >
                        <Checkbox
                          checked={form.components.has(component)}
                          onCheckedChange={(checked) => toggleComponent(component, checked === true)}
                        />
                        {component}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doyle-extra">Additional Parts Used (Comma Separated)</Label>
                  <Input
                    id="doyle-extra"
                    value={form.extraParts}
                    onChange={(e) => set("extraParts", e.target.value)}
                    placeholder="e.g. Copper pipes, extra brackets"
                  />
                </div>

                {/* Bill: parts + labor split */}
                <div className="rounded-xl border border-slate-200 px-3.5 py-3">
                  <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.04em] text-slate-500">
                    Bill — Parts &amp; Labor
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="doyle-parts">Parts Cost ($)</Label>
                      <Input
                        id="doyle-parts"
                        type="number"
                        min={0}
                        step={1}
                        value={form.partsCost}
                        onChange={(e) => set("partsCost", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="doyle-rate1">Labor Rate 1 ($/hr)</Label>
                        <Input
                          id="doyle-rate1"
                          type="number"
                          min={0}
                          value={form.laborRate1}
                          onChange={(e) => set("laborRate1", e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doyle-hours1">Hours at Rate 1</Label>
                        <Input
                          id="doyle-hours1"
                          type="number"
                          min={0}
                          step={0.25}
                          value={form.laborHours1}
                          onChange={(e) => set("laborHours1", e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doyle-rate2">Labor Rate 2 ($/hr)</Label>
                        <Input
                          id="doyle-rate2"
                          type="number"
                          min={0}
                          value={form.laborRate2}
                          onChange={(e) => set("laborRate2", e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="doyle-hours2">Hours at Rate 2</Label>
                        <Input
                          id="doyle-hours2"
                          type="number"
                          min={0}
                          step={0.25}
                          value={form.laborHours2}
                          onChange={(e) => set("laborHours2", e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 border-t border-slate-100 pt-2.5 text-xs font-bold text-slate-600">
                      <span>Labor: {money(laborCost)}</span>
                      <span>Parts: {money(partsCost)}</span>
                      <span className="text-slate-900">Total: {money(totalCost)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doyle-notes">Diagnostics &amp; Service Notes</Label>
                  <Textarea
                    id="doyle-notes"
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Describe the repair work completed at Doyle shop..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={resetForm}>
                    Clear Card
                  </Button>
                  <Button disabled={markFixed.isPending} onClick={handleMarkFixed}>
                    {markFixed.isPending ? "Saving…" : "Mark Fixed"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
