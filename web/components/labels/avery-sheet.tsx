"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { unitDetailUrl } from "@/lib/domain/urls";
import type { PtacUnit } from "@/types/database";

// Compact location shown in the bottom-left of a label: drop the type word so
// "Room 624" -> "624", "Floor 2B" -> "2B", "Suite 211-A" -> "211-A", and any
// storage closet -> "Storage". Other locations (Maintenance Office, Doyle Shop,
// custom categories) are shown as-is.
function shortLabelLocation(name: string): string {
  const value = name.trim();
  if (/storage/i.test(value)) return "Storage";
  return value
    .replace(/^Room\s+/i, "")
    .replace(/^Suite\s+/i, "")
    .replace(/^Floor\s+/i, "")
    .replace(/\s+(Corridor|Hallway)$/i, "")
    .trim();
}

function LabelQr({ ptacId }: { ptacId: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(unitDetailUrl(ptacId), { width: 156, margin: 1 }).then(setDataUrl);
  }, [ptacId]);

  if (!dataUrl) {
    return <div className="h-[78px] w-[78px] shrink-0 rounded-lg bg-slate-100" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`QR code for ${ptacId}`}
      className="h-[78px] w-[78px] shrink-0 rounded-lg border border-slate-200 bg-white p-1"
    />
  );
}

function AveryLabel({ unit }: { unit: PtacUnit }) {
  return (
    <div className="avery-print-label flex min-h-[1.9in] items-stretch justify-between gap-2.5 rounded-xl border border-slate-300 bg-white px-3.5 py-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-1.5 text-[8px] font-extrabold uppercase tracking-[0.1em] text-slate-400">
          PTAC Asset Tag
        </div>
        <div className="mb-1.5 text-2xl font-black leading-none text-slate-900">{unit.ptac_id}</div>
        <div className="mb-0.5 text-[11px] font-bold text-slate-700">{unit.model_specs}</div>
        <div className="text-[10px] font-semibold text-slate-500">S/N: {unit.serial_number}</div>
        {unit.manufacturing_date && (
          <div className="text-[10px] font-semibold text-slate-500">Mfg: {unit.manufacturing_date}</div>
        )}
        {unit.current_location_name && (
          <div className="mt-auto pt-1 text-[10px] font-semibold text-slate-500">
            {shortLabelLocation(unit.current_location_name)}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center">
        <LabelQr ptacId={unit.ptac_id} />
      </div>
    </div>
  );
}

// One 2×5 laser label sheet (10 labels per page), PLS-591 / 4in x 2in.
export function AverySheet({ sheetNumber, units }: { sheetNumber: number; units: PtacUnit[] }) {
  const emptySlots = Math.max(0, 10 - units.length);
  return (
    <div className="avery-print-sheet mx-auto mb-4.5 max-w-[8.5in] rounded-[14px] border border-slate-300 bg-white px-4 pb-5 pt-4.5">
      <div className="print:hidden mb-3.5 flex items-center justify-between border-b border-slate-200 pb-2.5 text-[11px] font-bold text-slate-500">
        <strong className="text-xs text-slate-900">
          PLS-591 Laser Label Sheet #{sheetNumber}
        </strong>
        <span>10 Labels on Page (2 Columns x 5 Rows)</span>
      </div>
      <div className="avery-grid grid grid-cols-2 gap-3">
        {units.map((unit) => (
          <AveryLabel key={unit.ptac_id} unit={unit} />
        ))}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <div key={`empty-${index}`} className="avery-print-label min-h-[1.9in] invisible" />
        ))}
      </div>
    </div>
  );
}
