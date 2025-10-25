import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new collection
 */
export const createCollection = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    // Normalize and validate name
    const normalizedName = args.name.trim();
    if (!normalizedName) throw new Error("Collection name cannot be empty");

    // Check for duplicate
    const existing = await ctx.db
      .query("collections")
      .withIndex("by_userId_name", (q) =>
        q.eq("userId", userId).eq("name", normalizedName)
      )
      .first();

    if (existing) {
      throw new Error("A collection with this name already exists");
    }

    // Validate color format (optional)
    if (args.color && !/^#[0-9A-F]{6}$/i.test(args.color)) {
      throw new Error("Invalid color format. Use hex format (e.g., #FF5733)");
    }

    const collectionId = await ctx.db.insert("collections", {
      userId,
      name: normalizedName,
      description: args.description,
      color: args.color || "#6366f1", // Default indigo color
      icon: args.icon || "📁", // Default folder emoji
      createdAt: Date.now(),
    });

    return collectionId;
  },
});

/**
 * Update an existing collection
 */
export const updateCollection = mutation({
  args: {
    id: v.id("collections"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    const collection = await ctx.db.get(args.id);
    if (!collection) throw new Error("Collection not found");
    if (collection.userId !== userId) throw new Error("Unauthorized");

    const updates: Record<string, any> = {};

    // Check for duplicate name if changing
    if (args.name !== undefined) {
      const normalizedName = args.name.trim();
      if (!normalizedName) throw new Error("Collection name cannot be empty");

      if (normalizedName !== collection.name) {
        const existing = await ctx.db
          .query("collections")
          .withIndex("by_userId_name", (q) =>
            q.eq("userId", userId).eq("name", normalizedName)
          )
          .first();

        if (existing) {
          throw new Error("A collection with this name already exists");
        }
      }

      updates.name = normalizedName;
    }

    if (args.description !== undefined) updates.description = args.description;
    if (args.icon !== undefined) updates.icon = args.icon;

    if (args.color !== undefined) {
      if (!/^#[0-9A-F]{6}$/i.test(args.color)) {
        throw new Error("Invalid color format. Use hex format (e.g., #FF5733)");
      }
      updates.color = args.color;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

/**
 * Delete a collection and handle orphaned bookmarks
 */
export const deleteCollection = mutation({
  args: {
    id: v.id("collections"),
    orphanAction: v.union(v.literal("unassign"), v.literal("delete")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    const collection = await ctx.db.get(args.id);
    if (!collection) throw new Error("Collection not found");
    if (collection.userId !== userId) throw new Error("Unauthorized");

    // Find bookmarks in this collection
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_collectionId", (q) => q.eq("collectionId", args.id))
      .collect();

    // Handle orphaned bookmarks
    if (args.orphanAction === "unassign") {
      for (const bookmark of bookmarks) {
        await ctx.db.patch(bookmark._id, { collectionId: undefined });
      }
    } else if (args.orphanAction === "delete") {
      for (const bookmark of bookmarks) {
        await ctx.db.delete(bookmark._id);
      }
    }

    await ctx.db.delete(args.id);

    return {
      success: true,
      orphanedCount: bookmarks.length,
    };
  },
});

/**
 * List all collections for the authenticated user
 */
export const listCollections = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Count bookmarks for each collection
    const collectionsWithCounts = await Promise.all(
      collections.map(async (collection) => {
        const count = await ctx.db
          .query("bookmarks")
          .withIndex("by_collectionId", (q) => q.eq("collectionId", collection._id))
          .collect()
          .then((bookmarks) => bookmarks.length);

        return {
          ...collection,
          bookmarkCount: count,
        };
      })
    );

    // Sort by name
    return collectionsWithCounts.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Get a single collection by ID with bookmark count
 */
export const getCollection = query({
  args: { id: v.id("collections") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const collection = await ctx.db.get(args.id);
    if (!collection || collection.userId !== userId) return null;

    const bookmarkCount = await ctx.db
      .query("bookmarks")
      .withIndex("by_collectionId", (q) => q.eq("collectionId", args.id))
      .collect()
      .then((bookmarks) => bookmarks.length);

    return {
      ...collection,
      bookmarkCount,
    };
  },
});
