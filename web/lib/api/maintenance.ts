// Admin/cleanup operations for testing-mode data: delete individual history
// log rows, or bulk-clear repair spend records. The Installation event in the
// history feed is derived from ptac_units.created_at and is not deletable.

import { supabase } from "@/lib/supabase/client";

export type HistoryTable = "custody_transfers" | "pm_logs" | "onsite_repairs" | "doyle_repairs";

export const HISTORY_PK: Record<HistoryTable, string> = {
  custody_transfers: "transfer_id",
  pm_logs: "pm_id",
  onsite_repairs: "repair_id",
  doyle_repairs: "doyle_id",
};

export interface HistoryRowRef {
  table: HistoryTable;
  id: number;
}

export async function deleteHistoryRows(rows: HistoryRowRef[]): Promise<void> {
  // Group by table so each table gets one delete call.
  const byTable = new Map<HistoryTable, number[]>();
  for (const row of rows) {
    byTable.set(row.table, [...(byTable.get(row.table) ?? []), row.id]);
  }
  for (const [table, ids] of byTable) {
    const { error } = await supabase.from(table).delete().in(HISTORY_PK[table], ids);
    if (error) throw error;
  }
}

export interface ClearSpendingInput {
  repairSpend: boolean; // all onsite_repairs + doyle_repairs rows
  pmLogs: boolean; // all pm_logs rows
}

export async function clearSpendingData(input: ClearSpendingInput): Promise<void> {
  if (input.repairSpend) {
    const { error: onsiteError } = await supabase
      .from("onsite_repairs")
      .delete()
      .gte("repair_id", 0);
    if (onsiteError) throw onsiteError;

    const { error: doyleError } = await supabase.from("doyle_repairs").delete().gte("doyle_id", 0);
    if (doyleError) throw doyleError;
  }
  if (input.pmLogs) {
    const { error } = await supabase.from("pm_logs").delete().gte("pm_id", 0);
    if (error) throw error;
  }
}
