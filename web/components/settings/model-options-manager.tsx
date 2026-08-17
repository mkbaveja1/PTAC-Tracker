"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAddModelMutation,
  useDeleteModelMutation,
  useModelOptions,
  useRenameModelMutation,
  useToggleModelMutation,
} from "@/lib/hooks/use-model-options";

// Add / rename / hide / delete the PTAC model options offered when registering
// a new unit.
export function ModelOptionsManager() {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const { data } = useModelOptions();
  const models = data ?? [];
  const addModel = useAddModelMutation();
  const renameModel = useRenameModelMutation();
  const toggleModel = useToggleModelMutation();
  const deleteModel = useDeleteModelMutation();

  const handleAdd = async () => {
    if (!newName.trim()) return toast.error("Enter a model name.");
    try {
      await addModel.mutateAsync(newName.trim());
      toast.success(`Added model "${newName.trim()}".`);
      setNewName("");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleRename = async (id: number) => {
    if (!editingName.trim()) return toast.error("Model name can't be empty.");
    try {
      await renameModel.mutateAsync({ id, name: editingName.trim() });
      toast.success("Model renamed.");
      setEditingId(null);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    try {
      await deleteModel.mutateAsync(id);
      toast.success(`Removed model "${name}".`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500">
        Models offered when registering a new unit. Add one when you buy a new type of PTAC.
      </p>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New model (e.g. Amana PTAC12-DigiSmart)"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={addModel.isPending}>
          Add
        </Button>
      </div>

      {models.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-500">
          Using the four built-in models. To customize, run supabase/model_options.sql once in
          Supabase, then add or remove models here.
        </p>
      )}

      {models.map((model) => {
        const isEditing = editingId === model.id;
        return (
          <div
            key={model.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3"
          >
            {isEditing ? (
              <>
                <Input
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={() => handleRename(model.id)} disabled={renameModel.isPending}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <span className="text-sm font-black text-slate-900">{model.name}</span>
                  {!model.enabled && (
                    <span className="ml-2 text-[11px] font-bold text-slate-400">hidden</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(model.id);
                    setEditingName(model.name);
                  }}
                >
                  Rename
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleModel.mutate({ id: model.id, enabled: !model.enabled })}
                >
                  {model.enabled ? "Hide" : "Show"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => handleDelete(model.id, model.name)}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
