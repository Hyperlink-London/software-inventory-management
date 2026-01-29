"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  XCircle,
  ShoppingCart,
  Pencil,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { EditItemDialog } from "@/components/EditItemDialog";
import { checkoutItem } from "@/actions/checkout/action";
import { CollapsibleCheckoutCard } from "@/components/CollapsibleCheckoutCard";

type ItemWithTags = {
  id: string;
  item_name: string;
  quantity: number;
  checked_out_quantity: number;
  notes: string | null;
  image_URL: string | null;
  created_by: string | null;
  created_by_name: string | null;
  tags: Array<{
    id: string;
    name: string;
  }>;
};

type CheckoutItem = {
  id: string;
  item_id: string;
  item_name: string;
  image_URL: string | null;
  quantity: number;
  sign_out_date: string;
  expected_return_date: string | null;
  returned_date: string | null;
  recipient_full_name: string;
  recipient_id: string;
};

type ItemDetailProps = {
  item: ItemWithTags;
  checkouts: CheckoutItem[];
  currentUserId: string | null;
  userTeams?: string[];
};

export function ItemDetail({
  item,
  checkouts,
  currentUserId,
  userTeams = [],
}: ItemDetailProps) {
  const router = useRouter();
  const [currentItem, setCurrentItem] = React.useState<ItemWithTags>(item);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [imageLoading, setImageLoading] = React.useState(true);

  const getStatusIcon = (quantity: number) => {
    if (quantity === 0) {
      return (
        <div title="Out of Stock">
          <XCircle className="h-5 w-5 text-destructive" />
        </div>
      );
    } else if (quantity < 5) {
      return (
        <div title="Low Stock">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
        </div>
      );
    } else {
      return (
        <div title="In Stock">
          <CheckCircle className="h-5 w-5 text-green-500" />
        </div>
      );
    }
  };

  const handleItemUpdate = (
    updatedItem?: ItemWithTags,
    deletedItemId?: string,
  ) => {
    if (deletedItemId && deletedItemId === currentItem.id) {
      // If this item was deleted, navigate back to the list
      router.push("/items");
      router.refresh();
      return;
    }

    if (updatedItem && updatedItem.id === currentItem.id) {
      setCurrentItem(updatedItem);
    }

    router.refresh();
  };

  const handleCheckout = async (data: {
    item_id: string;
    quantity: number;
    expected_return_date: string;
  }) => {
    await checkoutItem(data);
    // Refresh server data without full page reload
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Header with back button and actions */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/items")}
            aria-label="Back to inventory"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">
                {currentItem.item_name}
              </h1>
              {getStatusIcon(currentItem.quantity)}
            </div>
            <p className="text-muted-foreground">
              View and manage details for this inventory item.
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setEditDialogOpen(true)}
            className="h-9"
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => setCheckoutDialogOpen(true)}
            disabled={currentItem.quantity === 0}
            className="h-9"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Checkout
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Image section */}
        <div className="rounded-lg border p-4 flex items-center justify-center bg-muted/40">
          {currentItem.image_URL ? (
            <div className="relative w-full min-h-[200px] flex items-center justify-center">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentItem.image_URL}
                alt={currentItem.item_name}
                className="max-h-[350px] max-w-full rounded-md object-contain"
                onLoad={() => setImageLoading(false)}
              />
            </div>
          ) : (
            <div className="flex h-64 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted text-muted-foreground">
              <span className="text-sm">No image available</span>
            </div>
          )}
        </div>

        {/* Details section */}
        <div className="space-y-6">
          {/* Status and quantity */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Status
              </span>
              <div className="flex items-center gap-2">
                {getStatusIcon(currentItem.quantity)}
                <span className="text-sm">
                  {currentItem.quantity === 0
                    ? "Out of stock"
                    : currentItem.quantity < 5
                      ? "Low stock"
                      : "In stock"}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Quantity (available/total)
              </span>
              <span
                className={
                  currentItem.quantity === 0
                    ? "text-destructive font-semibold"
                    : currentItem.quantity < 5
                      ? "text-yellow-500 font-semibold"
                      : "font-semibold"
                }
              >
                {currentItem.quantity} / {currentItem.quantity + currentItem.checked_out_quantity}
              </span>
            </div>
          </div>

          {/* Tags */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Tags
              </span>
              <span className="text-xs text-muted-foreground">
                {currentItem.tags.length}{" "}
                {currentItem.tags.length === 1 ? "tag" : "tags"}
              </span>
            </div>
            {currentItem.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {currentItem.tags.map((tag) => (
                  <Badge key={tag.id} variant="secondary">
                    {tag.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags assigned.</p>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-lg border p-4 space-y-2">
            <span className="text-sm font-medium text-muted-foreground">
              Additional notes
            </span>
            {currentItem.notes ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {currentItem.notes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No additional notes for this item.
              </p>
            )}
          </div>

          {/* Logged by */}
          <div className="rounded-lg border p-4 space-y-2">
            <span className="text-sm font-medium text-muted-foreground">
              Logged by
            </span>
            <p className="text-sm">
              {currentItem.created_by_name || "Unknown"}
            </p>
          </div>
        </div>
      </div>

      {/* Checkouts for this item */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">
          Checkouts for this item
        </h2>
        <p className="text-sm text-muted-foreground">
          View all checkouts made for this item, including active and returned.
        </p>
        <CollapsibleCheckoutCard
          checkouts={checkouts}
          currentUserId={currentUserId}
          userTeams={userTeams}
        />
      </div>

      {/* Dialogs */}
      <CheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        item={currentItem}
        onCheckout={handleCheckout}
      />
      <EditItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        item={currentItem}
        onSuccess={handleItemUpdate}
      />
    </div>
  );
}
