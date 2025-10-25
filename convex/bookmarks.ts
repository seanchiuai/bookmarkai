import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";

/**
 * Extract metadata from a URL using Microlink API
 * Provides fallback if API fails or times out
 */
export const extractMetadata = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // Validate URL
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(args.url)) {
      throw new Error("Invalid URL format");
    }

    try {
      const apiKey = process.env.MICROLINK_API_KEY;
      const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(args.url)}`;

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers["x-api-key"] = apiKey;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(microlinkUrl, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Microlink API error: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data || {};

      return {
        title: data.title || args.url,
        description: data.description || null,
        imageUrl: data.image?.url || null,
        faviconUrl: data.logo?.url || null,
      };
    } catch (error) {
      console.error("Metadata extraction failed:", error);
      // Return fallback metadata
      return {
        title: args.url,
        description: null,
        imageUrl: null,
        faviconUrl: null,
      };
    }
  },
});

/**
 * Create a new bookmark with metadata
 * Prevents duplicate URLs per user
 */
export const createBookmark = mutation({
  args: {
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    // Check for duplicate
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existing) {
      throw new Error("This URL has already been bookmarked");
    }

    // Validate collection ownership if provided
    if (args.collectionId) {
      const collection = await ctx.db.get(args.collectionId);
      if (!collection || collection.userId !== userId) {
        throw new Error("Invalid collection");
      }
    }

    const now = Date.now();
    const bookmarkId = await ctx.db.insert("bookmarks", {
      userId,
      url: args.url,
      title: args.title || args.url,
      description: args.description,
      imageUrl: args.imageUrl,
      faviconUrl: args.faviconUrl,
      collectionId: args.collectionId,
      tags: args.tags || [],
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return bookmarkId;
  },
});

/**
 * Update an existing bookmark
 * Only allows updating specific fields
 */
export const updateBookmark = mutation({
  args: {
    id: v.id("bookmarks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark) throw new Error("Bookmark not found");
    if (bookmark.userId !== userId) throw new Error("Unauthorized");

    // Validate collection ownership if provided
    if (args.collectionId !== undefined && args.collectionId !== null) {
      const collection = await ctx.db.get(args.collectionId);
      if (!collection || collection.userId !== userId) {
        throw new Error("Invalid collection");
      }
    }

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.collectionId !== undefined) updates.collectionId = args.collectionId;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a bookmark
 * Verifies ownership before deletion
 */
export const deleteBookmark = mutation({
  args: { id: v.id("bookmarks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark) throw new Error("Bookmark not found");
    if (bookmark.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Get a single bookmark by ID
 * Returns null if not found or unauthorized
 */
export const getBookmark = query({
  args: { id: v.id("bookmarks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark || bookmark.userId !== userId) return null;

    return bookmark;
  },
});

/**
 * List all bookmarks for the authenticated user
 * Supports filtering by collection, search, and pagination
 */
export const listBookmarks = query({
  args: {
    collectionId: v.optional(v.id("collections")),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    let query = ctx.db
      .query("bookmarks")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
      .order("desc");

    let bookmarks = await query.collect();

    // Filter by collection
    if (args.collectionId) {
      bookmarks = bookmarks.filter((b) => b.collectionId === args.collectionId);
    }

    // Filter by search term
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      bookmarks = bookmarks.filter((b) => {
        return (
          b.title.toLowerCase().includes(searchLower) ||
          b.description?.toLowerCase().includes(searchLower) ||
          b.notes?.toLowerCase().includes(searchLower) ||
          b.url.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply limit
    const limit = Math.min(args.limit || 100, 500);
    return bookmarks.slice(0, limit);
  },
});

/**
 * Internal mutation to create a bookmark with YouTube-specific fields
 * Used by the processYouTubeBookmark action
 * This is internal to prevent direct calls from the client
 */
export const createBookmarkInternal = internalMutation({
  args: {
    userId: v.string(),
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    transcript: v.optional(v.string()),
    transcriptLanguage: v.optional(v.string()),
    isYouTubeVideo: v.optional(v.boolean()),
    youtubeVideoId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      throw new Error("This URL has already been bookmarked");
    }

    // Validate collection ownership if provided
    if (args.collectionId) {
      const collection = await ctx.db.get(args.collectionId);
      if (!collection || collection.userId !== args.userId) {
        throw new Error("Invalid collection");
      }
    }

    const now = Date.now();
    const bookmarkId = await ctx.db.insert("bookmarks", {
      userId: args.userId,
      url: args.url,
      title: args.title,
      description: args.description,
      imageUrl: args.imageUrl,
      faviconUrl: args.faviconUrl,
      collectionId: args.collectionId,
      tags: args.tags,
      notes: args.notes,
      transcript: args.transcript,
      transcriptLanguage: args.transcriptLanguage,
      isYouTubeVideo: args.isYouTubeVideo,
      youtubeVideoId: args.youtubeVideoId,
      createdAt: now,
      updatedAt: now,
    });

    return bookmarkId;
  },
});
