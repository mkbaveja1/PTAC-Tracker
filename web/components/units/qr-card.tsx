"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { unitDetailUrl } from "@/lib/domain/urls";
import type { PtacUnit } from "@/types/database";

export function QrCard({ unit }: { unit: PtacUnit }) {
  const [qr, setQr] = useState<{ detailUrl: string; dataUrl: string } | null>(null);

  useEffect(() => {
    // unitDetailUrl reads window.location.origin, so build it client-side only.
    const url = unitDetailUrl(unit.ptac_id);
    QRCode.toDataURL(url, { width: 220, margin: 1 }).then((dataUrl) =>
      setQr({ detailUrl: url, dataUrl })
    );
  }, [unit.ptac_id]);

  const dataUrl = qr?.dataUrl ?? null;
  const detailUrl = qr?.detailUrl ?? "";

  return (
    <div className="min-h-[360px] rounded-[22px] border border-slate-200 bg-white px-7 py-6 text-center shadow-sm">
      <div className="mb-4.5 border-b border-slate-100 pb-2.5 text-left text-xs font-black uppercase tracking-[0.08em] text-slate-500">
        Physical QR Identification
      </div>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={dataUrl}
          alt={`QR code for ${unit.ptac_id}`}
          className="mx-auto h-[165px] w-[165px] rounded-[14px] border border-slate-200 bg-white p-2.5"
        />
      ) : (
        <div className="mx-auto h-[165px] w-[165px] animate-pulse rounded-[14px] bg-slate-100" />
      )}
      <p className="mx-auto mb-5 mt-4.5 max-w-[320px] text-xs font-bold leading-relaxed text-slate-400">
        Scanning this tag opens the live action screen for {unit.ptac_id}.
      </p>
      <div className="border-t border-slate-100 pt-4">
        <span className="text-[11px] font-black uppercase text-slate-400">
          Current Assigned Location
        </span>
        <h3 className="my-1 text-[22px] font-black text-slate-900">
          {unit.current_location_name}
        </h3>
        <span className="text-[11px] font-black uppercase text-slate-400">
          Type: {unit.location_type}
        </span>
      </div>
      {detailUrl && (
        <p className="mt-4 break-all text-[10px] text-slate-400">QR scan link: {detailUrl}</p>
      )}
      {detailUrl.startsWith("http://localhost") && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] font-semibold text-amber-800">
          This QR link points to localhost and will not work on a phone. Deploy the app and reprint
          labels from the production URL.
        </p>
      )}
    </div>
  );
}
