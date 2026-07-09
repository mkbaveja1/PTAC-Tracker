"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpareRegistrationForm } from "@/components/directory/spare-registration-form";
import {
  btuFromModel,
  displayStatus,
  effectiveDisplayStatus,
  isAtMaintenanceOffice,
  statusPillClasses,
} from "@/lib/domain/display";
import { usePmIntervalMonths } from "@/lib/hooks/use-settings";
import { useUnits } from "@/lib/hooks/use-units";
import type { PtacUnit } from "@/types/database";

const LOCATION_FILTERS = [
  "All Locations",
  "Guest Rooms",
  "Hallways",
  "Elevator Closet",
  "Storage / Spares",
  "Maintenance Office",
  "Doyle Shop",
];

const STATUS_FILTERS = [
  "All Statuses",
  "Active",
  "Needs PM",
  "Maintenance Office",
  "Doyle Shop",
  "Spare/Storage",
];

// Ported filter predicates from views/directory.py.
function matchesLocationFilter(unit: PtacUnit, filter: string): boolean {
  const locationType = unit.location_type;
  const status = unit.status;
  if (filter === "All Locations") return true;
  if (filter === "Guest Rooms") return locationType === "Room";
  if (filter === "Hallways") return locationType === "Hallway";
  if (filter === "Elevator Closet") return locationType === "Elevator Closet";
  if (filter === "Storage / Spares") return locationType === "Spare";
  if (filter === "Maintenance Office") return isAtMaintenanceOffice(unit);
  if (filter === "Doyle Shop") return status === "Doyle Shop" || locationType === "Doyle Shop";
  return true;
}

function searchText(unit: PtacUnit): string {
  return [
    unit.ptac_id,
    unit.serial_number ?? "",
    unit.model_specs ?? "",
    unit.current_location_name ?? "",
    unit.location_type ?? "",
    displayStatus(unit),
  ]
    .join(" ")
    .toLowerCase();
}

export default function DirectoryPage() {
  const { data: allUnits = [], isLoading, error } = useUnits();
  const pmIntervalMonths = usePmIntervalMonths();
  const [showAddSpare, setShowAddSpare] = useState(false);
  const [query, setQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("All Locations");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-800">
        Failed to load inventory: {(error as Error).message}
      </div>
    );
  }

  const trimmedQuery = query.trim().toLowerCase();
  const filteredUnits = allUnits.filter((unit) => {
    if (trimmedQuery && !searchText(unit).includes(trimmedQuery)) return false;
    if (!matchesLocationFilter(unit, locationFilter)) return false;
    if (
      statusFilter !== "All Statuses" &&
      effectiveDisplayStatus(unit, pmIntervalMonths) !== statusFilter
    )
      return false;
    return true;
  });

  return (
    <div>
      {/* Title row */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-black tracking-tight text-slate-900">
            Equipment Inventory Directory
          </h2>
          <p className="mt-1 text-[13px] font-semibold text-slate-500">
            Full tabular view of rooms, hallway corridors, elevator equipment, and spares closet.
          </p>
        </div>
        <Button onClick={() => setShowAddSpare((prev) => !prev)}>
          + Register New Spare Unit
        </Button>
      </div>

      {showAddSpare && (
        <SpareRegistrationForm allUnits={allUnits} onDone={() => setShowAddSpare(false)} />
      )}

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-3 rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[3.4fr_1.1fr_1.1fr]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type to search ID, Serial, Location or Model..."
        />
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCATION_FILTERS.map((filter) => (
              <SelectItem key={filter} value={filter}>
                {filter}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((filter) => (
              <SelectItem key={filter} value={filter}>
                {filter}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table — owner-polished styling; preserve look from views/directory.py */}
      <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_2.3fr_1.9fr_1.8fr_1.4fr_1.1fr] border-b border-slate-200 bg-slate-50">
          {["ID", "SPECS & SERIAL", "LOCATION", "OPERATIONAL STATUS", "LAST PM CHECK", "ACTIONS"].map(
            (header) => (
              <div
                key={header}
                className="px-5 py-4 text-xs font-black uppercase tracking-[0.08em] text-slate-500"
              >
                {header}
              </div>
            )
          )}
        </div>

        {isLoading && (
          <div className="p-10 text-center text-[13px] font-extrabold text-slate-400">
            Loading live inventory…
          </div>
        )}

        {!isLoading && filteredUnits.length === 0 && (
          <div className="p-10 text-center text-[13px] font-extrabold text-slate-400">
            No PTAC units matched those search criteria.
          </div>
        )}

        {filteredUnits.map((unit) => {
          const status = effectiveDisplayStatus(unit, pmIntervalMonths);
          return (
            <div
              key={unit.ptac_id}
              className="grid min-h-[76px] grid-cols-[1fr_2.3fr_1.9fr_1.8fr_1.4fr_1.1fr] items-center border-b border-slate-200 last:border-b-0"
            >
              <div className="px-5 py-4">
                <span className="inline-block rounded-[7px] border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-900">
                  {unit.ptac_id}
                </span>
              </div>
              <div className="px-5 py-4">
                <div className="text-[15px] font-black leading-tight text-slate-900">
                  {unit.model_specs}
                </div>
                <div className="mt-1 text-[11px] font-extrabold uppercase leading-tight text-slate-400">
                  {btuFromModel(unit.model_specs)} · S/N: {unit.serial_number}
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="text-[15px] font-black leading-tight text-slate-900">
                  {unit.current_location_name}
                </div>
                <div className="mt-1 text-[11px] font-extrabold uppercase leading-tight text-slate-400">
                  {unit.location_type}
                </div>
              </div>
              <div className="px-5 py-4">
                <span
                  className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-black leading-none ${statusPillClasses(status)}`}
                >
                  {status}
                </span>
              </div>
              <div className="px-5 py-4 text-[13px] font-black text-slate-500">
                {unit.last_pm_date || "Not logged"}
              </div>
              <div className="px-5 py-4">
                <Button asChild variant="outline" size="sm" className="whitespace-nowrap font-black">
                  <Link href={`/units/${encodeURIComponent(unit.ptac_id)}`}>View / Action</Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
