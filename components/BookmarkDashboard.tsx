"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import AddBookmarkForm from "./AddBookmarkForm";
import BookmarkCard from "./BookmarkCard";

type FilterView = "all" | "collection" | "tag";

export default function BookmarkDashboard() {
  const [filterView, setFilterView] = useState<FilterView>("all");
  const [selectedCollectionId, setSelectedCollectionId] = useState<Id<"collections"> | undefined>();
  const [selectedTagId, setSelectedTagId] = useState<Id<"tags"> | undefined>();

  const bookmarks = useQuery(
    api.bookmarks.list,
    filterView === "collection"
      ? { collectionId: selectedCollectionId }
      : filterView === "tag"
      ? { tagId: selectedTagId }
      : {}
  );

  const collections = useQuery(api.collections.list, {});
  const tags = useQuery(api.tags.list);

  const handleCollectionFilter = (collectionId?: Id<"collections">) => {
    setFilterView("collection");
    setSelectedCollectionId(collectionId);
  };

  const handleTagFilter = (tagId: Id<"tags">) => {
    setFilterView("tag");
    setSelectedTagId(tagId);
  };

  const handleClearFilter = () => {
    setFilterView("all");
    setSelectedCollectionId(undefined);
    setSelectedTagId(undefined);
  };

  const getFilterLabel = () => {
    if (filterView === "collection" && selectedCollectionId) {
      const collection = collections?.find((c) => c._id === selectedCollectionId);
      return collection ? `${collection.icon} ${collection.name}` : "Collection";
    }
    if (filterView === "tag" && selectedTagId) {
      const tag = tags?.find((t) => t._id === selectedTagId);
      return tag ? tag.name : "Tag";
    }
    return "All Bookmarks";
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-semibold mb-2 tracking-tight">Bookmarks</h1>
        <p className="text-muted-foreground">Save and organize your favorite links</p>
      </div>

      {/* Add Bookmark Form */}
      <div className="mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <AddBookmarkForm />
      </div>

      {/* Sidebar and Content Layout */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 space-y-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          {/* Filter section */}
          <div>
            <button
              type="button"
              onClick={handleClearFilter}
              className={`w-full text-left px-4 py-2 rounded-xl transition-all duration-200 ${
                filterView === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                <span className="font-medium">All Bookmarks</span>
              </div>
              {bookmarks && <span className="text-sm ml-7">{bookmarks.length}</span>}
            </button>
          </div>

          {/* Collections */}
          {collections && collections.length > 0 && (
            <div>
              <h3 className="px-4 mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Collections
              </h3>
              <div className="space-y-1">
                {collections.map((collection) => (
                  <button
                    key={collection._id}
                    type="button"
                    onClick={() => handleCollectionFilter(collection._id)}
                    className={`w-full text-left px-4 py-2 rounded-xl transition-all duration-200 ${
                      filterView === "collection" && selectedCollectionId === collection._id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-secondary/50"
                    }`}
                  >
                    <span>
                      {collection.icon} {collection.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div>
              <h3 className="px-4 mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Tags
              </h3>
              <div className="space-y-1">
                {tags.map((tag) => (
                  <button
                    key={tag._id}
                    type="button"
                    onClick={() => handleTagFilter(tag._id)}
                    className={`w-full text-left px-4 py-2 rounded-xl transition-all duration-200 ${
                      filterView === "tag" && selectedTagId === tag._id
                        ? "text-primary-foreground shadow-sm"
                        : "hover:bg-secondary/50"
                    }`}
                    style={{
                      backgroundColor:
                        filterView === "tag" && selectedTagId === tag._id
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
        </aside>

        {/* Main Content */}
        <main className="flex-1 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          {/* Filter header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">{getFilterLabel()}</h2>
            {filterView !== "all" && (
              <button
                type="button"
                onClick={handleClearFilter}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* Bookmarks Grid */}
          {!bookmarks ? (
            <div className="text-center py-16 text-muted-foreground">Loading...</div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border">
              {filterView === "all"
                ? "No bookmarks yet. Add one above!"
                : "No bookmarks in this filter"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookmarks.map((bookmark, index) => (
                <div
                  key={bookmark._id}
                  className="animate-slide-in"
                  style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s` }}
                >
                  <BookmarkCard bookmark={bookmark} />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
