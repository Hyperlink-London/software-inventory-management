"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, X, CheckCircle, AlertCircle, XCircle, ShoppingCart, Pencil } from "lucide-react";
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

type ItemWithTags = {
  id: string;
  item_name: string;
  quantity: number;
  notes: string | null;
  image_URL: string | null;
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
};

export function InventoryTable({ items, stickyControls = false, maxHeight = "none", onItemUpdate }: InventoryTableProps) {
  const router = useRouter();
  const [localItems, setLocalItems] = React.useState<ItemWithTags[]>(items);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<ItemWithTags | null>(null);
  const [mounted, setMounted] = React.useState(false);

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
          tag.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Tag filter
      const matchesTags =
        selectedTags.length === 0 ||
        item.tags.some((tag) => selectedTags.includes(tag.name));

      return matchesSearch && matchesTags;
    });
  }, [localItems, searchQuery, selectedTags]);

  const toggleTag = (tagName: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((t) => t !== tagName)
        : [...prev, tagName]
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

  const handleItemUpdate = React.useCallback((updatedItem?: ItemWithTags, deletedItemId?: string) => {
    if (deletedItemId) {
      // Optimistically remove the deleted item
      setLocalItems((prev) => prev.filter((item) => item.id !== deletedItemId));
    } else if (updatedItem) {
      // Optimistically update the item
      setLocalItems((prev) =>
        prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
      );
    }
    
    // Refresh server data in the background without blocking UI
    router.refresh();
    
    if (onItemUpdate) {
      onItemUpdate();
    }
  }, [router, onItemUpdate]);

  const handleCheckout = async (data: {
    item_id: string;
    quantity: number;
    expected_return_date: string;
  }) => {
    await checkoutItem(data);
    // The page will be revalidated by the server action
    window.location.reload();
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
              <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-9 text-base sm:text-sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter by Tags
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[200px] p-0" align="start">
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
          <Button variant="outline" className="w-full sm:w-auto h-10 sm:h-9 text-base sm:text-sm" disabled>
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
          <Button variant="ghost" onClick={clearFilters} className="w-full sm:w-auto h-10 sm:h-9 text-base sm:text-sm">
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

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredItems.length} of {localItems.length} items
      </div>
    </div>
  );

  // Mobile card view component
  const mobileCardView = (
    <div className="space-y-3 sm:hidden">
      {filteredItems.map((item) => (
        <div key={item.id} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-start gap-3">
            {item.image_URL ? (
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-border">
                <img
                  src={item.image_URL}
                  alt={item.item_name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                <span className="text-xs">No image</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-base truncate">{item.item_name}</h3>
                <div className="flex-shrink-0">{getStatusIcon(item.quantity)}</div>
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
                  {item.quantity}
                </span>
              </div>
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
              <p className="text-sm text-muted-foreground line-clamp-2">{item.notes}</p>
            </div>
          )}
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => handleEditClick(item)}
              className="flex-1 h-11 text-sm"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCheckoutClick(item)}
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
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No items found matching your filters.
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          {mobileCardView}
          
          {/* Desktop Table View */}
          <div className="hidden sm:block rounded-md border overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-[100px]">Image</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead className="hidden md:table-cell">Notes</TableHead>
                  <TableHead className="w-[180px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.image_URL ? (
                        <div className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
                          <img
                            src={item.image_URL}
                            alt={item.item_name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                          <span className="text-xs">No image</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {getStatusIcon(item.quantity)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.item_name}</TableCell>
                    <TableCell>
                      <span
                        className={
                          item.quantity === 0
                            ? "text-destructive font-medium"
                            : item.quantity < 5
                            ? "text-yellow-500 font-medium"
                            : ""
                        }
                      >
                        {item.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {item.tags.length > 0 ? (
                          item.tags.map((tag) => (
                            <Badge key={tag.id} variant="secondary">
                              {tag.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No tags</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {item.notes || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(item)}
                          className="flex-1"
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckoutClick(item)}
                          disabled={item.quantity === 0}
                          className="flex-1"
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
    </div>
  );
}

