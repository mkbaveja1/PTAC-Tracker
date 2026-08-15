"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addPmChecklistItem,
  deletePmChecklistItem,
  fetchPmChecklistItems,
  renamePmChecklistItem,
  setPmChecklistItemEnabled,
} from "@/lib/api/pm-checklist";
import { DEFAULT_PM_TASKS } from "@/lib/domain/constants";
import type { PmChecklistItem } from "@/types/database";

export function usePmChecklistItems() {
  return useQuery({
    queryKey: ["pm_checklist_items"],
    queryFn: fetchPmChecklistItems,
    staleTime: 30_000,
  });
}

export interface PmChecklistState {
  // Enabled item labels the PM dialog should show. Falls back to the built-in
  // four before the table is set up.
  tasks: string[];
  // Whether the table is configured (so completed_tasks can be stored).
  configured: boolean;
}

export function useEnabledPmTasks(): PmChecklistState {
  const { data = [] } = usePmChecklistItems();
  if (data.length === 0) {
    return { tasks: [...DEFAULT_PM_TASKS], configured: false };
  }
  return {
    tasks: data.filter((item: PmChecklistItem) => item.enabled).map((item) => item.label),
    configured: true,
  };
}

function usePmChecklistMutation<T>(fn: (arg: T) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pm_checklist_items"] }),
  });
}

export function useAddPmItemMutation() {
  return usePmChecklistMutation((label: string) => addPmChecklistItem(label));
}

export function useRenamePmItemMutation() {
  return usePmChecklistMutation((input: { id: number; label: string }) =>
    renamePmChecklistItem(input.id, input.label)
  );
}

export function useTogglePmItemMutation() {
  return usePmChecklistMutation((input: { id: number; enabled: boolean }) =>
    setPmChecklistItemEnabled(input.id, input.enabled)
  );
}

export function useDeletePmItemMutation() {
  return usePmChecklistMutation((id: number) => deletePmChecklistItem(id));
}
