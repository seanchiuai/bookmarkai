import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get all unique tags used by the authenticated user with usage counts
 */
export const getAllTags = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Count tag occurrences
    const tagCounts = new Map<string, number>();
    for (const bookmark of bookmarks) {
      for (const tag of bookmark.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    // Convert to array and sort by count
    const tagsArray = Array.from(tagCounts.entries()).map(([tag, count]) => ({
      tag,
      count,
    }));

    return tagsArray.sort((a, b) => b.count - a.count);
  },
});

/**
 * Get tag suggestions based on partial input for autocomplete
 */
export const getTagSuggestions = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const allTags = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()
      .then((bookmarks) => {
        const tagCounts = new Map<string, number>();
        for (const bookmark of bookmarks) {
          for (const tag of bookmark.tags) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        }
        return Array.from(tagCounts.entries());
      });

    const queryLower = args.query.toLowerCase();
    const matches = allTags
      .filter(([tag]) => tag.toLowerCase().startsWith(queryLower))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    return matches;
  },
});

/**
 * Add a tag to a bookmark (avoid duplicates)
 */
export const addTagToBookmark = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark) throw new Error("Bookmark not found");
    if (bookmark.userId !== userId) throw new Error("Unauthorized");

    const normalizedTag = args.tag.trim().toLowerCase();
    if (!normalizedTag) throw new Error("Tag cannot be empty");

    if (bookmark.tags.includes(normalizedTag)) {
      return { success: true, message: "Tag already exists" };
    }

    await ctx.db.patch(args.bookmarkId, {
      tags: [...bookmark.tags, normalizedTag],
      updatedAt: Date.now(),
    });

    return { success: true, message: "Tag added" };
  },
});

/**
 * Remove a tag from a bookmark
 */
export const removeTagFromBookmark = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark) throw new Error("Bookmark not found");
    if (bookmark.userId !== userId) throw new Error("Unauthorized");

    const newTags = bookmark.tags.filter((t) => t !== args.tag);

    await ctx.db.patch(args.bookmarkId, {
      tags: newTags,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Tag removed" };
  },
});
