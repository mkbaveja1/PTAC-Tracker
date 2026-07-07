"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchUnit, fetchUnits } from "@/lib/api/units";
import {
  fetchDoyleRepairs,
  fetchOnsiteRepairs,
  fetchPmLogs,
  fetchTransfers,
} from "@/lib/api/logs";

export function useUnits() {
  return useQuery({ queryKey: ["units"], queryFn: fetchUnits });
}

export function useUnit(ptacId: string) {
  return useQuery({
    queryKey: ["units", ptacId],
    queryFn: () => fetchUnit(ptacId),
    enabled: Boolean(ptacId),
  });
}

export function usePmLogs(ptacId?: string) {
  return useQuery({
    queryKey: ptacId ? ["pm_logs", ptacId] : ["pm_logs"],
    queryFn: () => fetchPmLogs(ptacId),
  });
}

export function useTransfers(ptacId?: string) {
  return useQuery({
    queryKey: ptacId ? ["transfers", ptacId] : ["transfers"],
    queryFn: () => fetchTransfers(ptacId),
  });
}

export function useOnsiteRepairs(ptacId?: string) {
  return useQuery({
    queryKey: ptacId ? ["onsite_repairs", ptacId] : ["onsite_repairs"],
    queryFn: () => fetchOnsiteRepairs(ptacId),
  });
}

export function useDoyleRepairs(ptacId?: string) {
  return useQuery({
    queryKey: ptacId ? ["doyle_repairs", ptacId] : ["doyle_repairs"],
    queryFn: () => fetchDoyleRepairs(ptacId),
  });
}
