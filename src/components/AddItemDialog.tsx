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
import { useUser } from "@/contexts/UserContext";
import { TagSelector } from "@/components/TagSelector";
import { TagOption } from "@/hooks/useTagSelector";
import { toast } from "sonner";
import { createItem, createTag } from "@/actions/items/action";

/**
 * Fetches all tags from the Supabase 'tags' table.
 * @returns {Promise<TagOption[]>}
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

type ItemData = {
  name: string;
  image?: File | null;
  notes: string;
  quantity: number;
  tags: string[];
};

type AddItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function AddItemDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddItemDialogProps) {
  const { user, loading } = useUser();

  const [formData, setFormData] = useState<ItemData>({
    name: "",
    image: null,
    notes: "",
    quantity: 0,
    tags: [],
  });

  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // No longer need to load profile ID - RPC functions handle this automatically

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

    if (!user) {
      toast.error("You must be logged in to add an item");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Please enter an item name");
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = createClient();

      console.log("Submitting form:", formData);

      // image upload logic
      let image_URL = null;
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

      // ============================
      // Create item using server action (calls RPC function server-side)
      // ============================
      let item;
      try {
        item = await createItem({
          name: formData.name,
          quantity: formData.quantity,
          notes: formData.notes || null,
          image_url: image_URL || null,
        });
      } catch (err) {
        console.error("Failed to create item:", err);
        toast.error(`Failed to add item: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }

      // Insert item tags if any were selected
      if (formData.tags.length > 0) {
        // First, ensure all tags exist in the tags table
        // Tags that are IDs already exist, tags that are names need to be created
        const tagIdsToLink: string[] = [];

        for (const tagIdOrName of formData.tags) {
          // Check if it's an existing tag ID (UUID format) or a new tag name
          const existingTag = availableTags.find((t) => t.id === tagIdOrName);

          if (existingTag) {
            // It's an existing tag ID, use it directly
            tagIdsToLink.push(existingTag.id);
          } else {
            // It's a new tag name, create it using server action (calls RPC function server-side)
            try {
              const newTag = await createTag({ name: tagIdOrName });
              if (newTag && newTag.id) {
                tagIdsToLink.push(newTag.id);
              }
            } catch (err) {
              console.error("Failed to create new tag:", err);
              // Try to find if tag was created by another process
              const { data: foundTag } = await supabase
                .from("tags")
                .select("id")
                .eq("name", tagIdOrName)
                .single();

              if (foundTag) {
                tagIdsToLink.push(foundTag.id);
              } else {
                console.error("Could not create or find tag:", tagIdOrName);
              }
            }
          }
        }

        // Now insert the item-tag relationships
        if (tagIdsToLink.length > 0) {
          const { data: itemTagData, error: itemTagError } = await supabase
            .from("itemtags")
            .insert(
              tagIdsToLink.map((tagId) => ({
                item_id: item.id,
                tag_id: tagId,
              })),
            );

          if (itemTagError) {
            console.error("Inserting item tags failed:", itemTagError);
            toast.warning("Item added but failed to add tags");
          } else {
            console.log("Item tags inserted:", itemTagData);
          }
        }
      }

      // ============================
      // Reset form and close dialog
      // ============================
      toast.success("Item added successfully!");

      setFormData({
        name: "",
        image: null,
        notes: "",
        quantity: 0,
        tags: [],
      });

      onOpenChange(false);

      // Call onSuccess callback to refresh the page
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An error occurred while adding the item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto w-[calc(100vw-1rem)] sm:w-full p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new component.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter item name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* Image */}
          <div className="space-y-2">
            <Label htmlFor="image">Image</Label>
            <Input
              id="image"
              type="file"
              name="image"
              onChange={handleFileChange}
              accept="image/*"
            />
          </div>

          {/* Tags Selector (Multi-Select) */}
          <TagSelector
            selectedTagIds={formData.tags}
            onTagChange={handleTagsChange}
            availableTags={availableTags}
          />

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional details about the item..."
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
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
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-11 sm:h-10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto h-11 sm:h-10"
            >
              {isSubmitting ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
