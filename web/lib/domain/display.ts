// Ported one-to-one from views/_shared.py display helpers.
// display_status() logic must stay consistent — every page depends on these labels.

import type { DoyleRepair, PtacUnit } from "@/types/database";

export function isAtMaintenanceOffice(unit: PtacUnit | null | undefined): boolean {
  if (!unit) return false;
  return (
    unit.status === "Maintenance Office" ||
    unit.location_type === "Maintenance Office" ||
    unit.current_location_name === "Maintenance Office"
  );
}

export function displayStatus(unit: PtacUnit | null | undefined): string {
  if (!unit) return "Unknown";
  if (unit.location_type === "Spare") return "Spare/Storage";
  if (isAtMaintenanceOffice(unit)) return "Maintenance Office";
  if (unit.location_type === "Doyle Shop" || unit.status === "Doyle Shop") return "Doyle Shop";
  return unit.status ?? "Unknown";
}

export function btuFromModel(modelSpecs: string | null | undefined): string {
  const model = (modelSpecs ?? "").toLowerCase();
  if (model.includes("ptac15") || model.includes("15") || model.includes("heavyduty")) {
    return "15,000 BTU";
  }
  if (model.includes("ptac09") || model.includes("9") || model.includes("compact")) {
    return "9,000 BTU";
  }
  return "12,000 BTU";
}

export function shortBtuFromModel(modelSpecs: string | null | undefined): string {
  return btuFromModel(modelSpecs).replace(",000", "K");
}

// Tile styles matching dashboard_status_style() hex values (DESIGN_SYSTEM.md).
export const STATUS_TILE_CLASSES: Record<string, string> = {
  Active: "bg-green-50 border border-green-200 text-green-800",
  "Needs PM": "bg-amber-50 border border-amber-200 text-amber-800 animate-pm-pulse",
  "Maintenance Office": "bg-violet-50 border border-violet-200 text-violet-800",
  "Doyle Shop": "bg-rose-50 border border-rose-200 text-rose-800",
  "Spare/Storage": "bg-blue-50 border border-blue-200 text-blue-800",
  Unknown: "bg-slate-50 border border-dashed border-slate-300 text-slate-500",
};

export function statusTileClasses(status: string): string {
  return STATUS_TILE_CLASSES[status] ?? STATUS_TILE_CLASSES.Unknown;
}

// Pill styles matching the directory/detail status badges.
export const STATUS_PILL_CLASSES: Record<string, string> = {
  Active: "bg-green-50 border border-green-200 text-green-700",
  "Needs PM": "bg-amber-50 border border-amber-200 text-amber-800",
  "Maintenance Office": "bg-violet-50 border border-violet-200 text-violet-800",
  "Doyle Shop": "bg-rose-50 border border-rose-200 text-rose-800",
  "Spare/Storage": "bg-blue-50 border border-blue-200 text-blue-700",
};

export function statusPillClasses(status: string): string {
  return STATUS_PILL_CLASSES[status] ?? STATUS_PILL_CLASSES["Spare/Storage"];
}

// Billable total for a Doyle repair row from total_cost or labor + parts.
export function doyleRepairCost(repair: DoyleRepair): number {
  if (repair.total_cost !== null && repair.total_cost !== undefined) {
    return Number(repair.total_cost) || 0;
  }
  return (Number(repair.labor_cost) || 0) + (Number(repair.parts_cost) || 0);
}
