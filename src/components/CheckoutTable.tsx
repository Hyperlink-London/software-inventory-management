"use client";

import * as React from "react";
import { Calendar, Package, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type CheckoutItem = {
  id: string;
  item_id: string;
  item_name: string;
  image_URL: string | null;
  quantity: number;
  sign_out_date: string;
  expected_return_date: string | null;
  returned_date: string | null;
  recipient_username: string;
  recipient_id: string;
};

type CheckoutTableProps = {
  checkouts: CheckoutItem[];
  currentUserId: string | null;
};

export function CheckoutTable({ checkouts, currentUserId }: CheckoutTableProps) {
  const [viewMode, setViewMode] = React.useState<"yours" | "team">("yours");

  const filteredCheckouts = React.useMemo(() => {
    if (viewMode === "yours" && currentUserId) {
      return checkouts.filter((checkout) => checkout.recipient_id === currentUserId);
    }
    return checkouts;
  }, [checkouts, viewMode, currentUserId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = (expectedReturn: string | null, returned: string | null) => {
    if (returned) return false;
    if (!expectedReturn) return false;
    return new Date(expectedReturn) < new Date();
  };

  const getStatusBadge = (expectedReturn: string | null, returned: string | null) => {
    if (returned) {
      return <Badge variant="secondary">Returned</Badge>;
    }
    if (isOverdue(expectedReturn, returned)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="outline">Active</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === "yours" ? "default" : "outline"}
          onClick={() => setViewMode("yours")}
          className="flex-1 sm:flex-initial"
        >
          Your Checkouts
        </Button>
        <Button
          variant={viewMode === "team" ? "default" : "outline"}
          onClick={() => setViewMode("team")}
          className="flex-1 sm:flex-initial"
        >
          Team Checkouts
        </Button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {viewMode === "yours"
          ? `Showing ${filteredCheckouts.length} of your checkout${filteredCheckouts.length !== 1 ? "s" : ""}`
          : `Showing ${filteredCheckouts.length} team checkout${filteredCheckouts.length !== 1 ? "s" : ""}`}
      </div>

      {/* Table */}
      {filteredCheckouts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {viewMode === "yours"
            ? "You have no active checkouts."
            : "No team checkouts found."}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Image</TableHead>
                <TableHead>Item Name</TableHead>
                {viewMode === "team" && <TableHead>Recipient</TableHead>}
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Checkout Date</TableHead>
                <TableHead>Expected Return</TableHead>
                <TableHead>Returned Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCheckouts.map((checkout) => (
                <TableRow key={checkout.id}>
                  <TableCell>
                    {checkout.image_URL ? (
                      <div className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
                        <img
                          src={checkout.image_URL}
                          alt={checkout.item_name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {checkout.item_name}
                  </TableCell>
                  {viewMode === "team" && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{checkout.recipient_username}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell>{checkout.quantity}</TableCell>
                  <TableCell>
                    {getStatusBadge(
                      checkout.expected_return_date,
                      checkout.returned_date
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(checkout.sign_out_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className={cn(
                        "flex items-center gap-2",
                        isOverdue(
                          checkout.expected_return_date,
                          checkout.returned_date
                        )
                          ? "text-destructive font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(checkout.expected_return_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(checkout.returned_date)}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

