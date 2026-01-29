"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, Package, User, CheckCircle2, Search, Filter, X, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  recipient_full_name: string;
  recipient_id: string;
  recipient_teams?: string[];
};

type CheckoutTableProps = {
  checkouts: CheckoutItem[];
  currentUserId: string | null;
  userTeams?: string[];
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  basePath?: string;
  pageParam?: string;
  initialViewMode?: "yours" | "everyone" | "team" | "returned";
  viewParam?: string;
  returnViewSearchParams?: string;
};

type StatusFilter = "all" | "active" | "overdue";

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
];

export function CheckoutTable({
  checkouts,
  currentUserId,
  userTeams = [],
  totalCount,
  currentPage = 1,
  pageSize = 10,
  basePath,
  pageParam = "page",
  initialViewMode,
  viewParam,
  returnViewSearchParams,
}: CheckoutTableProps) {
  const router = useRouter();
  const isPaginated = totalCount != null && basePath != null;
  const [viewMode, setViewMode] = React.useState<"yours" | "everyone" | "team" | "returned">(
    initialViewMode ?? "yours"
  );
  const [selectedTeam, setSelectedTeam] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [teamFilterOpen, setTeamFilterOpen] = React.useState(false);
  const [checkingIn, setCheckingIn] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [imageDialogOpen, setImageDialogOpen] = React.useState(false);
  const [selectedImageItem, setSelectedImageItem] = React.useState<CheckoutItem | null>(null);

  React.useEffect(() => {
    if (initialViewMode != null) setViewMode(initialViewMode);
  }, [initialViewMode]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const filteredAndSortedCheckouts = React.useMemo(() => {
    // Server sends filtered data per view; team filter is client-side on current page
    let filtered = checkouts;
    if (viewMode === "yours" && currentUserId) {
      filtered = checkouts.filter((checkout) => checkout.recipient_id === currentUserId);
    } else if (viewMode === "everyone" || viewMode === "returned") {
      filtered = checkouts;
    } else if (viewMode === "team") {
      // Team checkouts - show checkouts from users in the selected team
      if (userTeams.length > 0) {
        // Normalize user teams (handle nulls, trim whitespace, ensure strings)
        const normalizedUserTeams = userTeams
          .filter((team): team is string => team != null && typeof team === 'string')
          .map(team => team.trim())
          .filter(team => team.length > 0);
        
        // If a specific team is selected, filter by that team only
        // Otherwise, show checkouts from all teams the user belongs to
        const teamsToFilter = selectedTeam 
          ? [selectedTeam.trim()] 
          : normalizedUserTeams;
        
        filtered = checkouts.filter((checkout) => {
          const recipientTeams = checkout.recipient_teams || [];
          
          // Normalize recipient teams (handle arrays, nulls, ensure strings)
          const normalizedRecipientTeams = Array.isArray(recipientTeams)
            ? recipientTeams
                .filter((team): team is string => team != null && typeof team === 'string')
                .map(team => team.trim())
                .filter(team => team.length > 0)
            : [];
          
          // Check if recipient belongs to any of the teams we're filtering by
          const hasMatchingTeam = normalizedRecipientTeams.some((recipientTeam) => 
            teamsToFilter.includes(recipientTeam)
          );
          
          return hasMatchingTeam;
        });
      } else {
        // User has no teams, show empty
        filtered = [];
      }
    }

    // Then filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((checkout) => {
        return (
          checkout.item_name.toLowerCase().includes(query) ||
          checkout.recipient_full_name.toLowerCase().includes(query) ||
          checkout.id.toLowerCase().includes(query)
        );
      });
    }

    // Status filter (skip when viewMode is "returned" — we only have returned history)
    if (statusFilter !== "all" && viewMode !== "returned") {
      filtered = filtered.filter((checkout) => {
        const returned = !!checkout.returned_date;
        const overdue = isOverdue(checkout.expected_return_date, checkout.returned_date);
        if (statusFilter === "overdue") return overdue;
        if (statusFilter === "active") return !returned && !overdue;
        return true;
      });
    }

    // Sort: Returned = most recent check-in first. Active = overdue first, then most recent checkout first.
    return filtered.sort((a, b) => {
      if (viewMode === "returned") {
        const aRet = new Date(a.returned_date!).getTime();
        const bRet = new Date(b.returned_date!).getTime();
        const cmp = aRet - bRet;
        if (cmp !== 0) return cmp;
        return new Date(a.sign_out_date).getTime() - new Date(b.sign_out_date).getTime();
      }
      const aOverdue = isOverdue(a.expected_return_date, a.returned_date);
      const bOverdue = isOverdue(b.expected_return_date, b.returned_date);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return new Date(b.sign_out_date).getTime() - new Date(a.sign_out_date).getTime();
    });
  }, [checkouts, viewMode, currentUserId, statusFilter, searchQuery, userTeams, selectedTeam]);

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
      return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Overdue</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>;
  };

  const handleCheckIn = async (checkoutId: string) => {
    setCheckingIn(checkoutId);
    try {
      await checkInItem(checkoutId);
      // Refresh server data without full page reload
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to check in item");
    } finally {
      setCheckingIn(null);
    }
  };

  const handleImageClick = (checkout: CheckoutItem) => {
    if (!checkout.image_URL) return;
    setSelectedImageItem(checkout);
    setImageDialogOpen(true);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchQuery("");
    setSelectedTeam(null);
  };

  // Normalize and sort user teams for display
  const normalizedUserTeams = React.useMemo(() => {
    return userTeams
      .filter((team): team is string => team != null && typeof team === 'string')
      .map(team => team.trim())
      .filter(team => team.length > 0)
      .sort();
  }, [userTeams]);

  const getStatusLabel = (status: StatusFilter) => {
    return statusOptions.find((opt) => opt.value === status)?.label || "All";
  };

  const pathBase = basePath === "/" ? "/" : basePath ?? "";
  const buildPageUrl = (pageNum: number, viewValue?: string) => {
    if (!basePath) return "";
    const params = new URLSearchParams();
    if (viewParam && (viewValue ?? initialViewMode)) {
      params.set(viewParam, viewValue ?? initialViewMode ?? "yours");
    }
    params.set(pageParam, String(pageNum));
    return `${pathBase}?${params.toString()}`;
  };
  const returnedViewUrl =
    basePath && returnViewSearchParams
      ? `${pathBase}?${returnViewSearchParams}&${pageParam}=1`
      : null;

  const goToActiveView = (viewValue: "yours" | "everyone" | "team") => {
    if (viewValue === "team") return; // team is client-side only
    if (isPaginated && basePath && viewParam) {
      router.push(buildPageUrl(1, viewValue));
    }
  };
  const goToReturnedView = () => {
    if (returnedViewUrl) router.push(returnedViewUrl);
    else setViewMode("returned");
  };

  return (
    <div className="space-y-3">
      {/* View Mode Toggle */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={viewMode === "yours" ? "default" : "outline"}
          onClick={() => {
            goToActiveView("yours");
            setViewMode("yours");
          }}
          className="flex-1 sm:flex-initial"
        >
          Your Checkouts
        </Button>
        <Button
          variant={viewMode === "everyone" ? "default" : "outline"}
          onClick={() => {
            goToActiveView("everyone");
            setViewMode("everyone");
          }}
          className="flex-1 sm:flex-initial"
        >
          Everyone Checkouts
        </Button>
        {mounted && normalizedUserTeams.length > 0 ? (
          <Popover open={teamFilterOpen} onOpenChange={setTeamFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={viewMode === "team" ? "default" : "outline"}
                onClick={() => {
                  goToActiveView("team");
                  setViewMode("team");
                  if (!teamFilterOpen) setTeamFilterOpen(true);
                }}
                className="flex-1 sm:flex-initial"
              >
                Team Checkouts
                {selectedTeam && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedTeam}
                  </Badge>
                )}
                {!selectedTeam && normalizedUserTeams.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    All ({normalizedUserTeams.length})
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search teams..." />
                <CommandList>
                  <CommandEmpty>No teams found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        goToActiveView("team");
                        setSelectedTeam(null);
                        setViewMode("team");
                        setTeamFilterOpen(false);
                      }}
                      className="flex items-center justify-between"
                    >
                      <span>All Teams</span>
                      {!selectedTeam && <CheckCircle className="h-4 w-4" />}
                    </CommandItem>
                    {normalizedUserTeams.map((team) => (
                      <CommandItem
                        key={team}
                        onSelect={() => {
                          goToActiveView("team");
                          setSelectedTeam(team);
                          setViewMode("team");
                          setTeamFilterOpen(false);
                        }}
                        className="flex items-center justify-between"
                      >
                        <span>{team}</span>
                        {selectedTeam === team && <CheckCircle className="h-4 w-4" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <Button
            variant={viewMode === "team" ? "default" : "outline"}
            onClick={() => {
              goToActiveView("team");
              setViewMode("team");
            }}
            className="flex-1 sm:flex-initial"
            disabled={normalizedUserTeams.length === 0}
          >
            Team Checkouts
            {normalizedUserTeams.length === 0 && (
              <Badge variant="secondary" className="ml-2">
                No teams
              </Badge>
            )}
          </Button>
        )}
        <Button
          variant={viewMode === "returned" ? "default" : "outline"}
          onClick={goToReturnedView}
          className="flex-1 sm:flex-initial"
        >
          Returned
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
        {viewMode !== "returned" && (
          mounted ? (
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
          )
        )}
        {(statusFilter !== "all" || searchQuery || selectedTeam) && viewMode !== "returned" && (
          <Button variant="ghost" onClick={clearFilters} className="w-full sm:w-auto">
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Selected Filter Display */}
      <div className="flex flex-wrap gap-2">
        {statusFilter !== "all" && viewMode !== "returned" && (
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setStatusFilter("all")}
          >
            {getStatusLabel(statusFilter)}
            <X className="ml-1 h-3 w-3" />
          </Badge>
        )}
        {selectedTeam && viewMode === "team" && (
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setSelectedTeam(null)}
          >
            Team: {selectedTeam}
            <X className="ml-1 h-3 w-3" />
          </Badge>
        )}
      </div>

      {/* Team Info */}
      {viewMode === "team" && (
        <div className="text-xs text-muted-foreground p-2 bg-muted rounded-md">
          {normalizedUserTeams.length === 0 ? (
            <span className="text-amber-600 dark:text-amber-400">
              ⚠️ You have no teams assigned. Teams are fetched from GitHub during login.
            </span>
          ) : (
            <span>
              {selectedTeam 
                ? `Showing checkouts from team: ${selectedTeam}`
                : `Showing checkouts from all your teams: ${normalizedUserTeams.join(", ")}`
              }
            </span>
          )}
        </div>
      )}

      {/* Results Count and Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          {isPaginated && totalCount != null
            ? (totalCount === 0
                ? "Showing 0 checkouts"
                : `Showing ${(currentPage - 1) * (pageSize ?? 10) + 1}-${Math.min(currentPage * (pageSize ?? 10), totalCount)} of ${totalCount} checkout${totalCount !== 1 ? "s" : ""}`)
            : viewMode === "yours"
            ? `Showing ${filteredAndSortedCheckouts.length} of your checkout${filteredAndSortedCheckouts.length !== 1 ? "s" : ""}`
            : viewMode === "everyone"
            ? `Showing ${filteredAndSortedCheckouts.length} checkout${filteredAndSortedCheckouts.length !== 1 ? "s" : ""}`
            : viewMode === "returned"
            ? `Showing ${filteredAndSortedCheckouts.length} returned checkout${filteredAndSortedCheckouts.length !== 1 ? "s" : ""}`
            : selectedTeam
            ? `Showing ${filteredAndSortedCheckouts.length} checkout${filteredAndSortedCheckouts.length !== 1 ? "s" : ""} from ${selectedTeam}`
            : `Showing ${filteredAndSortedCheckouts.length} team checkout${filteredAndSortedCheckouts.length !== 1 ? "s" : ""} from all your teams`}
        </div>
        {isPaginated && basePath && totalCount != null && totalCount > 0 && (
          <div className="flex items-center gap-2">
            {currentPage > 1 ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildPageUrl(currentPage - 1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {Math.max(1, Math.ceil(totalCount / (pageSize ?? 10)))}
            </span>
            {currentPage < Math.ceil(totalCount / (pageSize ?? 10)) ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={buildPageUrl(currentPage + 1)}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {filteredAndSortedCheckouts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {viewMode === "returned"
            ? "No returned checkouts found."
            : viewMode === "yours"
            ? "You have no checkouts matching the selected filters."
            : viewMode === "everyone"
            ? "No checkouts found matching the selected filters."
            : normalizedUserTeams.length === 0
            ? "You have no teams assigned. Teams are fetched from GitHub during login. Please check that GITHUB_ORG_NAME is set and you've logged in recently."
            : selectedTeam
            ? `No checkouts found for team "${selectedTeam}".`
            : "No team checkouts found. This means no other users in your teams have any checkouts."}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table className="[&>div]:overflow-visible">
            <TableHeader className="bg-background [&_tr]:border-b">
                <TableRow>
                  <TableHead className="w-[80px] py-2">Image</TableHead>
                  <TableHead className="py-2">Item Name</TableHead>
                  {(viewMode === "everyone" || viewMode === "team" || viewMode === "returned") && (
                    <TableHead className="py-2">Recipient</TableHead>
                  )}
                  <TableHead className="py-2">Quantity</TableHead>
                  <TableHead className="py-2">Status</TableHead>
                  <TableHead className="py-2">Checkout Date</TableHead>
                  <TableHead className="py-2">Expected Return</TableHead>
                  <TableHead className="py-2">Returned Date</TableHead>
                  {viewMode === "yours" && <TableHead className="w-[100px] py-2">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredAndSortedCheckouts.map((checkout) => (
                <TableRow
                  key={checkout.id}
                  className={checkout.returned_date ? "opacity-75" : undefined}
                >
                  <TableCell className="py-2">
                    {checkout.image_URL ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageClick(checkout);
                        }}
                        className="relative h-12 w-12 overflow-hidden rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background cursor-pointer"
                      >
                        <img
                          src={checkout.image_URL}
                          alt={checkout.item_name}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                        <Package className="h-4 w-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium py-2">
                    <Link
                      href={`/items/${checkout.item_id}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {checkout.item_name}
                    </Link>
                  </TableCell>
                  {(viewMode === "everyone" || viewMode === "team" || viewMode === "returned") && (
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{checkout.recipient_full_name}</span>
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
              </TableBody>
            </Table>
        </div>
      )}

      {/* Bottom Pagination (like inventory) */}
      {isPaginated && basePath && totalCount != null && totalCount > 0 && (() => {
        const totalPages = Math.max(1, Math.ceil(totalCount / (pageSize ?? 10)));
        return totalPages > 1 ? (
          <div className="flex justify-center mt-4">
            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Button variant="outline" size="sm" asChild className="h-8 w-8 p-0">
                  <Link href={buildPageUrl(currentPage - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous page</span>
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled className="h-8 w-8 p-0">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
              )}
              <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                {currentPage} of {totalPages}
              </span>
              {currentPage < totalPages ? (
                <Button variant="outline" size="sm" asChild className="h-8 w-8 p-0">
                  <Link href={buildPageUrl(currentPage + 1)}>
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next page</span>
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled className="h-8 w-8 p-0">
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              )}
            </div>
          </div>
        ) : null;
      })()}

      {/* Image Preview Dialog (like inventory table) */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-3xl" showCloseButton>
          {selectedImageItem && selectedImageItem.image_URL && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedImageItem.item_name}</DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImageItem.image_URL}
                  alt={selectedImageItem.item_name}
                  className="max-h-[70vh] max-w-full rounded-md object-contain"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

