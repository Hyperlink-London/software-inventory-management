"use client";

import { useEffect, useRef } from "react";

type SignOutItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemName?: string;
};

export default function SignOutItemDialog({
  open,
  onOpenChange,
  onConfirm,
  itemName,
}: SignOutItemDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-0 backdrop:bg-black/50"
      onClose={() => onOpenChange(false)}
    >
      <div className="p-6 w-[90vw] max-w-md bg-white dark:bg-zinc-900 rounded-lg">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Sign Out Item</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          {`Are you sure you want to sign out${itemName ? ` \"${itemName}\"` : ""}?`}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-red-600 text-white px-3 py-2 text-sm hover:bg-red-700"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </dialog>
  );
}


