"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDeleteUnitMutation } from "@/lib/hooks/use-unit-mutations";
import type { PtacUnit } from "@/types/database";

// Port of render_delete_form(): confirmation required; returns to dashboard after delete.
export function DeleteUnitDialog({ unit, trigger }: { unit: PtacUnit; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const router = useRouter();

  const deleteUnit = useDeleteUnitMutation();

  const handleSubmit = async () => {
    if (!confirmed) {
      toast.error("Confirm deletion before continuing.");
      return;
    }
    try {
      await deleteUnit.mutateAsync(unit.ptac_id);
      toast.success("Record deleted.");
      setOpen(false);
      router.push("/dashboard");
    } catch (error) {
      toast.error(`Delete failed: ${(error as Error).message}`);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmed(false);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Record</DialogTitle>
        </DialogHeader>

        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
          This permanently deletes the PTAC unit record. Use only for accidental test records or
          true removal.
        </p>

        <label className="flex items-start gap-2 text-xs font-semibold text-slate-700">
          <Checkbox
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
          />
          I understand and want to delete {unit.ptac_id}
        </label>

        <Button
          variant="destructive"
          className="w-full"
          disabled={deleteUnit.isPending}
          onClick={handleSubmit}
        >
          {deleteUnit.isPending ? "Deleting…" : "Delete Record"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
