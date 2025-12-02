"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddItemDialog } from "@/components/AddItemDialog";
import { useRouter } from "next/navigation";

export function AddItemButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <Button
        variant="default"
        size="sm"
        className="h-9 sm:h-8 text-sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-2 h-3 w-3" />
        Add Item
      </Button>
      <AddItemDialog open={open} onOpenChange={setOpen} onSuccess={handleSuccess} />
    </>
  );
}

