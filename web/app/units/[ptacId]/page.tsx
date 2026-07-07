"use client";

import { use } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CustodyTransferDialog } from "@/components/units/custody-transfer-dialog";
import { DeleteUnitDialog } from "@/components/units/delete-dialog";
import { EditSpecsDialog } from "@/components/units/edit-specs-dialog";
import { HistoryFeed } from "@/components/units/history-feed";
import { OnsiteRepairDialog } from "@/components/units/onsite-repair-dialog";
import { PmDialog } from "@/components/units/pm-dialog";
import { QrCard } from "@/components/units/qr-card";
import { btuFromModel, displayStatus, statusPillClasses } from "@/lib/domain/display";
import { useUnit } from "@/lib/hooks/use-units";

interface ActionTileProps {
  iconBg: string;
  iconColor: string;
  icon: string;
  title: string;
  description: string;
}

function ActionTile({ iconBg, iconColor, icon, title, description }: ActionTileProps) {
  return (
    <div className="min-h-[132px] rounded-2xl border-2 border-slate-100 bg-white p-5 text-left">
      <div
        className="mb-3.5 flex h-[38px] w-[38px] items-center justify-center rounded-xl font-black"
        style={{ background: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <h4 className="mb-1.5 text-[15px] font-black text-slate-900">{title}</h4>
      <p className="text-xs font-bold leading-snug text-slate-400">{description}</p>
    </div>
  );
}

export default function UnitDetailPage({ params }: { params: Promise<{ ptacId: string }> }) {
  const { ptacId: rawPtacId } = use(params);
  const ptacId = decodeURIComponent(rawPtacId).toUpperCase();

  const { data: unit, isLoading, error } = useUnit(ptacId);

  if (isLoading) {
    return <div className="p-10 text-center text-sm font-bold text-slate-400">Loading unit…</div>;
  }

  if (error || !unit) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-800">
        No PTAC unit found for {ptacId}.
        <Link href="/dashboard" className="ml-2 underline">
          ← Back to Board
        </Link>
      </div>
    );
  }

  const status = displayStatus(unit);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-xs font-bold text-slate-500 hover:text-slate-900"
          >
            ← Back to Board
          </Link>
          <div className="mt-2 flex items-center gap-3.5">
            <h2 className="text-[28px] font-black tracking-tight text-slate-900">
              {unit.ptac_id}{" "}
              <span
                className={`ml-1 inline-flex items-center justify-center rounded-full px-2.5 py-1 align-middle text-[11px] font-black ${statusPillClasses(status)}`}
              >
                {status}
              </span>
            </h2>
          </div>
          <div className="mt-1 text-[13px] font-bold text-slate-500">
            {unit.model_specs} · S/N: {unit.serial_number} · {btuFromModel(unit.model_specs)}
          </div>
        </div>
        <div className="flex gap-2">
          <EditSpecsDialog unit={unit} trigger={<Button variant="outline">Edit Specifications</Button>} />
          <DeleteUnitDialog unit={unit} trigger={<Button variant="outline">Delete Record</Button>} />
        </div>
      </div>

      <hr className="my-5 border-slate-200" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_2.15fr]">
        {/* QR + location card */}
        <QrCard unit={unit} />

        {/* Action cards */}
        <div className="rounded-[22px] border border-slate-200 bg-white px-7 py-6 shadow-sm">
          <div className="mb-4.5 border-b border-slate-100 pb-2.5 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
            Register New Custody/Maintenance Actions
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <ActionTile
                iconBg="#dbeafe"
                iconColor="#2563eb"
                icon="→"
                title="Custody Transfer Route"
                description="Relocate asset following strict hotel lifecycle paths."
              />
              <CustodyTransferDialog
                unit={unit}
                trigger={<Button variant="outline" className="mt-2 w-full">Open Custody Transfer</Button>}
              />
            </div>
            <div>
              <ActionTile
                iconBg="#fef3c7"
                iconColor="#92400e"
                icon="✓"
                title="Register Routine PM"
                description='Clear "Needs PM" alert. Log clean filters and coil washes.'
              />
              <PmDialog
                unit={unit}
                trigger={<Button variant="outline" className="mt-2 w-full">Open PM Checklist</Button>}
              />
            </div>
            <div>
              <ActionTile
                iconBg="#ffe4e6"
                iconColor="#be123c"
                icon="$"
                title="Log Onsite Repair"
                description="Document custom labor costs, spare motor, or compressor fixes."
              />
              <OnsiteRepairDialog
                unit={unit}
                trigger={<Button variant="outline" className="mt-2 w-full">Open Repair Log</Button>}
              />
            </div>
          </div>
        </div>
      </div>

      {/* History timeline */}
      <HistoryFeed unit={unit} />
    </div>
  );
}
