"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAddPmItemMutation,
  useDeletePmItemMutation,
  usePmChecklistItems,
  useRenamePmItemMutation,
  useTogglePmItemMutation,
} from "@/lib/hooks/use-pm-checklist";

// Add / rename / hide / delete PM checklist items. Every enabled item is
// required when a technician logs a PM.
export function PmChecklistManager() {
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const { data: items = [] } = usePmChecklistItems();
  const addItem = useAddPmItemMutation();
  const renameItem = useRenamePmItemMutation();
  const toggleItem = useTogglePmItemMutation();
  const deleteItem = useDeletePmItemMutation();

  const handleAdd = async () => {
    if (!newLabel.trim()) return toast.error("Enter an item.");
    try {
      await addItem.mutateAsync(newLabel.trim());
      toast.success(`Added "${newLabel.trim()}".`);
      setNewLabel("");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleRename = async (id: number) => {
    if (!editingLabel.trim()) return toast.error("Item can't be empty.");
    try {
      await renameItem.mutateAsync({ id, label: editingLabel.trim() });
      toast.success("Item renamed.");
      setEditingId(null);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDelete = async (id: number, label: string) => {
    try {
      await deleteItem.mutateAsync(id);
      toast.success(`Removed "${label}".`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500">
        Items technicians must check off for each PM. Every enabled item is required to log a PM.
      </p>

      <div className="flex gap-2">
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="New checklist item (e.g. Refrigerant level checked)"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={addItem.isPending}>
          Add
        </Button>
      </div>

      {items.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-500">
          Using the four built-in items. To customize, run supabase/pm_checklist.sql once in
          Supabase, then add or remove items here.
        </p>
      )}

      {items.map((item) => {
        const isEditing = editingId === item.id;
        return (
          <div
            key={item.id}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3"
          >
            {isEditing ? (
              <>
                <Input
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={() => handleRename(item.id)} disabled={renameItem.isPending}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <span className="text-sm font-black text-slate-900">{item.label}</span>
                  {!item.enabled && (
                    <span className="ml-2 text-[11px] font-bold text-slate-400">hidden</span>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(item.id);
                    setEditingLabel(item.label);
                  }}
                >
                  Rename
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleItem.mutate({ id: item.id, enabled: !item.enabled })}
                >
                  {item.enabled ? "Hide" : "Show"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => handleDelete(item.id, item.label)}
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
