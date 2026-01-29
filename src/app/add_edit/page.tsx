"use client";

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

import { useUser } from "@/contexts/UserContext";
import { TagSelector } from "@/components/TagSelector";
import { TagOption } from "@/hooks/useTagSelector";

/**
 * Fetches all tags from the Supabase 'tags' table.
 * @returns {Promise<TagOption[]>}
 */
const fetchAllTags = async (): Promise<TagOption[]> => {
  const supabase = createClient();
  // Actual Supabase call:
  // Ensure your 'tags' table has 'id' (UUID/Text) and 'name' (Text) columns
  const { data, error } = await supabase.from("tags").select("id, name");

  if (error) {
    throw error;
  }
  // Supabase returns an array of objects matching the {id: string, name: string} format
  return data as TagOption[];
};

type ItemData = {
  id: string;
  name: string;
  image?: File | null;
  notes: string;
  quantity: number;
  tags: string[];
};

export default function AddItemPage() {
  const router = useRouter();
  const { user, loading } = useUser();
  const profileID = "";

  // Use an array for tags
  const [formData, setFormData] = useState<ItemData>({
    id: "",
    name: "",
    image: null,
    notes: "",
    quantity: 0,
    tags: [],
  });

  // No longer need to load profile ID - RPC functions handle this automatically

  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
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
  }, []);

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

    if (!user) {
      alert("You must be logged in to add an item");
      return;
    }

    if (!formData.name.trim()) {
      alert("Please enter an item name");
      return;
    }

    try {
      setIsSubmitting(true);
      const supabase = createClient();

      // image upload logic (compress before upload to reduce storage & egress)
      let image_URL = null;
      if (formData.image) {
        const { compressImageForUpload } = await import("@/lib/compressImage");
        const toUpload = await compressImageForUpload(formData.image);
        const fileName = `${crypto.randomUUID()}.${toUpload.name.split(".").pop() || "webp"}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("item-images")
          .upload(fileName, toUpload, { contentType: toUpload.type || "image/webp" });

        if (uploadError) {
          alert("Failed to upload image");
          return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("item-images")
          .getPublicUrl(uploadData.path);

        image_URL = urlData.publicUrl;
      }

      // ============================
      // Create item using RPC function
      // ============================
      const { data: itemData, error: itemError } = await supabase.rpc("create_item", {
        p_item_name: formData.name,
        p_quantity: formData.quantity,
        p_notes: formData.notes || null,
        p_image_url: image_URL || null,
      });

      // error should be null if insert was successful
      if (itemError) {
        alert("Failed to add item");
        return;
      }

      // RPC returns array, get first item
      const item = Array.isArray(itemData) ? itemData[0] : itemData;

      // Insert item tags if any were selected
      if (formData.tags.length > 0) {
        const { data: itemTagData, error: itemTagError } = await supabase
          .from("itemtags")
          .insert(
            formData.tags.map((tagId) => ({
              item_id: item.id,
              tag_id: tagId,
            })),
          );

        if (itemTagError) {
          alert("Item added but failed to add tags");
        }
        void itemTagData;
      }

      // ============================
      // Reset form and redirect
      // ============================
      alert("Item added successfully!");

      setFormData({
        id: "",
        name: "",
        image: null,
        notes: "",
        quantity: 0,
        tags: [],
      });

      // Redirect to items page
      router.push("/items");
    } catch {
      alert("An error occurred while adding the item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Add New Item
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Fill in the details below to add a new component.
      </p>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent>
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
              selectedTagIds={formData.tags} // Pass the array of selected IDs
              onTagChange={handleTagsChange} // Pass the handler to update the array
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

            <CardFooter className="px-0">
              <Button type="submit" className="w-full">
                Add Item
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
