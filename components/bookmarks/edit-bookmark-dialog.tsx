"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { TagInput } from "@/components/tags/TagInput";
import { CollectionSelector } from "@/components/collections/CollectionSelector";
import { CreateCollectionDialog } from "@/components/collections/CreateCollectionDialog";

interface EditBookmarkDialogProps {
  bookmark: Doc<"bookmarks"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
}

export function EditBookmarkDialog({
  bookmark,
  open,
  onOpenChange,
  onDelete,
}: EditBookmarkDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [collectionId, setCollectionId] = useState<Id<"collections"> | undefined>(undefined);
  const [showCreateCollection, setShowCreateCollection] = useState(false);

  const updateBookmark = useMutation(api.bookmarks.updateBookmark);

  // Reset form when bookmark changes
  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title);
      setDescription(bookmark.description || "");
      setNotes(bookmark.notes || "");
      setTags(bookmark.tags);
      setCollectionId(bookmark.collectionId);
    }
  }, [bookmark]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookmark) return;

    if (!title) {
      toast.error("Title is required");
      return;
    }

    try {
      await updateBookmark({
        id: bookmark._id,
        title,
        description: description || undefined,
        notes: notes || undefined,
        tags: tags,
        collectionId: collectionId,
      });

      toast.success("Bookmark updated successfully");
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update bookmark");
    }
  };

  const handleDelete = () => {
    if (!bookmark) return;

    if (confirm("Are you sure you want to delete this bookmark? This action cannot be undone.")) {
      onDelete(bookmark._id);
      onOpenChange(false);
    }
  };

  if (!bookmark) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bookmark</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL (read-only) */}
          <div>
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={bookmark.url}
              disabled
              className="opacity-60"
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL cannot be changed after creation
            </p>
          </div>

          <div>
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bookmark title"
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="collection">Collection</Label>
            <CollectionSelector
              value={collectionId}
              onChange={setCollectionId}
              allowNone={true}
              onCreateNew={() => setShowCreateCollection(true)}
            />
          </div>

          <div>
            <Label htmlFor="edit-tags">Tags</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="Add tags (press Enter or comma)..."
            />
          </div>

          <div>
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes about this bookmark"
              rows={3}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="sm:mr-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Bookmark
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <CreateCollectionDialog
        open={showCreateCollection}
        onOpenChange={setShowCreateCollection}
      />
    </Dialog>
  );
}
