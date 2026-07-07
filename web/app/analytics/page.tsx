"use client";

import { useState } from "react";
import Link from "next/link";
import { subDays } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { displayStatus, doyleRepairCost } from "@/lib/domain/display";
import { useClearSpendingMutation } from "@/lib/hooks/use-unit-mutations";
import {
  useDoyleRepairs,
  useOnsiteRepairs,
  usePmLogs,
  useUnits,
} from "@/lib/hooks/use-units";

const WINDOWS = ["All Time", "Last 30 Days", "Last 90 Days"];

function parseRowDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value).slice(0, 10));
  return isNaN(parsed.getTime()) ? null : parsed;
}

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span
        className="text-[11px] font-black uppercase tracking-wide"
        style={{ color }}
      >
        {label}
      </span>
      <h2 className="mt-1 text-4xl font-black leading-none" style={{ color }}>
        {value}
      </h2>
      <span className="mt-1.5 block text-[10px] font-semibold text-slate-400">{sub}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: units = [] } = useUnits();
  const { data: onsite = [] } = useOnsiteRepairs();
  const { data: doyle = [] } = useDoyleRepairs();
  const { data: pmLogs = [] } = usePmLogs();
  const [dateFilter, setDateFilter] = useState("All Time");
  const [clearOpen, setClearOpen] = useState(false);
  const [clearRepairSpend, setClearRepairSpend] = useState(true);
  const [clearPmLogs, setClearPmLogs] = useState(false);
  const clearSpending = useClearSpendingMutation();

  const handleClear = async () => {
    if (!clearRepairSpend && !clearPmLogs) {
      toast.error("Choose at least one data set to clear.");
      return;
    }
    try {
      await clearSpending.mutateAsync({ repairSpend: clearRepairSpend, pmLogs: clearPmLogs });
      toast.success("Testing data cleared.");
      setClearOpen(false);
    } catch (error) {
      toast.error(`Clear failed: ${(error as Error).message}`);
    }
  };

  let cutoff: Date | null = null;
  if (dateFilter === "Last 30 Days") cutoff = subDays(new Date(), 30);
  if (dateFilter === "Last 90 Days") cutoff = subDays(new Date(), 90);

  const inWindow = (value: string | null | undefined) => {
    if (!cutoff) return true;
    const rowDate = parseRowDate(value);
    return rowDate !== null && rowDate >= cutoff;
  };

  const filteredOnsite = onsite.filter((row) => inWindow(row.repair_date));
  const filteredDoyle = doyle.filter((row) => inWindow(row.sent_date));

  const onsiteTotal = filteredOnsite.reduce((sum, row) => sum + (Number(row.repair_cost) || 0), 0);
  const doyleTotal = filteredDoyle.reduce((sum, row) => sum + doyleRepairCost(row), 0);
  const repairCount =
    filteredOnsite.length + filteredDoyle.filter((row) => doyleRepairCost(row) > 0).length;
  const avg = repairCount ? (onsiteTotal + doyleTotal) / repairCount : 0;
  const pmDue = units.filter((unit) => displayStatus(unit) === "Needs PM").length;
  const compliance = units.length ? Math.round(((units.length - pmDue) / units.length) * 100) : 0;
  const doyleUnits = units.filter((unit) => displayStatus(unit) === "Doyle Shop");

  // Highest repair expenses grouped per unit (top 10).
  const costByUnit = new Map<string, number>();
  for (const row of filteredOnsite) {
    costByUnit.set(row.ptac_id, (costByUnit.get(row.ptac_id) ?? 0) + (Number(row.repair_cost) || 0));
  }
  for (const row of filteredDoyle) {
    costByUnit.set(row.ptac_id, (costByUnit.get(row.ptac_id) ?? 0) + doyleRepairCost(row));
  }
  const topRepairs = [...costByUnit.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxCost = topRepairs.length ? topRepairs[0][1] : 0;

  const money = (value: number) =>
    `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">
            Spending &amp; PM Audits
          </h2>
          <p className="mt-1 text-[13px] font-semibold text-slate-500">
            Management view for repair spend, PM coverage, and active contractor queue.
          </p>
        </div>
        <Button variant="outline" onClick={() => setClearOpen(true)}>
          Clear Spending Data
        </Button>
      </div>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear Spending Data</DialogTitle>
          </DialogHeader>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
            This permanently deletes the selected log records for <strong>all units</strong> — use
            it to reset testing data. Unit locations and statuses are not affected. This cannot be
            undone.
          </p>
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-xs font-semibold text-slate-700">
              <Checkbox
                checked={clearRepairSpend}
                onCheckedChange={(checked) => setClearRepairSpend(checked === true)}
              />
              Repair spend records ({onsite.length} onsite + {doyle.length} Doyle)
            </label>
            <label className="flex items-start gap-2 text-xs font-semibold text-slate-700">
              <Checkbox
                checked={clearPmLogs}
                onCheckedChange={(checked) => setClearPmLogs(checked === true)}
              />
              PM logs ({pmLogs.length})
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={clearSpending.isPending} onClick={handleClear}>
              {clearSpending.isPending ? "Clearing…" : "Clear Permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mt-4 max-w-xs">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOWS.map((window) => (
              <SelectItem key={window} value={window}>
                {window}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Accumulated Repairs Spend"
          value={money(onsiteTotal + doyleTotal)}
          sub={dateFilter.toLowerCase()}
          color="#0f172a"
        />
        <KpiCard
          label="Avg Repair Cost"
          value={`$${Math.round(avg).toLocaleString()}`}
          sub="Per logged intervention"
          color="#2563eb"
        />
        <KpiCard
          label="PM Compliance"
          value={`${compliance}%`}
          sub={`${pmDue} units require PM`}
          color="#f59e0b"
        />
        <KpiCard
          label="Active Doyle Units"
          value={String(doyleUnits.length)}
          sub="Currently at Doyle Shop"
          color="#dc2626"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Highest repair expenses */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-[15px] font-black text-slate-900">Highest Repair Expenses</h4>
          {topRepairs.length === 0 ? (
            <p className="text-xs font-semibold text-slate-400">No repair costs logged yet.</p>
          ) : (
            <div className="space-y-2">
              {topRepairs.map(([unitId, cost]) => (
                <Link
                  key={unitId}
                  href={`/units/${encodeURIComponent(unitId)}`}
                  className="block rounded-xl border border-slate-200 px-3.5 py-2.5 transition-colors hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="flex items-center justify-between text-[13px] font-black text-slate-900">
                    <span>{unitId}</span>
                    <span>{money(cost)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${maxCost ? (cost / maxCost) * 100 : 0}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Doyle shipments */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h4 className="mb-4 text-[15px] font-black text-slate-900">
            Active Doyle Contractor Shipments
          </h4>
          {doyleUnits.length === 0 ? (
            <p className="text-xs font-semibold text-slate-400">No units currently at Doyle Shop.</p>
          ) : (
            <div className="space-y-2.5">
              {doyleUnits.map((unit) => (
                <Link
                  key={unit.ptac_id}
                  href={`/units/${encodeURIComponent(unit.ptac_id)}`}
                  className="block rounded-[14px] border border-rose-200 bg-rose-50 p-3.5 transition-colors hover:border-rose-300"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-sm text-slate-900">{unit.ptac_id}</strong>
                    <span className="text-[11px] font-extrabold text-rose-800">At Doyle Shop</span>
                  </div>
                  <div className="mt-1.5 text-xs text-slate-500">
                    {unit.model_specs} · S/N {unit.serial_number}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent PM logs */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="mb-4 text-[15px] font-black text-slate-900">Recent PM Logs</h4>
        {pmLogs.length === 0 ? (
          <p className="text-xs font-semibold text-slate-400">No PM logs found yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {pmLogs.slice(0, 20).map((log, index) => (
              <Link
                key={`${log.ptac_id}-${log.date_performed}-${index}`}
                href={`/units/${encodeURIComponent(log.ptac_id)}`}
                className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-[13px] font-bold text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                {log.ptac_id} — {String(log.date_performed ?? "Unknown date").slice(0, 10)} (
                {log.technician_name || "Unknown tech"})
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
