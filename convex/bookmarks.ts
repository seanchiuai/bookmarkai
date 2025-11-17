import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// List all bookmarks for the current user
export const list = query({
  args: {
    collectionId: v.optional(v.id("collections")),
    tagId: v.optional(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let bookmarksQuery = ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject));

    // Filter by collection if specified
    if (args.collectionId !== undefined) {
      bookmarksQuery = ctx.db
        .query("bookmarks")
        .withIndex("by_user_and_collection", (q) =>
          q.eq("userId", identity.subject).eq("collectionId", args.collectionId)
        );
    }

    const bookmarks = await bookmarksQuery.order("desc").collect();

    // Filter by tag if specified
    if (args.tagId) {
      const bookmarkTagRelations = await ctx.db
        .query("bookmarkTags")
        .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
        .collect();

      const bookmarkIdsWithTag = new Set(
        bookmarkTagRelations.map((rel) => rel.bookmarkId)
      );

      return bookmarks.filter((b) => bookmarkIdsWithTag.has(b._id));
    }

    return bookmarks;
  },
});

// Get a single bookmark by ID
export const get = query({
  args: { id: v.id("bookmarks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark || bookmark.userId !== identity.subject) {
      return null;
    }

    return bookmark;
  },
});

// Create a new bookmark
export const create = mutation({
  args: {
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if URL already exists for this user
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .collect();

    const userExisting = existing.find((b) => b.userId === identity.subject);
    if (userExisting) {
      throw new Error("Bookmark with this URL already exists");
    }

    // Detect if it's a video URL
    const isVideo = isVideoUrl(args.url);
    const videoType = getVideoType(args.url);

    // Get the max order for this user's bookmarks in this collection
    const bookmarksInCollection = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_collection", (q) =>
        q.eq("userId", identity.subject).eq("collectionId", args.collectionId)
      )
      .collect();

    const maxOrder = Math.max(0, ...bookmarksInCollection.map((b) => b.order));

    const bookmarkId = await ctx.db.insert("bookmarks", {
      userId: identity.subject,
      url: args.url,
      title: args.title,
      description: args.description,
      imageUrl: args.imageUrl,
      faviconUrl: args.faviconUrl,
      isVideo,
      videoType,
      collectionId: args.collectionId,
      tagIds: args.tagIds || [],
      order: maxOrder + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadataStatus: args.title ? "completed" : "pending",
    });

    // Create bookmark-tag relationships if tags are provided
    if (args.tagIds && args.tagIds.length > 0) {
      for (const tagId of args.tagIds) {
        await ctx.db.insert("bookmarkTags", {
          userId: identity.subject,
          bookmarkId,
          tagId,
          createdAt: Date.now(),
        });
      }
    }

    return bookmarkId;
  },
});

// Update a bookmark
export const update = mutation({
  args: {
    id: v.id("bookmarks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark || bookmark.userId !== identity.subject) {
      throw new Error("Bookmark not found or unauthorized");
    }

    // Update the bookmark
    await ctx.db.patch(args.id, {
      title: args.title !== undefined ? args.title : bookmark.title,
      description: args.description !== undefined ? args.description : bookmark.description,
      imageUrl: args.imageUrl !== undefined ? args.imageUrl : bookmark.imageUrl,
      faviconUrl: args.faviconUrl !== undefined ? args.faviconUrl : bookmark.faviconUrl,
      collectionId: args.collectionId !== undefined ? args.collectionId : bookmark.collectionId,
      updatedAt: Date.now(),
    });

    // Update tags if provided
    if (args.tagIds !== undefined) {
      // Remove existing tag relationships
      const existingRelations = await ctx.db
        .query("bookmarkTags")
        .withIndex("by_bookmark", (q) => q.eq("bookmarkId", args.id))
        .collect();

      for (const relation of existingRelations) {
        await ctx.db.delete(relation._id);
      }

      // Create new tag relationships
      for (const tagId of args.tagIds) {
        await ctx.db.insert("bookmarkTags", {
          userId: identity.subject,
          bookmarkId: args.id,
          tagId,
          createdAt: Date.now(),
        });
      }

      // Update the tagIds array in the bookmark
      await ctx.db.patch(args.id, {
        tagIds: args.tagIds,
      });
    }
  },
});

// Delete a bookmark
export const remove = mutation({
  args: { id: v.id("bookmarks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark || bookmark.userId !== identity.subject) {
      throw new Error("Bookmark not found or unauthorized");
    }

    // Delete associated tag relationships
    const tagRelations = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", args.id))
      .collect();

    for (const relation of tagRelations) {
      await ctx.db.delete(relation._id);
    }

    // Delete associated transcript if exists
    if (bookmark.transcriptId) {
      await ctx.db.delete(bookmark.transcriptId);
    }

    // Delete the bookmark
    await ctx.db.delete(args.id);
  },
});

// Move bookmark to a different collection
export const moveToCollection = mutation({
  args: {
    id: v.id("bookmarks"),
    collectionId: v.optional(v.id("collections")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark || bookmark.userId !== identity.subject) {
      throw new Error("Bookmark not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      collectionId: args.collectionId,
      updatedAt: Date.now(),
    });
  },
});

// Reorder bookmarks within a collection
export const reorder = mutation({
  args: {
    id: v.id("bookmarks"),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark || bookmark.userId !== identity.subject) {
      throw new Error("Bookmark not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      order: args.newOrder,
      updatedAt: Date.now(),
    });
  },
});

// Update metadata status
export const updateMetadataStatus = mutation({
  args: {
    id: v.id("bookmarks"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark || bookmark.userId !== identity.subject) {
      throw new Error("Bookmark not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      metadataStatus: args.status,
      title: args.title !== undefined ? args.title : bookmark.title,
      description: args.description !== undefined ? args.description : bookmark.description,
      imageUrl: args.imageUrl !== undefined ? args.imageUrl : bookmark.imageUrl,
      faviconUrl: args.faviconUrl !== undefined ? args.faviconUrl : bookmark.faviconUrl,
      updatedAt: Date.now(),
    });
  },
});

// Helper functions
function isVideoUrl(url: string): boolean {
  return /youtube\.com|youtu\.be|instagram\.com\/reel/i.test(url);
}

function getVideoType(url: string): "youtube" | "instagram" | undefined {
  if (/youtube\.com|youtu\.be/i.test(url)) {
    return "youtube";
  }
  if (/instagram\.com\/reel/i.test(url)) {
    return "instagram";
  }
  return undefined;
}
