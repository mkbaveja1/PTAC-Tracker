"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useAddCategoryMutation,
  useDeleteCategoryMutation,
  useLocationCategories,
  useRenameCategoryMutation,
  useToggleCategoryMutation,
} from "@/lib/hooks/use-location-categories";
import type { PtacUnit } from "@/types/database";

// Manage generic dashboard location categories (add / rename / hide / delete).
// Maintenance Office and Doyle Shop are intentionally not here — they power the
// PM/repair flow and the contractor portal and stay fixed.
export function ManageLocationsDialog({
  units,
  trigger,
}: {
  units: PtacUnit[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const { data: categories = [] } = useLocationCategories();
  const addCategory = useAddCategoryMutation();
  const renameCategory = useRenameCategoryMutation();
  const toggleCategory = useToggleCategoryMutation();
  const deleteCategory = useDeleteCategoryMutation();

  // How many units currently sit in each category (blocks deletion).
  const unitCount = (name: string) =>
    units.filter((u) => u.location_type === name || u.current_location_name === name).length;

  const handleAdd = async () => {
    if (!newName.trim()) {
      toast.error("Enter a location name.");
      return;
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
    if (!editingName.trim()) {
      toast.error("Location name can't be empty.");
      return;
    }
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
      toast.error(`Move the ${count} unit${count === 1 ? "" : "s"} out of "${name}" before deleting it.`);
      return;
    }
    try {
      await deleteCategory.mutateAsync(id);
      toast.success(`Deleted location "${name}".`);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Locations</DialogTitle>
        </DialogHeader>

        <p className="text-xs font-semibold text-slate-500">
          Add, rename, hide, or delete generic dashboard locations. Maintenance Office and Doyle
          Shop are fixed because the PM/repair flow and the contractor portal depend on them.
        </p>

        {/* Add new */}
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New location name (e.g. Rooftop)"
            onKeyDown={(event) => {
              if (event.key === "Enter") handleAdd();
            }}
          />
          <Button onClick={handleAdd} disabled={addCategory.isPending}>
            Add
          </Button>
        </div>

        {/* List */}
        <div className="space-y-2">
          {categories.length === 0 && (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-500">
              No custom locations yet. If you just added the table, add one above. If &quot;Add&quot;
              reports the table is missing, run supabase/location_categories.sql once in Supabase.
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
                      onChange={(event) => setEditingName(event.target.value)}
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
                      onClick={() =>
                        toggleCategory.mutate({ id: category.id, enabled: !category.enabled })
                      }
                    >
                      {category.enabled ? "Hide" : "Show"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 hover:text-rose-700"
                      onClick={() => handleDelete(category.id, category.name)}
                      disabled={count > 0}
                      title={count > 0 ? "Move units out first" : "Delete this location"}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
