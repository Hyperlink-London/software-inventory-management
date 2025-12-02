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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Fetches all tags from the Supabase 'tags' table.
 */
const fetchAllTags = async (): Promise<TagOption[]> => {
  const supabase = createClient();
  const { data, error } = await supabase.from("tags").select("id, name");

  if (error) {
    console.error("Error fetching tags:", error);
    throw error;
  }
  return data as TagOption[];
};

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

export function EditItemDialog({ open, onOpenChange, item, onSuccess }: EditItemDialogProps) {
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
        } catch (error) {
          console.error("Failed to load available tags:", error);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
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
        const fileName = `${crypto.randomUUID()}-${formData.image.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("item-images")
          .upload(fileName, formData.image);

        if (uploadError) {
          console.error("Image upload failed:", uploadError);
          toast.error("Failed to upload image");
          return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("item-images")
          .getPublicUrl(uploadData.path);

        image_URL = urlData.publicUrl;
      }

      // Update item
      const { data: updatedItemData, error: itemError } = await supabase
        .from("items")
        .update({
          item_name: formData.name,
          quantity: formData.quantity,
          notes: formData.notes,
          image_URL: image_URL,
        })
        .eq("id", item.id)
        .select()
        .single();

      if (itemError) {
        console.error("Update failed:", itemError);
        toast.error("Failed to update item");
        return;
      }

      // Delete existing item tags
      await supabase
        .from("itemtags")
        .delete()
        .eq("item_id", item.id);

      // Insert new item tags if any were selected
      if (formData.tags.length > 0) {
        // Ensure all tags exist in the tags table
        const tagIdsToLink: string[] = [];
        
        for (const tagIdOrName of formData.tags) {
          const existingTag = availableTags.find(t => t.id === tagIdOrName);
          
          if (existingTag) {
            tagIdsToLink.push(existingTag.id);
          } else {
            // Create new tag
            const { data: newTagData, error: newTagError } = await supabase
              .from("tags")
              .insert([{ name: tagIdOrName }])
              .select()
              .single();
            
            if (newTagError) {
              console.error("Failed to create new tag:", newTagError);
              const { data: foundTag } = await supabase
                .from("tags")
                .select("id")
                .eq("name", tagIdOrName)
                .single();
              
              if (foundTag) {
                tagIdsToLink.push(foundTag.id);
              }
            } else {
              tagIdsToLink.push(newTagData.id);
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
            console.error("Inserting item tags failed:", itemTagError);
            toast.warning("Item updated but failed to update tags");
          }
        }
      }

      // Fetch updated item with tags for optimistic update
      const { data: itemWithTagsData } = await supabase
        .from("items")
        .select(`
          id,
          item_name,
          quantity,
          notes,
          image_URL,
          itemtags(
            tags(
              id,
              name
            )
          )
        `)
        .eq("id", item.id)
        .single();

      let updatedItem: ItemWithTags | undefined;
      if (itemWithTagsData) {
        updatedItem = {
          id: itemWithTagsData.id,
          item_name: itemWithTagsData.item_name,
          quantity: itemWithTagsData.quantity,
          notes: itemWithTagsData.notes,
          image_URL: itemWithTagsData.image_URL,
          tags: (itemWithTagsData.itemtags || [])
            .filter((it: any) => it.tags && !it.tags.deleted_at && !it.deleted_at)
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
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("An error occurred while updating the item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    const confirmed = confirm(
      `Are you sure you want to delete "${item.item_name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setIsDeleting(true);
      const supabase = createClient();

      // First, delete all related itemtags
      const { error: itemTagsError } = await supabase
        .from("itemtags")
        .delete()
        .eq("item_id", item.id);

      if (itemTagsError) {
        console.error("Failed to delete item tags:", itemTagsError);
        // Continue with item deletion even if tags fail
      }

      // Hard delete the item from the database
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", item.id);

      if (error) {
        console.error("Delete failed:", error);
        toast.error("Failed to delete item");
        return;
      }

      toast.success("Item deleted successfully!");
      onOpenChange(false);
      
      if (onSuccess) {
        onSuccess(undefined, item.id);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("An error occurred while deleting the item");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                <img
                  src={formData.existingImageUrl}
                  alt={formData.name}
                  className="h-32 w-32 object-cover rounded-md border"
                />
                <p className="text-xs text-muted-foreground mt-1">Current image</p>
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
              Leave empty to keep current image, or select a new image to replace it.
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
              onClick={handleDelete}
              disabled={isSubmitting || isDeleting}
              className="w-full sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete Item"}
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting || isDeleting}
                className="flex-1 sm:flex-initial"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || isDeleting} className="flex-1 sm:flex-initial">
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

