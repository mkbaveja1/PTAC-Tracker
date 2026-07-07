"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  DEFAULT_PM_INTERVAL_MONTHS,
  fetchPmIntervalMonths,
  updatePmIntervalMonths,
} from "@/lib/api/settings";

// Current routine-PM interval in months (default: every 6 months = 2×/year).
export function usePmIntervalMonths(): number {
  const { data } = useQuery({
    queryKey: ["settings", "pm_interval_months"],
    queryFn: fetchPmIntervalMonths,
    // The schedule changes rarely; no need to refetch on every focus.
    staleTime: 60_000,
  });
  return data ?? DEFAULT_PM_INTERVAL_MONTHS;
}

export function useUpdatePmIntervalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (months: number) => updatePmIntervalMonths(months),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}
