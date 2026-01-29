"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OptimizedItemImage } from "@/components/OptimizedItemImage";

type ItemWithTags = {
  id: string;
  item_name: string;
  quantity: number;
  checked_out_quantity?: number;
  notes: string | null;
  image_URL: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  tags: Array<{
    id: string;
    name: string;
  }>;
};

type CheckoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemWithTags | null;
  onCheckout: (data: {
    item_id: string;
    quantity: number;
    expected_return_date: string;
  }) => Promise<void>;
};

export function CheckoutDialog({
  open,
  onOpenChange,
  item,
  onCheckout,
}: CheckoutDialogProps) {
  const [quantity, setQuantity] = React.useState("1");
  const [expectedReturnDate, setExpectedReturnDate] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens/closes or item changes
  React.useEffect(() => {
    if (open && item) {
      setQuantity("1");
      setExpectedReturnDate("");
      setError(null);
      // Set default expected return date to 7 days from now
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setExpectedReturnDate(defaultDate.toISOString().split("T")[0]);
    }
  }, [open, item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!item) return;

    const quantityNum = parseInt(quantity, 10);

    // Validation
    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError("Quantity must be a positive number");
      return;
    }

    if (quantityNum > item.quantity) {
      setError(`Cannot checkout more than available quantity (${item.quantity})`);
      return;
    }

    if (!expectedReturnDate) {
      setError("Expected return date is required");
      return;
    }

    const returnDate = new Date(expectedReturnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    returnDate.setHours(0, 0, 0, 0);

    if (returnDate < today) {
      setError("Expected return date cannot be in the past");
      return;
    }

    setIsSubmitting(true);
    try {
      await onCheckout({
        item_id: item.id,
        quantity: quantityNum,
        expected_return_date: expectedReturnDate,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to checkout item");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] w-[calc(100vw-1rem)] sm:w-full max-h-[95vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Checkout Item</DialogTitle>
          <DialogDescription>
            Check out <strong>{item.item_name}</strong> from inventory
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Item Info */}
            <div className="flex items-center gap-4 rounded-lg border p-4">
              {item.image_URL ? (
                <div className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
                  <OptimizedItemImage
                    src={item.image_URL}
                    alt={item.item_name}
                    size="sm"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-muted">
                  <span className="text-xs text-muted-foreground">No image</span>
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium">{item.item_name}</p>
                <p className="text-sm text-muted-foreground">
                  Available: {item.quantity}
                </p>
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity <span className="text-muted-foreground">(max: {item.quantity})</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={item.quantity}
                value={quantity}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || (parseInt(value, 10) > 0 && parseInt(value, 10) <= item.quantity)) {
                    setQuantity(value);
                  }
                }}
                disabled={isSubmitting || item.quantity === 0}
                required
              />
            </div>

            {/* Expected Return Date */}
            <div className="space-y-2">
              <Label htmlFor="expectedReturnDate">
                Expected Return Date
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="expectedReturnDate"
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  disabled={isSubmitting}
                  className="pl-9"
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || item.quantity === 0}>
              {isSubmitting ? "Processing..." : "Checkout"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

