"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { extractUrlMetadata } from "@/app/actions/metadata";

export default function AddBookmarkForm() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<Id<"collections"> | undefined>();
  const [selectedTagIds, setSelectedTagIds] = useState<Id<"tags">[]>([]);

  const createBookmark = useMutation(api.bookmarks.create);
  const collections = useQuery(api.collections.list, {});
  const tags = useQuery(api.tags.list, {});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);

    try {
      // Extract metadata from URL
      const metadataResult = await extractUrlMetadata(url.trim());

      if (metadataResult.success && metadataResult.data) {
        const metadata = metadataResult.data;

        // Create bookmark with extracted metadata
        await createBookmark({
          url: metadata.url,
          title: metadata.title,
          description: metadata.description,
          imageUrl: metadata.imageUrl,
          faviconUrl: metadata.faviconUrl,
          collectionId: selectedCollectionId,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        });

        // Reset form
        setUrl("");
        setShowAdvanced(false);
        setSelectedCollectionId(undefined);
        setSelectedTagIds([]);
      } else {
        // Create bookmark without metadata (will be extracted in background)
        await createBookmark({
          url: url.trim(),
          collectionId: selectedCollectionId,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        });

        // Reset form
        setUrl("");
        setShowAdvanced(false);
        setSelectedCollectionId(undefined);
        setSelectedTagIds([]);
      }
    } catch (error) {
      console.error("Error adding bookmark:", error);
      alert("Failed to add bookmark. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTag = (tagId: Id<"tags">) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a URL to save..."
            className="flex-1 px-4 py-3 bg-transparent border border-border outline-none text-base placeholder:text-muted-foreground focus:border-primary rounded-xl transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!url.trim() || isLoading}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary-hover transition-all duration-200 shadow-sm hover:shadow font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? "Hide" : "Show"} advanced options
        </button>

        {showAdvanced && (
          <div className="space-y-4 animate-fade-in">
            {/* Collection selector */}
            {collections && collections.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Collection</label>
                <select
                  value={selectedCollectionId || ""}
                  onChange={(e) =>
                    setSelectedCollectionId(
                      e.target.value ? (e.target.value as Id<"collections">) : undefined
                    )
                  }
                  className="w-full px-4 py-2 bg-secondary/30 border-none outline-none rounded-xl focus:bg-secondary/50 transition-colors"
                >
                  <option value="">No collection</option>
                  {collections.map((collection) => (
                    <option key={collection._id} value={collection._id}>
                      {collection.icon} {collection.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tag selector */}
            {tags && tags.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag._id}
                      type="button"
                      onClick={() => toggleTag(tag._id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedTagIds.includes(tag._id)
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary/30 text-foreground hover:bg-secondary/50"
                      }`}
                      style={{
                        backgroundColor: selectedTagIds.includes(tag._id)
                          ? tag.color || undefined
                          : undefined,
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
