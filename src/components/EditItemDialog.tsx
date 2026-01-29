"use client";

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TagSelector } from "@/components/TagSelector";
import { TagOption } from "@/hooks/useTagSelector";
import { OptimizedItemImage } from "@/components/OptimizedItemImage";
import { Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { createTag } from "@/actions/items/action";
import { deleteItem } from "@/actions/items/action";

/**
 * Fetches all tags from the Supabase 'tags' table.
 */
const fetchAllTags = async (): Promise<TagOption[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.from("tags").select("id, name");

  if (error) {
    throw error;
  }
  return data as TagOption[];
};

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

type ItemData = {
  name: string;
  image?: File | null;
  notes: string;
  quantity: number;
  tags: string[];
  existingImageUrl: string | null;
};

type EditItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemWithTags | null;
  onSuccess?: (updatedItem?: ItemWithTags, deletedItemId?: string) => void;
};

export function EditItemDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: EditItemDialogProps) {
  const [formData, setFormData] = useState<ItemData>({
    name: "",
    image: null,
    notes: "",
    quantity: 0,
    tags: [],
    existingImageUrl: null,
  });

  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Load item data when dialog opens
  useEffect(() => {
    if (open && item) {
      setFormData({
        name: item.item_name,
        image: null,
        notes: item.notes || "",
        quantity: item.quantity,
        tags: item.tags.map((tag) => tag.id),
        existingImageUrl: item.image_URL,
      });
    }
  }, [open, item]);

  // Load tags when dialog opens
  useEffect(() => {
    if (open) {
      const loadTags = async () => {
        try {
          setIsLoadingTags(true);
          const data = await fetchAllTags();
          setAvailableTags(data);
        } catch {
          // Failed to load tags
        } finally {
          setIsLoadingTags(false);
        }
      };

      loadTags();
    }
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        name: "",
        image: null,
        notes: "",
        quantity: 0,
        tags: [],
        existingImageUrl: null,
      });
      setDeleteConfirmOpen(false);
    }
  }, [open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    // Handle quantity conversion
    const processedValue = name === "quantity" ? parseInt(value) || 0 : value;

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }));
  };

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;

    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      e.target.value = ""; // Clear invalid file
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      alert("Image must be under 2MB.");
      e.target.value = ""; // Clear invalid file
      return;
    }

    // Passed validation
    setFormData((prev) => ({
      ...prev,
      image: file,
    }));
  };

  const handleTagsChange = (newTagIds: string[]) => {
    setFormData((prev) => ({
      ...prev,
      tags: newTagIds,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!item) return;

    if (!formData.name.trim()) {
      toast.error("Please enter an item name");
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = createClient();

      // Handle image upload if a new image was selected
      let image_URL = formData.existingImageUrl;
      if (formData.image) {
        // Delete old image if it exists using RPC function
        if (formData.existingImageUrl) {
          try {
            const { data: deleteResult, error: deleteError } = await supabase.rpc("delete_image_from_storage", {
              p_image_url: formData.existingImageUrl
            });
            
            // Continue with upload regardless of delete result
            void deleteError;
            void deleteResult;
          } catch {
            // Continue with upload even if delete fails
          }
        }

        // Upload new image (compress before upload to reduce storage & egress)
        const { compressImageForUpload } = await import("@/lib/compressImage");
        const toUpload = await compressImageForUpload(formData.image);
        const fileName = `${crypto.randomUUID()}.${toUpload.name.split(".").pop() || "webp"}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("item-images")
          .upload(fileName, toUpload, { contentType: toUpload.type || "image/webp" });

        if (uploadError) {
          toast.error("Failed to upload image");
          return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("item-images")
          .getPublicUrl(uploadData.path);

        image_URL = urlData.publicUrl;
      }

      // Update item using RPC function
      const rpcParams = {
        p_item_id: item.id,
        p_item_name: formData.name,
        p_quantity: formData.quantity,
        p_notes: formData.notes || null,
        p_image_url: image_URL || null,
        p_verify_ownership: false, // Set to true if you want to restrict updates to creator only
      };
      
      const { data: updatedItemData, error: itemError } = await supabase.rpc("update_item", rpcParams);

      if (itemError) {
        // Empty error object usually means function doesn't exist or permission issue
        if (Object.keys(itemError).length === 0) {
          toast.error("Failed to update item: RPC function error. Please check if 'update_item' function exists in Supabase.");
        } else {
          const errorMessage = itemError.message || itemError.details || itemError.hint || "Unknown error occurred";
          toast.error(`Failed to update item: ${errorMessage}`);
        }
        return;
      }
      
      void updatedItemData;

      // Delete existing item tags
      await supabase.from("itemtags").delete().eq("item_id", item.id);

      // Insert new item tags if any were selected
      if (formData.tags.length > 0) {
        // Ensure all tags exist in the tags table
        const tagIdsToLink: string[] = [];

        for (const tagIdOrName of formData.tags) {
          const existingTag = availableTags.find((t) => t.id === tagIdOrName);

          if (existingTag) {
            tagIdsToLink.push(existingTag.id);
          } else {
            // Create new tag using server action (calls RPC function server-side)
            try {
              const newTag = await createTag({ name: tagIdOrName });
              if (newTag && newTag.id) {
                tagIdsToLink.push(newTag.id);
              }
            } catch {
              // Try to find if tag was created by another process
              const { data: foundTag } = await supabase
                .from("tags")
                .select("id")
                .eq("name", tagIdOrName)
                .single();

              if (foundTag) {
                tagIdsToLink.push(foundTag.id);
              }
            }
          }
        }

        // Insert new item-tag relationships
        if (tagIdsToLink.length > 0) {
          const { error: itemTagError } = await supabase
            .from("itemtags")
            .insert(
              tagIdsToLink.map((tagId) => ({
                item_id: item.id,
                tag_id: tagId,
              })),
            );

          if (itemTagError) {
            toast.warning("Item updated but failed to update tags");
          }
        }
      }

      // Fetch updated item with tags for optimistic update
      const { data: itemWithTagsData } = await supabase
        .from("items")
        .select(
          `
          id,
          item_name,
          quantity,
          notes,
          image_URL,
          created_by,
          creator:profiles!items_created_by_fkey(
            full_name,
            username
          ),
          itemtags(
            tags(
              id,
              name
            )
          )
        `,
        )
        .eq("id", item.id)
        .single();

      // Fetch active checkouts to calculate checked out quantity
      const { data: activeCheckouts } = await supabase
        .from("itemsignouts")
        .select("quantity")
        .eq("item_id", item.id)
        .is("returned_date", null)
        .is("deleted_at", null);

      const checkedOutQuantity = activeCheckouts?.reduce((sum, checkout) => sum + checkout.quantity, 0) || 0;

      let updatedItem: ItemWithTags | undefined;
      if (itemWithTagsData) {
        updatedItem = {
          id: itemWithTagsData.id,
          item_name: itemWithTagsData.item_name,
          quantity: itemWithTagsData.quantity,
          checked_out_quantity: checkedOutQuantity,
          notes: itemWithTagsData.notes,
          image_URL: itemWithTagsData.image_URL,
          created_by: itemWithTagsData.created_by,
          created_by_name: (itemWithTagsData as any).creator?.full_name || (itemWithTagsData as any).creator?.username || null,
          tags: (itemWithTagsData.itemtags || [])
            .filter(
              (it: any) => it.tags && !it.tags.deleted_at && !it.deleted_at,
            )
            .map((it: any) => ({
              id: it.tags.id,
              name: it.tags.name,
            })),
        };
      }

      toast.success("Item updated successfully!");
      onOpenChange(false);

      if (onSuccess) {
        onSuccess(updatedItem);
      }
    } catch {
      toast.error("An error occurred while updating the item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!item) return;

    setDeleteConfirmOpen(false);

    try {
      setIsDeleting(true);
      
      // Use server action to delete item (handles image deletion and database deletion)
      await deleteItem(item.id);

      toast.success("Item deleted successfully!");
      onOpenChange(false);

      if (onSuccess) {
        onSuccess(undefined, item.id);
      }
    } catch (error) {
      toast.error(`Failed to delete item: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto w-[calc(100vw-1rem)] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update the item details below. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              name="name"
              placeholder="Enter item name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label htmlFor="edit-image">Image</Label>
            {formData.existingImageUrl && !formData.image && (
              <div className="mb-2">
                <OptimizedItemImage
                  src={formData.existingImageUrl}
                  alt={formData.name}
                  size="xl"
                  className="rounded-md border"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Current image
                </p>
              </div>
            )}
            <Input
              id="edit-image"
              type="file"
              name="image"
              onChange={handleFileChange}
              accept="image/*"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to keep current image, or select a new image to
              replace it.
            </p>
          </div>

          {/* Tags Selector */}
          <TagSelector
            selectedTagIds={formData.tags}
            onTagChange={handleTagsChange}
            availableTags={availableTags}
          />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              name="notes"
              placeholder="Additional details about the item..."
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="edit-quantity">Quantity</Label>
            <Input
              id="edit-quantity"
              type="number"
              name="quantity"
              placeholder="0"
              value={formData.quantity}
              onChange={handleChange}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={isSubmitting || isDeleting}
              className="w-full sm:w-auto h-11 sm:h-10"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Item
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isDeleting}
                className="flex-1 sm:flex-initial h-11 sm:h-10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className="flex-1 sm:flex-initial h-11 sm:h-10"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md w-[calc(100vw-1rem)] sm:w-full p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Delete Item</DialogTitle>
                <DialogDescription className="mt-1">
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                "{item?.item_name}"
              </span>
              ? This will permanently remove the item and all associated data
              from the system.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
              className="w-full sm:w-auto h-11 sm:h-10"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="w-full sm:w-auto h-11 sm:h-10"
            >
              {isDeleting ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Item
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
