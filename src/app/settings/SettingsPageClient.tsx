"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { deleteTag } from "@/actions/items/action";
import { toast } from "sonner";

type TagRow = { id: string; name: string };

export function SettingsPageClient({ initialTags }: { initialTags: TagRow[] }) {
  const router = useRouter();
  const [tags, setTags] = React.useState<TagRow[]>(initialTags);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const handleDelete = async (tag: TagRow) => {
    if (deletingId) return;
    const ok = typeof window !== "undefined" && window.confirm(`Delete tag "${tag.name}"? This will remove it from all items.`);
    if (!ok) return;
    setDeletingId(tag.id);
    try {
      await deleteTag(tag.id);
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
      toast.success(`Tag "${tag.name}" deleted`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete tag");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin: Manage tags</CardTitle>
        <p className="text-sm text-muted-foreground">
          Delete tags from the system. This removes the tag from all items.
        </p>
      </CardHeader>
      <CardContent>
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags to show.</p>
        ) : (
          <ul className="space-y-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <span className="font-medium">{tag.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(tag)}
                  disabled={deletingId !== null}
                  aria-label={`Delete tag ${tag.name}`}
                >
                  {deletingId === tag.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
