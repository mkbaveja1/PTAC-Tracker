"use client";

import Link from "next/link";

import { effectiveDisplayStatus, shortBtuFromModel, statusTileClasses } from "@/lib/domain/display";
import { usePmIntervalMonths } from "@/lib/hooks/use-settings";
import type { PtacUnit } from "@/types/database";

// BTU label shown in each tile (btu_label in views/dashboard.py).
function btuLabel(unit: PtacUnit | null | undefined): string {
  if (!unit) return "";
  if (unit.location_type === "Hallway") return "15K BTU";
  if (unit.location_type === "Elevator Closet") return "9K BTU";
  return shortBtuFromModel(unit.model_specs);
}

interface UnitTileProps {
  label: string;
  unit: PtacUnit | null | undefined;
  displayLabel?: string;
}

// Port of make_cell(): one color-coded tile; real units link to unit detail.
export function UnitTile({ label, unit, displayLabel }: UnitTileProps) {
  const pmIntervalMonths = usePmIntervalMonths();
  const status = effectiveDisplayStatus(unit, pmIntervalMonths);
  const ptacId = unit?.ptac_id ?? "No unit";
  const mainLabel = displayLabel ?? label;

  const cell = (
    <div
      className={`flex min-h-[68px] cursor-pointer flex-col items-center justify-center rounded-xl px-1 py-2 text-center text-[11px] font-black leading-tight transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-slate-900/10 ${statusTileClasses(status)}`}
      title={`${label} - ${status} - ${ptacId}`}
    >
      <small className="mb-1 block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[9px] font-extrabold text-slate-400">
        {ptacId}
      </small>
      <span className="mb-1 block text-[15px] font-black leading-none text-slate-900">
        {mainLabel}
      </span>
      <span className="block text-[10px] font-black tracking-[0.14em] text-[#6aa08d]">
        {btuLabel(unit)}
      </span>
    </div>
  );

  if (!unit) return cell;

  return (
    <Link href={`/units/${encodeURIComponent(unit.ptac_id)}`} className="block no-underline">
      {cell}
    </Link>
  );
}
