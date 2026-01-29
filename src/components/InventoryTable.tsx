"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  X,
  CheckCircle,
  AlertCircle,
  XCircle,
  ShoppingCart,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
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
import { CheckoutDialog } from "@/components/CheckoutDialog";
import { EditItemDialog } from "@/components/EditItemDialog";
import { checkoutItem } from "@/actions/checkout/action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OptimizedPreviewImage } from "@/components/OptimizedItemImage";

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

type InventoryTableProps = {
  items: ItemWithTags[];
  stickyControls?: boolean;
  maxHeight?: string;
  onItemUpdate?: () => void;
  userTeams?: string[];
};

const ITEMS_PER_PAGE = 10;

// Reusable image component with loading state
function ItemImage({
  src,
  alt,
  size = "md",
  className = "",
}: {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [isLoading, setIsLoading] = React.useState(true);

  const sizeConfig = {
    sm: { container: "h-16 w-16", sizes: "64px", quality: 60 },
    md: { container: "h-20 w-20", sizes: "80px", quality: 60 },
    lg: { container: "h-24 w-24", sizes: "96px", quality: 65 },
  };

  const config = sizeConfig[size];

  // Reset loading state when src changes
  React.useEffect(() => {
    setIsLoading(true);
  }, [src]);

  return (
    <div className={`relative ${config.container} ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={config.sizes}
        quality={config.quality}
        className="object-cover rounded-md"
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}

export function InventoryTable({
  items,
  stickyControls = false,
  maxHeight = "none",
  onItemUpdate,
  userTeams = [],
}: InventoryTableProps) {
  const router = useRouter();
  const [localItems, setLocalItems] = React.useState<ItemWithTags[]>(items);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<ItemWithTags | null>(
    null,
  );
  const [mounted, setMounted] = React.useState(false);
  const [imageDialogOpen, setImageDialogOpen] = React.useState(false);
  const [selectedImageItem, setSelectedImageItem] =
    React.useState<ItemWithTags | null>(null);
  const [currentPage, setCurrentPage] = React.useState(1);

  // Sync local items with props when they change
  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  // Only render Popover after mount to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Get all unique tags from items
  const allTags = React.useMemo(() => {
    const tagSet = new Set<string>();
    localItems.forEach((item) => {
      item.tags.forEach((tag) => tagSet.add(tag.name));
    });
    return Array.from(tagSet).sort();
  }, [localItems]);

  // Filter items based on search and tags
  const filteredItems = React.useMemo(() => {
    return localItems.filter((item) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((tag) =>
          tag.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      // Tag filter
      const matchesTags =
        selectedTags.length === 0 ||
        item.tags.some((tag) => selectedTags.includes(tag.name));

      return matchesSearch && matchesTags;
    });
  }, [localItems, searchQuery, selectedTags]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTags]);

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName],
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSearchQuery("");
  };

  const getStatusIcon = (quantity: number) => {
    if (quantity === 0) {
      return (
        <div title="Out of Stock">
          <XCircle className="h-4 w-4 text-destructive" />
        </div>
      );
    } else if (quantity < 5) {
      return (
        <div title="Low Stock">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        </div>
      );
    } else {
      return (
        <div title="In Stock">
          <CheckCircle className="h-4 w-4 text-green-500" />
        </div>
      );
    }
  };

  const handleCheckoutClick = (item: ItemWithTags) => {
    setSelectedItem(item);
    setCheckoutDialogOpen(true);
  };

  const handleEditClick = (item: ItemWithTags) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const navigateToItemDetail = (itemId: string) => {
    router.push(`/items/${itemId}`);
  };

  const handleImageClick = (item: ItemWithTags) => {
    if (!item.image_URL) return;
    setSelectedImageItem(item);
    setImageDialogOpen(true);
  };

  const handleItemUpdate = React.useCallback(
    (updatedItem?: ItemWithTags, deletedItemId?: string) => {
      if (deletedItemId) {
        // Optimistically remove the deleted item
        setLocalItems((prev) =>
          prev.filter((item) => item.id !== deletedItemId),
        );
      } else if (updatedItem) {
        // Optimistically update the item
        setLocalItems((prev) =>
          prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
        );
      }

      // Refresh server data in the background without blocking UI
      router.refresh();

      if (onItemUpdate) {
        onItemUpdate();
      }
    },
    [router, onItemUpdate],
  );

  const handleCheckout = async (data: {
    item_id: string;
    quantity: number;
    expected_return_date: string;
  }) => {
    await checkoutItem(data);
    // Refresh server data without full page reload
    router.refresh();
  };

  const controlsSection = (
    <div className="space-y-3 sm:space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search items, tags, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 sm:h-9 text-base sm:text-sm"
          />
        </div>
        {mounted ? (
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto h-10 sm:h-9 text-base sm:text-sm"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filter by Tags
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[calc(100vw-2rem)] sm:w-[200px] p-0"
              align="start"
            >
              <Command>
                <CommandInput placeholder="Search tags..." />
                <CommandList>
                  <CommandEmpty>No tags found.</CommandEmpty>
                  <CommandGroup>
                    {allTags.map((tag) => (
                      <CommandItem
                        key={tag}
                        onSelect={() => toggleTag(tag)}
                        className="flex items-center justify-between"
                      >
                        <span>{tag}</span>
                        {selectedTags.includes(tag) && (
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
          <Button
            variant="outline"
            className="w-full sm:w-auto h-10 sm:h-9 text-base sm:text-sm"
            disabled
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter by Tags
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
        )}
        {(selectedTags.length > 0 || searchQuery) && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="w-full sm:w-auto h-10 sm:h-9 text-base sm:text-sm"
          >
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggleTag(tag)}
            >
              {tag}
              <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {/* Results Count and Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedItems.length > 0 ? startIndex + 1 : 0}–{Math.min(endIndex, filteredItems.length)} of {filteredItems.length} items
          {filteredItems.length !== localItems.length && ` (${localItems.length} total)`}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <span className="text-sm text-muted-foreground min-w-[80px] text-center">
              {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  // Mobile card view component
  const mobileCardView = (
    <div className="space-y-3 sm:hidden">
      {paginatedItems.map((item) => (
        <div
          key={item.id}
          className="rounded-lg border p-4 space-y-3 cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={() => navigateToItemDetail(item.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigateToItemDetail(item.id);
            }
          }}
        >
          <div className="flex items-start gap-3">
            {item.image_URL ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleImageClick(item);
                }}
                className="flex-shrink-0 overflow-hidden rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              >
                <ItemImage
                  src={item.image_URL}
                  alt={item.item_name}
                  size="md"
                />
              </button>
            ) : (
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                <span className="text-xs">No image</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-base truncate hover:underline">
                  {item.item_name}
                </span>
                <div className="flex-shrink-0">
                  {getStatusIcon(item.quantity)}
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Quantity:</span>
                <span
                  className={
                    item.quantity === 0
                      ? "text-destructive font-semibold"
                      : item.quantity < 5
                        ? "text-yellow-500 font-semibold"
                        : "font-semibold"
                  }
                >
                  {item.quantity} / {item.quantity + item.checked_out_quantity}
                </span>
              </div>
              {item.created_by_name && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Logged by:</span>
                  <span className="text-sm">{item.created_by_name}</span>
                </div>
              )}
            </div>
          </div>

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="text-xs">
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {item.notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notes:</p>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {item.notes}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick(item);
              }}
              className="flex-1 h-11 text-sm"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                handleCheckoutClick(item);
              }}
              disabled={item.quantity === 0}
              className="flex-1 h-11 text-sm"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Checkout
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  const tableSection = (
    <>
      {paginatedItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No items found matching your filters.
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          {mobileCardView}

          {/* Desktop Table View */}
          <div className="hidden sm:block rounded-md border overflow-x-auto">
            <Table style={{ tableLayout: 'fixed', width: '100%' }}>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead style={{ width: '80px' }}>Image</TableHead>
                  <TableHead style={{ width: '250px' }}>Item Name</TableHead>
                  <TableHead style={{ width: '80px' }}>Qty</TableHead>
                  <TableHead style={{ width: '150px' }}>Tags</TableHead>
                  <TableHead style={{ width: '130px' }}>Logged by</TableHead>
                  <TableHead className="hidden lg:table-cell">Notes</TableHead>
                  <TableHead style={{ width: '200px' }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => navigateToItemDetail(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigateToItemDetail(item.id);
                      }
                    }}
                    tabIndex={0}
                  >
                    <TableCell>
                      {item.image_URL ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleImageClick(item);
                          }}
                          className="overflow-hidden rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                        >
                          <ItemImage
                            src={item.image_URL}
                            alt={item.item_name}
                            size="sm"
                          />
                        </button>
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                          <span className="text-xs">No image</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium" style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span className="hover:underline" title={item.item_name}>{item.item_name}</span>
                    </TableCell>
                    <TableCell style={{ whiteSpace: 'nowrap' }}>
                      <span
                        className={
                          item.quantity === 0
                            ? "text-destructive font-medium"
                            : item.quantity < 5
                              ? "text-yellow-500 font-medium"
                              : ""
                        }
                      >
                        {item.quantity} / {item.quantity + item.checked_out_quantity}
                      </span>
                    </TableCell>
                    <TableCell className="overflow-hidden">
                      <div className="flex flex-wrap gap-1 overflow-hidden">
                        {item.tags.length > 0 ? (
                          item.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag.id} variant="secondary" className="text-xs">
                              {tag.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No tags
                          </span>
                        )}
                        {item.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground" style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span title={item.created_by_name || undefined}>
                        {item.created_by_name || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span title={item.notes || undefined}>
                        {item.notes || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-0">
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(item);
                          }}
                          className="w-full"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckoutClick(item);
                          }}
                          disabled={item.quantity === 0}
                          className="w-full"
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Checkout
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Bottom Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <span className="text-sm text-muted-foreground min-w-[80px] text-center">
                  {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );

  if (stickyControls) {
    return (
      <div className="flex flex-col" style={{ maxHeight }}>
        <div className="sticky top-0 z-20 pb-4 border-b mb-4">
          {controlsSection}
        </div>
        <div className="overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-1">
          {tableSection}
        </div>
        {/* Checkout Dialog */}
        <CheckoutDialog
          open={checkoutDialogOpen}
          onOpenChange={setCheckoutDialogOpen}
          item={selectedItem}
          onCheckout={handleCheckout}
        />
        {/* Edit Item Dialog */}
        <EditItemDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          item={selectedItem}
          onSuccess={handleItemUpdate}
        />
        {/* Image Preview Dialog */}
        <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
          <DialogContent className="max-w-3xl" showCloseButton>
            {selectedImageItem && selectedImageItem.image_URL && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedImageItem.item_name}</DialogTitle>
                </DialogHeader>
                <div className="mt-2">
                  <OptimizedPreviewImage
                    src={selectedImageItem.image_URL}
                    alt={selectedImageItem.item_name}
                  />
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {controlsSection}
      {tableSection}
      {/* Checkout Dialog */}
      <CheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        item={selectedItem}
        onCheckout={handleCheckout}
      />
      {/* Edit Item Dialog */}
      <EditItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        item={selectedItem}
        onSuccess={handleItemUpdate}
      />
      {/* Image Preview Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-3xl" showCloseButton>
          {selectedImageItem && selectedImageItem.image_URL && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedImageItem.item_name}</DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                <OptimizedPreviewImage
                  src={selectedImageItem.image_URL}
                  alt={selectedImageItem.item_name}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
