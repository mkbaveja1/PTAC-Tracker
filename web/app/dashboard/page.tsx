"use client";

import Link from "next/link";

import { UnitTile } from "@/components/dashboard/unit-tile";
import { FLOORS, ROOM_SUFFIXES } from "@/lib/domain/constants";
import { effectiveDisplayStatus, isAtMaintenanceOffice } from "@/lib/domain/display";
import { usePmIntervalMonths } from "@/lib/hooks/use-settings";
import { useUnits } from "@/lib/hooks/use-units";
import type { PtacUnit } from "@/types/database";

// Sorts hallway units Floor 2 → Floor 6 (hallway_sort_key in dashboard.py).
function hallwaySortKey(unit: PtacUnit): number {
  const location = unit.current_location_name ?? "";
  for (const floor of FLOORS) {
    if (location.includes(`Floor ${floor}`)) return floor;
  }
  return 99;
}

export default function DashboardPage() {
  const { data: allUnits = [], isLoading, error } = useUnits();
  const pmIntervalMonths = usePmIntervalMonths();

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-800">
        Failed to load inventory: {(error as Error).message}
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-10 text-center text-sm font-bold text-slate-400">Loading live inventory…</div>;
  }

  const totalCount = allUnits.length;
  const activeTotal = allUnits.filter(
    (u) =>
      effectiveDisplayStatus(u, pmIntervalMonths) === "Active" && u.location_type !== "Spare"
  ).length;
  // Counts manually flagged units plus any Active unit past its PM schedule.
  const pmOverdueTotal = allUnits.filter(
    (u) => effectiveDisplayStatus(u, pmIntervalMonths) === "Needs PM"
  ).length;
  const maintOfficeTotal = allUnits.filter((u) => isAtMaintenanceOffice(u)).length;
  const doyleTotal = allUnits.filter((u) => u.status === "Doyle Shop").length;

  const kpiCards = [
    { color: "#0f172a", label: "Total Inventory", value: totalCount, sub: "125 Rooms • 5 Floors" },
    { color: "#10b981", label: "Active & Running", value: activeTotal, sub: "Healthy climate zones" },
    { color: "#f59e0b", label: "PM Clean Overdue", value: pmOverdueTotal, sub: "Filter/coil check alert" },
    { color: "#8b5cf6", label: "At Maint. Office", value: maintOfficeTotal, sub: "Onsite testing & diagnostics" },
    { color: "#ef4444", label: "At Doyle Shop", value: doyleTotal, sub: "Contractor offsite queue" },
  ];

  const locUnit = new Map<string, PtacUnit>();
  for (const unit of allUnits) {
    if (unit.current_location_name) locUnit.set(unit.current_location_name, unit);
  }

  const hallwayUnits = allUnits
    .filter(
      (u) =>
        u.location_type === "Hallway" ||
        (u.current_location_name ?? "").includes("Hallway") ||
        (u.current_location_name ?? "").includes("Corridor")
    )
    .sort((a, b) => hallwaySortKey(a) - hallwaySortKey(b));

  const supportGroups: { title: string; units: PtacUnit[] }[] = [
    { title: "Corridors/Hallways", units: hallwayUnits },
    { title: "Elevator Closet", units: allUnits.filter((u) => u.location_type === "Elevator Closet") },
    { title: "Maintenance Office Onsite", units: allUnits.filter((u) => isAtMaintenanceOffice(u)) },
    { title: "Doyle Repair Shop", units: allUnits.filter((u) => u.status === "Doyle Shop") },
    { title: "Spare Storage Closet", units: allUnits.filter((u) => u.location_type === "Spare") },
  ];

  const supportDisplayName = (title: string, unit: PtacUnit): string => {
    const location = unit.current_location_name ?? "";
    if (title === "Corridors/Hallways") {
      return location.replace(" Hallway", "").replace(" Corridor", "");
    }
    if (title === "Elevator Closet") return "Elev.";
    return location || unit.ptac_id;
  };

  const legendItems = [
    { dot: "bg-green-50 border border-green-200", text: "text-green-800", label: "Active" },
    { dot: "bg-amber-50 border border-amber-200 animate-pm-pulse", text: "text-amber-800", label: "Needs PM Clean" },
    { dot: "bg-violet-50 border border-violet-200", text: "text-violet-800", label: "Onsite Maint. Office" },
    { dot: "bg-rose-50 border border-rose-200", text: "text-rose-800", label: "Offsite Doyle Repair" },
    { dot: "bg-blue-50 border border-blue-200", text: "text-blue-800", label: "Storage Spare Closet" },
  ];

  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="min-h-[130px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <span
              className="block text-[11px] font-black uppercase tracking-wide"
              style={{ color: card.color }}
            >
              {card.label}
            </span>
            <span className="mt-1.5 block text-4xl font-black leading-none" style={{ color: card.color }}>
              {card.value}
            </span>
            <span className="mt-1.5 block text-[10px] font-semibold text-slate-400">{card.sub}</span>
          </div>
        ))}
      </div>

      {/* Hero banner */}
      <div className="my-5 flex flex-col items-start justify-between gap-5 overflow-hidden rounded-3xl bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/15 md:flex-row md:items-center">
        <div>
          <h3 className="text-2xl font-black">Control Room Visual Grid</h3>
          <p className="mt-2 max-w-2xl text-[13px] font-medium leading-relaxed text-slate-300">
            Click any color-coded room, hallway, or elevator block below to view diagnostics history,
            execute custody transfers, or review technician parts invoices.
          </p>
        </div>
        <Link
          href="/scanner"
          className="whitespace-nowrap rounded-[14px] bg-blue-600 px-4.5 py-3 text-xs font-black text-white shadow-lg shadow-blue-600/25 transition-transform hover:-translate-y-px"
        >
          ▦ Launch QR Scanner
        </Link>
      </div>

      {/* Legend */}
      <div className="mb-5 flex flex-wrap items-center justify-center gap-5 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-[11px] font-extrabold shadow-sm">
        <span className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">
          Operational Board Legend:
        </span>
        {legendItems.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5">
            <span className={`inline-block h-3.5 w-3.5 rounded ${item.dot}`} />
            <span className={item.text}>{item.label}</span>
          </span>
        ))}
      </div>

      {/* Floor grids */}
      {FLOORS.map((floor) => (
        <div
          key={floor}
          className="mb-3.5 rounded-[18px] border border-slate-200 bg-white px-5 py-4.5 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xl font-black tracking-tight text-slate-900">Floor {floor}</h3>
            <span className="text-[10px] font-black uppercase tracking-[0.06em] text-slate-400">
              Dynamic Control Matrix
            </span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(60px,1fr))] items-stretch gap-2">
            {ROOM_SUFFIXES.flatMap((suffix) => {
              const roomNum = `${floor}${String(suffix).padStart(2, "0")}`;
              if (suffix === 11) {
                return [
                  <UnitTile key={`${roomNum}A`} label={`${roomNum}A`} unit={locUnit.get(`Suite ${roomNum}-A`)} />,
                  <UnitTile key={`${roomNum}B`} label={`${roomNum}B`} unit={locUnit.get(`Suite ${roomNum}-B`)} />,
                ];
              }
              return [<UnitTile key={roomNum} label={roomNum} unit={locUnit.get(`Room ${roomNum}`)} />];
            })}
          </div>
        </div>
      ))}

      {/* Support sections */}
      {supportGroups.map((group) => (
        <div
          key={group.title}
          className="mb-3.5 rounded-[18px] border border-slate-200 bg-white px-5 py-4.5 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xl font-black tracking-tight text-slate-900">
              {group.title} ({group.units.length} Units)
            </h3>
            <span className="text-[10px] font-black uppercase tracking-[0.06em] text-slate-400">
              Support Assets
            </span>
          </div>
          {group.units.length === 0 ? (
            <span className="text-xs font-bold text-slate-400">No units in this queue.</span>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(82px,1fr))] gap-2">
              {group.units.map((unit) => (
                <UnitTile
                  key={unit.ptac_id}
                  label={unit.ptac_id}
                  unit={unit}
                  displayLabel={supportDisplayName(group.title, unit)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
