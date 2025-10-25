"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookmarkList } from "@/components/bookmarks/bookmark-list";
import { AddBookmarkDialog } from "@/components/bookmarks/add-bookmark-dialog";
import { EditBookmarkDialog } from "@/components/bookmarks/edit-bookmark-dialog";
import { Plus, Search, Grid3x3, List } from "lucide-react";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

export default function BookmarksPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Doc<"bookmarks"> | null>(null);

  // Fetch bookmarks with search filter
  const bookmarks = useQuery(
    api.bookmarks.listBookmarks,
    searchTerm ? { search: searchTerm } : {}
  );

  const deleteBookmark = useMutation(api.bookmarks.deleteBookmark);

  const handleDelete = async (id: string) => {
    try {
      await deleteBookmark({ id: id as any });
      toast.success("Bookmark deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete bookmark");
    }
  };

  const handleEdit = (bookmark: Doc<"bookmarks">) => {
    setEditingBookmark(bookmark);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bookmarks</h1>
            <p className="text-muted-foreground mt-1">
              {bookmarks !== undefined && bookmarks.length > 0
                ? `${bookmarks.length} bookmark${bookmarks.length !== 1 ? "s" : ""} saved`
                : "Manage your saved bookmarks"}
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} size="lg">
            <Plus className="mr-2 h-5 w-5" />
            Add Bookmark
          </Button>
        </div>

        {/* Search and View Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search bookmarks by title, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grid" | "list")}>
            <TabsList>
              <TabsTrigger value="grid" className="gap-2">
                <Grid3x3 className="h-4 w-4" />
                <span className="hidden sm:inline">Grid</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Bookmarks List */}
      <BookmarkList
        bookmarks={bookmarks}
        onEdit={handleEdit}
        onDelete={handleDelete}
        viewMode={viewMode}
      />

      {/* Dialogs */}
      <AddBookmarkDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      <EditBookmarkDialog
        bookmark={editingBookmark}
        open={!!editingBookmark}
        onOpenChange={(open) => !open && setEditingBookmark(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}
