"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  deleteUnit,
  registerSpareUnit,
  updateUnitLocation,
  updateUnitSpecs,
  type RegisterSpareInput,
  type UpdateUnitLocationInput,
} from "@/lib/api/units";
import {
  registerOnsiteRepair,
  registerPmLog,
  type RegisterOnsiteRepairInput,
  type RegisterPmInput,
} from "@/lib/api/logs";
import { completeDoyleRepair, type CompleteDoyleRepairInput } from "@/lib/api/doyle";
import {
  clearSpendingData,
  deleteHistoryRows,
  type ClearSpendingInput,
  type HistoryRowRef,
} from "@/lib/api/maintenance";

function useInvalidate() {
  const queryClient = useQueryClient();
  return (keys: string[]) => {
    for (const key of keys) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useTransferMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: UpdateUnitLocationInput) => updateUnitLocation(input),
    onSuccess: () => invalidate(["units", "transfers"]),
  });
}

export function usePmMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: RegisterPmInput) => registerPmLog(input),
    onSuccess: () => invalidate(["units", "transfers", "pm_logs"]),
  });
}

export function useOnsiteRepairMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: RegisterOnsiteRepairInput) => registerOnsiteRepair(input),
    onSuccess: () => invalidate(["units", "transfers", "onsite_repairs"]),
  });
}

export function useDoyleCompletionMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CompleteDoyleRepairInput) => completeDoyleRepair(input),
    onSuccess: () => invalidate(["units", "transfers", "doyle_repairs"]),
  });
}

export function useRegisterSpareMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: RegisterSpareInput) => registerSpareUnit(input),
    onSuccess: () => invalidate(["units"]),
  });
}

export function useUpdateSpecsMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: { ptacId: string; modelSpecs: string; serialNumber: string }) =>
      updateUnitSpecs(input.ptacId, input.modelSpecs, input.serialNumber),
    onSuccess: () => invalidate(["units"]),
  });
}

export function useDeleteUnitMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (ptacId: string) => deleteUnit(ptacId),
    onSuccess: () => invalidate(["units"]),
  });
}

export function useDeleteHistoryMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (rows: HistoryRowRef[]) => deleteHistoryRows(rows),
    onSuccess: () => invalidate(["transfers", "pm_logs", "onsite_repairs", "doyle_repairs"]),
  });
}

export function useClearSpendingMutation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ClearSpendingInput) => clearSpendingData(input),
    onSuccess: () => invalidate(["onsite_repairs", "doyle_repairs", "pm_logs"]),
  });
}
