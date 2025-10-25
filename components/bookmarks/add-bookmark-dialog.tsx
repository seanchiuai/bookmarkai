"use client";

import { useState, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Youtube } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { TagInput } from "@/components/tags/TagInput";
import { CollectionSelector } from "@/components/collections/CollectionSelector";
import { CreateCollectionDialog } from "@/components/collections/CreateCollectionDialog";

// Helper function to detect YouTube URLs
function isYouTubeUrl(url: string): boolean {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ];
  return patterns.some((pattern) => pattern.test(url));
}

interface AddBookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId?: Id<"collections">;
}

export function AddBookmarkDialog({
  open,
  onOpenChange,
  collectionId: initialCollectionId,
}: AddBookmarkDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [collectionId, setCollectionId] = useState<Id<"collections"> | undefined>(initialCollectionId);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const extractMetadata = useAction(api.bookmarks.extractMetadata);
  const createBookmark = useMutation(api.bookmarks.createBookmark);
  const processYouTubeBookmark = useAction(api.youtube.processYouTubeBookmark);

  // Detect YouTube URL on input change
  useEffect(() => {
    setIsYouTube(isYouTubeUrl(url));
  }, [url]);

  const handleFetchMetadata = async () => {
    if (!url) {
      toast.error("Please enter a URL first");
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsExtracting(true);
    try {
      const metadata = await extractMetadata({ url });
      setTitle(metadata.title);
      setDescription(metadata.description || "");
      toast.success("Metadata extracted successfully");
    } catch (error) {
      toast.error("Failed to extract metadata");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url || !title) {
      toast.error("URL and title are required");
      return;
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setIsCreating(true);
    try {
      // Use processYouTubeBookmark for YouTube URLs (handles transcript extraction)
      // Use regular createBookmark for non-YouTube URLs
      if (isYouTube) {
        await processYouTubeBookmark({
          url,
          title,
          description: description || undefined,
          notes: notes || undefined,
          tags: tags,
          collectionId: collectionId,
        });

        toast.success("YouTube bookmark created with transcript extraction!");
      } else {
        await createBookmark({
          url,
          title,
          description: description || undefined,
          notes: notes || undefined,
          tags: tags,
          collectionId: collectionId,
        });

        toast.success("Bookmark created successfully");
      }

      onOpenChange(false);

      // Reset form
      setUrl("");
      setTitle("");
      setDescription("");
      setNotes("");
      setTags([]);
      setCollectionId(initialCollectionId);
      setIsYouTube(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create bookmark");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Bookmark</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="url">URL *</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                />
                {isYouTube && (
                  <Badge className="absolute right-2 top-1/2 -translate-y-1/2" variant="secondary">
                    <Youtube className="h-3 w-3 mr-1" />
                    YouTube
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                onClick={handleFetchMetadata}
                disabled={isExtracting || !url}
                variant="outline"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  "Fetch Metadata"
                )}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bookmark title"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
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
            <Label htmlFor="tags">Tags</Label>
            <TagInput
              value={tags}
              onChange={setTags}
              placeholder="Add tags (press Enter or comma)..."
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes about this bookmark"
              rows={3}
            />
          </div>

          {isYouTube && (
            <div className="p-3 bg-muted rounded-md text-sm">
              <p className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                Transcript will be automatically extracted for AI search and chat
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isYouTube ? "Extracting transcript..." : "Creating..."}
                </>
              ) : (
                "Create Bookmark"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>

      <CreateCollectionDialog
        open={showCreateCollection}
        onOpenChange={setShowCreateCollection}
      />
    </Dialog>
  );
}
