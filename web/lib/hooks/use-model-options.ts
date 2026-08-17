"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addModelOption,
  deleteModelOption,
  fetchModelOptions,
  renameModelOption,
  setModelOptionEnabled,
} from "@/lib/api/model-options";
import { MODEL_OPTIONS } from "@/lib/domain/constants";
import type { ModelOption } from "@/types/database";

export function useModelOptions() {
  return useQuery({
    queryKey: ["model_options"],
    queryFn: fetchModelOptions,
    staleTime: 30_000,
  });
}

// Enabled model names for the registration dropdown. null (not set up) or
// undefined (loading) → the built-in models. An empty configured table returns
// [] so a deleted model doesn't come back.
export function useEnabledModelNames(): string[] {
  const { data } = useModelOptions();
  if (!data) return [...MODEL_OPTIONS];
  return data.filter((m: ModelOption) => m.enabled).map((m) => m.name);
}

function useModelMutation<T>(fn: (arg: T) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["model_options"] }),
  });
}

export function useAddModelMutation() {
  return useModelMutation((name: string) => addModelOption(name));
}

export function useRenameModelMutation() {
  return useModelMutation((input: { id: number; name: string }) =>
    renameModelOption(input.id, input.name)
  );
}

export function useToggleModelMutation() {
  return useModelMutation((input: { id: number; enabled: boolean }) =>
    setModelOptionEnabled(input.id, input.enabled)
  );
}

export function useDeleteModelMutation() {
  return useModelMutation((id: number) => deleteModelOption(id));
}
