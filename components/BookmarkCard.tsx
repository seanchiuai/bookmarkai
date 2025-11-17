"use client";

import { Id } from "../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

interface BookmarkCardProps {
  bookmark: {
    _id: Id<"bookmarks">;
    url: string;
    title?: string;
    description?: string;
    imageUrl?: string;
    faviconUrl?: string;
    isVideo: boolean;
    videoType?: "youtube" | "instagram";
    collectionId?: Id<"collections">;
    tagIds: Id<"tags">[];
    createdAt: number;
    metadataStatus: "pending" | "processing" | "completed" | "failed";
  };
}

export default function BookmarkCard({ bookmark }: BookmarkCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const removeBookmark = useMutation(api.bookmarks.remove);
  const tags = useQuery(api.tags.getForBookmark, { bookmarkId: bookmark._id });

  const handleDelete = async () => {
    try {
      await removeBookmark({ id: bookmark._id });
    } catch (error) {
      console.error("Error deleting bookmark:", error);
      alert("Failed to delete bookmark");
    }
  };

  const handleCardClick = () => {
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="group bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Image/Preview */}
      <div
        onClick={handleCardClick}
        className="relative h-48 bg-secondary/30 cursor-pointer overflow-hidden"
      >
        {bookmark.imageUrl ? (
          <img
            src={bookmark.imageUrl}
            alt={bookmark.title || "Bookmark preview"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {bookmark.isVideo ? (
              <svg
                className="w-16 h-16 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-16 h-16 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            )}
          </div>
        )}

        {/* Video badge */}
        {bookmark.isVideo && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded-lg backdrop-blur-sm">
            {bookmark.videoType === "youtube" ? "YouTube" : "Instagram"}
          </div>
        )}

        {/* Delete button */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-2 bg-black/70 text-white rounded-lg hover:bg-destructive backdrop-blur-sm transition-colors"
              title="Delete bookmark"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                className="px-3 py-1.5 bg-destructive text-white text-xs font-medium rounded-lg hover:bg-destructive/90 transition-colors"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                className="px-3 py-1.5 bg-black/70 text-white text-xs font-medium rounded-lg hover:bg-black/90 backdrop-blur-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Title */}
        <h3
          onClick={handleCardClick}
          className="font-semibold text-base line-clamp-2 cursor-pointer hover:text-primary transition-colors"
        >
          {bookmark.title || bookmark.url}
        </h3>

        {/* Description */}
        {bookmark.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {bookmark.description}
          </p>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2">
            {tags.map((tag) => (
              <span
                key={tag._id}
                className="px-2 py-1 text-xs font-medium rounded-md"
                style={{
                  backgroundColor: tag.color ? `${tag.color}20` : undefined,
                  color: tag.color || undefined,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            {bookmark.faviconUrl && (
              <img
                src={bookmark.faviconUrl}
                alt="Favicon"
                className="w-4 h-4"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <span className="truncate">
              {new URL(bookmark.url).hostname.replace(/^www\./, "")}
            </span>
          </div>
          <span>
            {new Date(bookmark.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
