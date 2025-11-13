'use client'

import { supabase } from "@/lib/supabaseClient"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

// NOTE: useTagsData is no longer needed directly in the parent component
// but we leave the import here for consistency if it's used elsewhere.
import { useTagsData } from "@/hooks/useTagsData" 
import { TagSelector } from '@/components/TagSelector'; // The component that was giving errors

// 1. UPDATED TYPE: Use an array for tags
type ItemData = {
  name: string
  image?: File | null
  notes: string
  quantity: number
  tags: string[] // Changed from tagId: string | null to array of strings
}

export default function AddItemPage() {
  // 2. UPDATED STATE INITIALIZATION: Use an array for tags
  const [formData, setFormData] = useState<ItemData>({
    name: "",
    image: null,
    notes: "",
    quantity: 0,
    tags: [], // Initialize as an empty array
  })

  // We don't need 'tags' or 'loading' state here since TagSelector handles it internally
  // But we keep the hook call if 'loading' is used elsewhere in the page (it wasn't in your original combobox)
  const { loading } = useTagsData() 
  
  // Removed unused 'open' state

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target

    // Handle quantity conversion
    const processedValue = name === 'quantity' ? parseInt(value) || 0 : value;

    setFormData((prev) => ({
      ...prev,
      [name]: processedValue,
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null
    setFormData((prev) => ({
      ...prev,
      image: file,
    }))
  }

  // 3. DEFINED NEW TAG HANDLER: for the multi-select component
  const handleTagsChange = (newTagIds: string[]) => {
    setFormData((prev) => ({
      ...prev,
      tags: newTagIds,
    }))
  }
  // Removed old handleTagSelect function

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Submitting form:", formData)
    // TODO: Add Supabase insertion logic here
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Add New Item
      </h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Fill in the details below to add a new component.
      </p>

      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Add Component</CardTitle>
          <CardDescription>
            Enter item details, upload an image, and specify quantity.
          </CardDescription>
        </CardHeader>

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
                Add Component
              </Button>
            </CardFooter>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}