"use client";

import { BookmarkCard } from "./bookmark-card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkX } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel";

interface BookmarkListProps {
  bookmarks: Doc<"bookmarks">[] | undefined;
  onEdit: (bookmark: Doc<"bookmarks">) => void;
  onDelete: (id: string) => void;
  viewMode?: "grid" | "list";
}

export function BookmarkList({
  bookmarks,
  onEdit,
  onDelete,
  viewMode = "grid",
}: BookmarkListProps) {
  // Loading state
  if (bookmarks === undefined) {
    return (
      <div className={viewMode === "grid"
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        : "flex flex-col gap-4"
      }>
        {Array.from({ length: 6 }).map((_, i) => (
          <BookmarkSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <BookmarkX className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No bookmarks yet</h3>
        <p className="text-muted-foreground max-w-md">
          Start building your collection by adding your first bookmark. Click the "Add Bookmark" button to get started.
        </p>
      </div>
    );
  }

  // Grid or list view
  return (
    <div className={viewMode === "grid"
      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      : "flex flex-col gap-4"
    }>
      {bookmarks.map((bookmark) => (
        <BookmarkCard
          key={bookmark._id}
          bookmark={bookmark}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function BookmarkSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-6 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </div>
  );
}
