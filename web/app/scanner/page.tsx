"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QrCamera } from "@/components/scanner/qr-camera";
import { parseScanLookup } from "@/lib/domain/urls";
import { useUnits } from "@/lib/hooks/use-units";

// Scanner is a lookup gateway only — all custody/PM/repair actions live on
// the unit detail page (same rule as the Streamlit app).
export default function ScannerPage() {
  const router = useRouter();
  const { data: units = [] } = useUnits();
  const [lookupRaw, setLookupRaw] = useState("");
  const [notFoundId, setNotFoundId] = useState<string | null>(null);
  const [fallbackId, setFallbackId] = useState("");

  const unitIds = new Set(units.map((unit) => unit.ptac_id));

  const openUnit = (raw: string) => {
    const parsedId = parseScanLookup(raw);
    if (!parsedId) return;
    if (unitIds.has(parsedId)) {
      router.push(`/units/${encodeURIComponent(parsedId)}`);
    } else {
      setNotFoundId(parsedId);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="text-2xl font-black tracking-tight text-slate-900">Smart QR Tag Scanner</h2>
      <p className="mt-1 text-[13px] font-semibold text-slate-500">
        Look up a PTAC by ID or scan a label. Matching units open the shared unit detail screen for
        custody, PM, and repair actions.
      </p>

      <div className="mt-6 space-y-5">
        <QrCamera onScan={openUnit} />

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setNotFoundId(null);
            openUnit(lookupRaw);
          }}
        >
          <Input
            value={lookupRaw}
            onChange={(event) => {
              setLookupRaw(event.target.value);
              setNotFoundId(null);
            }}
            placeholder="PTAC-012 or a scanned label URL"
          />
          <Button type="submit" disabled={!lookupRaw.trim()}>
            Look Up
          </Button>
        </form>

        {notFoundId && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
            No active profile matching <code>{notFoundId}</code>.
          </p>
        )}

        {!lookupRaw && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-500">
              Or select a unit
            </p>
            <div className="flex gap-2">
              <Select value={fallbackId} onValueChange={setFallbackId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a PTAC unit..." />
                </SelectTrigger>
                <SelectContent>
                  {[...unitIds].sort().map((id) => (
                    <SelectItem key={id} value={id}>
                      {id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                disabled={!fallbackId}
                onClick={() => router.push(`/units/${encodeURIComponent(fallbackId)}`)}
              >
                Open Unit Detail
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
