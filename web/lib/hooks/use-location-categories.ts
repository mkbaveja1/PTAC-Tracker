"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addLocationCategory,
  deleteLocationCategory,
  fetchLocationCategories,
  renameLocationCategory,
  setLocationCategoryEnabled,
} from "@/lib/api/locations-admin";
import type { LocationCategory } from "@/types/database";

export function useLocationCategories() {
  return useQuery({
    queryKey: ["location_categories"],
    queryFn: fetchLocationCategories,
    staleTime: 30_000,
  });
}

// Enabled categories only, as plain names — what the rest of the app offers as
// destinations / types.
export function useEnabledLocationNames(): string[] {
  const { data = [] } = useLocationCategories();
  return data.filter((c: LocationCategory) => c.enabled).map((c) => c.name);
}

function useCategoryMutation<T>(fn: (arg: T) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["location_categories"] }),
  });
}

export function useAddCategoryMutation() {
  return useCategoryMutation((name: string) => addLocationCategory(name));
}

export function useRenameCategoryMutation() {
  return useCategoryMutation((input: { id: number; name: string }) =>
    renameLocationCategory(input.id, input.name)
  );
}

export function useToggleCategoryMutation() {
  return useCategoryMutation((input: { id: number; enabled: boolean }) =>
    setLocationCategoryEnabled(input.id, input.enabled)
  );
}

export function useDeleteCategoryMutation() {
  return useCategoryMutation((id: number) => deleteLocationCategory(id));
}
