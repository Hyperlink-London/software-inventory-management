"use client";

import * as React from "react";
import { Calendar, Package, User, CheckCircle2, Search, Filter, X, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { checkInItem } from "@/actions/checkin/action";

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

type StatusFilter = "all" | "active" | "overdue" | "returned";

// Helper function to check if checkout is overdue
const isOverdue = (expectedReturn: string | null, returned: string | null) => {
  if (returned) return false;
  if (!expectedReturn) return false;
  return new Date(expectedReturn) < new Date();
};

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "returned", label: "Returned" },
];

export function CheckoutTable({ checkouts, currentUserId }: CheckoutTableProps) {
  const [viewMode, setViewMode] = React.useState<"yours" | "team">("yours");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [checkingIn, setCheckingIn] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  // Only render Popover after mount to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const filteredAndSortedCheckouts = React.useMemo(() => {
    // First filter by view mode (yours vs team)
    let filtered = checkouts;
    if (viewMode === "yours" && currentUserId) {
      filtered = checkouts.filter((checkout) => checkout.recipient_id === currentUserId);
    }

    // Then filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((checkout) => {
        return (
          checkout.item_name.toLowerCase().includes(query) ||
          checkout.recipient_username.toLowerCase().includes(query) ||
          checkout.id.toLowerCase().includes(query)
        );
      });
    }

    // Then filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((checkout) => {
        const returned = !!checkout.returned_date;
        const overdue = isOverdue(checkout.expected_return_date, checkout.returned_date);

        if (statusFilter === "returned") return returned;
        if (statusFilter === "overdue") return overdue;
        if (statusFilter === "active") return !returned && !overdue;
        return true;
      });
    }

    // Sort: Active checkouts first (most recent at top), then returned checkouts (most recent at top)
    return filtered.sort((a, b) => {
      const aReturned = !!a.returned_date;
      const bReturned = !!b.returned_date;

      // If one is returned and the other isn't, returned goes to bottom
      if (aReturned && !bReturned) return 1;
      if (!aReturned && bReturned) return -1;

      // Both have same status, sort by date (most recent first)
      const aDate = aReturned ? a.returned_date! : a.sign_out_date;
      const bDate = bReturned ? b.returned_date! : b.sign_out_date;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [checkouts, viewMode, currentUserId, statusFilter, searchQuery]);

  // Separate active and returned checkouts
  const activeCheckouts = React.useMemo(
    () => filteredAndSortedCheckouts.filter((c) => !c.returned_date),
    [filteredAndSortedCheckouts]
  );

  const returnedCheckouts = React.useMemo(
    () => filteredAndSortedCheckouts.filter((c) => !!c.returned_date),
    [filteredAndSortedCheckouts]
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };


  const getStatusBadge = (expectedReturn: string | null, returned: string | null) => {
    if (returned) {
      return <Badge variant="secondary">Returned</Badge>;
    }
    if (isOverdue(expectedReturn, returned)) {
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Late</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>;
  };

  const handleCheckIn = async (checkoutId: string) => {
    setCheckingIn(checkoutId);
    try {
      await checkInItem(checkoutId);
      // Reload page to show updated data
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to check in item");
      setCheckingIn(null);
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchQuery("");
  };

  const getStatusLabel = (status: StatusFilter) => {
    return statusOptions.find((opt) => opt.value === status)?.label || "All";
  };

  return (
    <div className="space-y-3">
      {/* View Mode Toggle */}
      <div className="flex flex-wrap gap-2">
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

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items, recipients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {mounted ? (
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                <Filter className="mr-2 h-4 w-4" />
                Filter by Status
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="ml-2">
                    {getStatusLabel(statusFilter)}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search status..." />
                <CommandList>
                  <CommandEmpty>No status found.</CommandEmpty>
                  <CommandGroup>
                    {statusOptions.map((option) => (
                      <CommandItem
                        key={option.value}
                        onSelect={() => {
                          setStatusFilter(option.value);
                          setFilterOpen(false);
                        }}
                        className="flex items-center justify-between"
                      >
                        <span>{option.label}</span>
                        {statusFilter === option.value && (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <Button variant="outline" className="w-full sm:w-auto" disabled>
            <Filter className="mr-2 h-4 w-4" />
            Filter by Status
            {statusFilter !== "all" && (
              <Badge variant="secondary" className="ml-2">
                {getStatusLabel(statusFilter)}
              </Badge>
            )}
          </Button>
        )}
        {(statusFilter !== "all" || searchQuery) && (
          <Button variant="ghost" onClick={clearFilters} className="w-full sm:w-auto">
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Selected Filter Display */}
      {statusFilter !== "all" && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setStatusFilter("all")}
          >
            {getStatusLabel(statusFilter)}
            <X className="ml-1 h-3 w-3" />
          </Badge>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {viewMode === "yours"
          ? `Showing ${filteredAndSortedCheckouts.length} of your checkout${filteredAndSortedCheckouts.length !== 1 ? "s" : ""}`
          : `Showing ${filteredAndSortedCheckouts.length} team checkout${filteredAndSortedCheckouts.length !== 1 ? "s" : ""}`}
      </div>

      {/* Table */}
      {filteredAndSortedCheckouts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {viewMode === "yours"
            ? "You have no checkouts matching the selected filters."
            : "No team checkouts found matching the selected filters."}
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="max-h-[300px] overflow-y-auto scrollbar-hide">
            <Table className="[&>div]:overflow-visible">
              <TableHeader className="sticky top-0 z-10 bg-background [&_tr]:border-b shadow-sm">
                <TableRow>
                  <TableHead className="w-[80px] py-2">Image</TableHead>
                  <TableHead className="py-2">Item Name</TableHead>
                  {viewMode === "team" && <TableHead className="py-2">Recipient</TableHead>}
                  <TableHead className="py-2">Quantity</TableHead>
                  <TableHead className="py-2">Status</TableHead>
                  <TableHead className="py-2">Checkout Date</TableHead>
                  <TableHead className="py-2">Expected Return</TableHead>
                  <TableHead className="py-2">Returned Date</TableHead>
                  {viewMode === "yours" && <TableHead className="w-[100px] py-2">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
              {/* Active Checkouts Section */}
              {activeCheckouts.map((checkout) => (
                <TableRow key={checkout.id}>
                  <TableCell className="py-2">
                    {checkout.image_URL ? (
                      <div className="relative h-12 w-12 overflow-hidden rounded-md border border-border">
                        <img
                          src={checkout.image_URL}
                          alt={checkout.item_name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                        <Package className="h-4 w-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium py-2">{checkout.item_name}</TableCell>
                  {viewMode === "team" && (
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{checkout.recipient_username}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="py-2 text-sm">{checkout.quantity}</TableCell>
                  <TableCell className="py-2">
                    {getStatusBadge(
                      checkout.expected_return_date,
                      checkout.returned_date
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="text-sm">{formatDate(checkout.sign_out_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div
                      className={cn(
                        "flex items-center gap-1.5",
                        isOverdue(
                          checkout.expected_return_date,
                          checkout.returned_date
                        )
                          ? "text-destructive font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      <span className="text-sm">{formatDate(checkout.expected_return_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="text-sm">{formatDate(checkout.returned_date)}</span>
                    </div>
                  </TableCell>
                  {viewMode === "yours" && (
                    <TableCell className="py-2">
                      {!checkout.returned_date ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckIn(checkout.id)}
                          disabled={checkingIn === checkout.id}
                          className="w-full h-8 text-xs"
                        >
                          <CheckCircle2 className="mr-1.5 h-3 w-3" />
                          {checkingIn === checkout.id ? "Checking in..." : "Check In"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Returned</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}

              {/* Returned Checkouts Section */}
              {returnedCheckouts.length > 0 && activeCheckouts.length > 0 && (
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={viewMode === "team" ? 8 : 7} className="font-semibold text-muted-foreground py-2">
                    Returned
                  </TableCell>
                </TableRow>
              )}
              {returnedCheckouts.map((checkout) => (
                <TableRow key={checkout.id} className="opacity-75">
                  <TableCell className="py-2">
                    {checkout.image_URL ? (
                      <div className="relative h-12 w-12 overflow-hidden rounded-md border border-border">
                        <img
                          src={checkout.image_URL}
                          alt={checkout.item_name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                        <Package className="h-4 w-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium py-2">{checkout.item_name}</TableCell>
                  {viewMode === "team" && (
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{checkout.recipient_username}</span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="py-2 text-sm">{checkout.quantity}</TableCell>
                  <TableCell className="py-2">
                    {getStatusBadge(
                      checkout.expected_return_date,
                      checkout.returned_date
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="text-sm">{formatDate(checkout.sign_out_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div
                      className={cn(
                        "flex items-center gap-1.5",
                        isOverdue(
                          checkout.expected_return_date,
                          checkout.returned_date
                        )
                          ? "text-destructive font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      <span className="text-sm">{formatDate(checkout.expected_return_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="text-sm">{formatDate(checkout.returned_date)}</span>
                    </div>
                  </TableCell>
                  {viewMode === "yours" && (
                    <TableCell className="py-2">
                      <span className="text-xs text-muted-foreground">Returned</span>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

