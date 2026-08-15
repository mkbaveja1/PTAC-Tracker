"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useAddCategoryMutation,
  useDeleteCategoryMutation,
  useLocationCategories,
  useRenameCategoryMutation,
  useToggleCategoryMutation,
} from "@/lib/hooks/use-location-categories";
import type { PtacUnit } from "@/types/database";

// Reserved built-in names a custom location must not shadow.
const RESERVED_NAMES = new Set(
  ["Room", "Guest Room", "Hallway", "Corridor/Hallway", "Maintenance Office", "Doyle Shop", "Spare", "Spare Storage"].map(
    (n) => n.toLowerCase()
  )
);

// Add / rename / hide / delete generic dashboard locations. Maintenance Office
// and Doyle Shop are intentionally fixed (features depend on them).
export function LocationsManager({ units }: { units: PtacUnit[] }) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const { data } = useLocationCategories();
  const categories = data ?? [];
  const addCategory = useAddCategoryMutation();
  const renameCategory = useRenameCategoryMutation();
  const toggleCategory = useToggleCategoryMutation();
  const deleteCategory = useDeleteCategoryMutation();

  const unitCount = (name: string) =>
    units.filter((u) => u.location_type === name || u.current_location_name === name).length;

  const handleAdd = async () => {
    if (!newName.trim()) return toast.error("Enter a location name.");
    if (RESERVED_NAMES.has(newName.trim().toLowerCase())) {
      return toast.error(`"${newName.trim()}" is a built-in location name. Choose a different name.`);
    }
    try {
      await addCategory.mutateAsync(newName.trim());
      toast.success(`Added location "${newName.trim()}".`);
      setNewName("");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleRename = async (id: number) => {
    if (!editingName.trim()) return toast.error("Location name can't be empty.");
    try {
      await renameCategory.mutateAsync({ id, name: editingName.trim() });
      toast.success("Location renamed.");
      setEditingId(null);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const count = unitCount(name);
    if (count > 0) {
      return toast.error(`Move the ${count} unit${count === 1 ? "" : "s"} out of "${name}" first.`);
    }
    try {
      await deleteCategory.mutateAsync(id);
      toast.success(`Deleted location "${name}".`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-500">
        Add, rename, hide, or delete generic dashboard locations. Maintenance Office and Doyle Shop
        stay fixed because the repair flow and contractor portal depend on them.
      </p>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New location (e.g. Rooftop)"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={addCategory.isPending}>
          Add
        </Button>
      </div>

      {categories.length === 0 && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-500">
          No custom locations. If &quot;Add&quot; reports the table is missing, run
          supabase/location_categories.sql once in Supabase.
        </p>
      )}

      {categories.map((category) => {
        const count = unitCount(category.name);
        const isEditing = editingId === category.id;
        return (
          <div
            key={category.id}
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
                <Button size="sm" onClick={() => handleRename(category.id)} disabled={renameCategory.isPending}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <span className="text-sm font-black text-slate-900">{category.name}</span>
                  <span className="ml-2 text-[11px] font-bold text-slate-400">
                    {count} unit{count === 1 ? "" : "s"}
                    {!category.enabled && " · hidden"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(category.id);
                    setEditingName(category.name);
                  }}
                >
                  Rename
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleCategory.mutate({ id: category.id, enabled: !category.enabled })}
                >
                  {category.enabled ? "Hide" : "Show"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => handleDelete(category.id, category.name)}
                  disabled={count > 0}
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
