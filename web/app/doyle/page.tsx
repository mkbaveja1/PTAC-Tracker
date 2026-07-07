"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
import { activeUnitAtLocation, roomOptions } from "@/lib/domain/locations";
import { latestDoyleDispatchNote, OCCUPIED_ROOM_OVERRIDE_REQUIRED } from "@/lib/api/doyle";
import { useTransfers, useUnits } from "@/lib/hooks/use-units";
import { useDoyleCompletionMutation } from "@/lib/hooks/use-unit-mutations";

const ROUTE_SPARE = "Send to Spare Storage Closet";
const ROUTE_ROOM = "Deploy Direct to Guest Room";

interface FormState {
  technician: string;
  invoice: string;
  components: Set<string>;
  extraParts: string;
  totalBill: string;
  notes: string;
  route: string;
  targetRoom: string | null;
  overrideOccupied: boolean;
}

const EMPTY_FORM: FormState = {
  technician: "",
  invoice: "",
  components: new Set(),
  extraParts: "",
  totalBill: "",
  notes: "",
  route: ROUTE_SPARE,
  targetRoom: null,
  overrideOccupied: false,
};

export default function DoylePortalPage() {
  const { data: units = [] } = useUnits();
  const { data: transfers = [] } = useTransfers();
  const completion = useDoyleCompletionMutation();

  const doyleUnits = useMemo(
    () => units.filter((unit) => displayStatus(unit) === "Doyle Shop"),
    [units]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, components: new Set() });

  // Default selection: first unit in the queue (matches views/doyle.py).
  const effectiveId = selectedId ?? doyleUnits[0]?.ptac_id ?? null;
  const selectedUnit = doyleUnits.find((unit) => unit.ptac_id === effectiveId) ?? null;

  const occupyingUnit =
    form.route === ROUTE_ROOM && form.targetRoom && selectedUnit
      ? activeUnitAtLocation(units, form.targetRoom, selectedUnit.ptac_id)
      : null;

  const resetForm = () => setForm({ ...EMPTY_FORM, components: new Set() });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleComponent = (component: string, checked: boolean) => {
    setForm((prev) => {
      const next = new Set(prev.components);
      if (checked) next.add(component);
      else next.delete(component);
      return { ...prev, components: next };
    });
  };

  const handleSubmit = async () => {
    if (!selectedUnit) return;
    if (!form.technician.trim() || !form.invoice.trim()) {
      toast.error("Technician signature and invoice reference are required.");
      return;
    }
    if (form.route === ROUTE_ROOM && !form.targetRoom) {
      toast.error("Choose a target guest room before shipping back to the hotel.");
      return;
    }
    if (occupyingUnit && !form.overrideOccupied) {
      toast.error("You must confirm the occupied-room override before returning to this room.");
      return;
    }

    const targetLocation = form.route === ROUTE_ROOM ? form.targetRoom! : SPARE_STORAGE;
    try {
      await completion.mutateAsync({
        ptacId: selectedUnit.ptac_id,
        unit: selectedUnit,
        technician: form.technician,
        invoice: form.invoice.trim(),
        totalBill: parseFloat(form.totalBill) || 0,
        components: [...form.components],
        extraParts: form.extraParts,
        notes: form.notes,
        targetLocation,
        overrideOccupied: form.overrideOccupied,
      });
      toast.success(`${selectedUnit.ptac_id} marked fixed and returned to ${targetLocation}.`);
      setSelectedId(null);
      resetForm();
    } catch (error) {
      const message = (error as Error).message;
      if (message === OCCUPIED_ROOM_OVERRIDE_REQUIRED) {
        toast.error("You must confirm the occupied-room override before returning to this room.");
      } else {
        toast.error(`Completion failed: ${message}`);
      }
    }
  };

  return (
    <div>
      {/* Dark contractor header — isolated from hotel styling */}
      <div className="mb-5 rounded-[20px] bg-slate-900 px-7 py-6 text-white">
        <span className="inline-block rounded-full border border-red-500/35 bg-red-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.06em] text-red-300">
          Contractor Interface
        </span>
        <h2 className="mb-1 mt-2.5 text-[28px] font-black">Doyle Offsite Repairs Portal</h2>
        <p className="text-[13px] text-slate-400">
          Dedicated diagnostic &amp; invoices entry console for Doyle service mechanics.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Queue */}
        <div>
          <h4 className="mb-3 text-[15px] font-black text-slate-900">Offsite Repair Queue</h4>
          <div className="min-h-[520px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {doyleUnits.length === 0 ? (
              <p className="text-xs font-semibold text-slate-500">
                No dispatched jobs in repair queue.
              </p>
            ) : (
              doyleUnits.map((unit) => {
                const isSelected = effectiveId === unit.ptac_id;
                let dispatchNote = latestDoyleDispatchNote(unit.ptac_id, transfers);
                if (dispatchNote.length > 72) dispatchNote = dispatchNote.slice(0, 69) + "...";
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
                      {dispatchNote}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Work form */}
        <div>
          <h4 className="mb-3 text-[15px] font-black text-slate-900">Tech Repair Entry Form</h4>
          <div className="min-h-[520px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {!selectedUnit ? (
              <p className="text-xs font-semibold text-slate-500">
                Select a dispatched PTAC unit from the queue to fill out repair logs and mark it
                ready.
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

                {/* Custody route */}
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5">
                  <div className="mb-2 text-[11px] font-extrabold uppercase text-rose-800">
                    Custody Route Post-Doyle (Send Back to Hotel)
                  </div>
                  <RadioGroup
                    value={form.route}
                    onValueChange={(value) =>
                      setForm((prev) => ({
                        ...prev,
                        route: value,
                        targetRoom: null,
                        overrideOccupied: false,
                      }))
                    }
                    className="flex flex-wrap gap-4"
                  >
                    {[ROUTE_SPARE, ROUTE_ROOM].map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 text-xs font-bold text-slate-700"
                      >
                        <RadioGroupItem value={option} />
                        {option}
                      </label>
                    ))}
                  </RadioGroup>
                </div>

                {form.route === ROUTE_ROOM && (
                  <div className="space-y-2">
                    <Label>Target Room</Label>
                    <Select
                      value={form.targetRoom ?? ""}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, targetRoom: value, overrideOccupied: false }))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a guest room..." />
                      </SelectTrigger>
                      <SelectContent>
                        {roomOptions().map((room) => (
                          <SelectItem key={room} value={room}>
                            {room}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!form.targetRoom && (
                      <p className="rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs font-semibold text-blue-800">
                        Choose a target guest room before submitting.
                      </p>
                    )}
                  </div>
                )}

                {occupyingUnit && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                    {form.targetRoom} already has active unit {occupyingUnit.ptac_id}. If you
                    continue, that existing unit will be moved to Maintenance Office.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="doyle-tech">Technician Signature</Label>
                    <Input
                      id="doyle-tech"
                      value={form.technician}
                      onChange={(event) => set("technician", event.target.value)}
                      placeholder="e.g. Mechanic Steve"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doyle-invoice">Work Order / Invoice Ref #</Label>
                    <Input
                      id="doyle-invoice"
                      value={form.invoice}
                      onChange={(event) => set("invoice", event.target.value)}
                      placeholder="e.g. DOY-9082"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 px-3.5 py-3">
                  <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.04em] text-slate-500">
                    Replaced Core Components Checklist
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {CORE_COMPONENTS.map((component) => (
                      <label
                        key={component}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-700"
                      >
                        <Checkbox
                          checked={form.components.has(component)}
                          onCheckedChange={(checked) =>
                            toggleComponent(component, checked === true)
                          }
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
                    onChange={(event) => set("extraParts", event.target.value)}
                    placeholder="e.g. Copper pipes, extra brackets"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doyle-bill">Total Repair Bill ($)</Label>
                  <Input
                    id="doyle-bill"
                    type="number"
                    min={0}
                    step={25}
                    value={form.totalBill}
                    onChange={(event) => set("totalBill", event.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="doyle-notes">Diagnostics &amp; Service Completed Notes</Label>
                  <Textarea
                    id="doyle-notes"
                    value={form.notes}
                    onChange={(event) => set("notes", event.target.value)}
                    placeholder="Describe the repair work completed at Doyle shop..."
                    rows={3}
                  />
                </div>

                {occupyingUnit && (
                  <label className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                    <Checkbox
                      checked={form.overrideOccupied}
                      onCheckedChange={(checked) => set("overrideOccupied", checked === true)}
                    />
                    Confirm occupied-room override and move existing unit to Maintenance Office
                  </label>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={resetForm}>
                    Clear Card
                  </Button>
                  <Button disabled={completion.isPending} onClick={handleSubmit}>
                    {completion.isPending ? "Shipping…" : "Mark Fixed & Ship to Hotel"}
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
