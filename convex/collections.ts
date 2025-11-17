import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all collections for the current user
export const list = query({
  args: {
    parentId: v.optional(v.id("collections")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let collectionsQuery = ctx.db
      .query("collections")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject));

    // Filter by parent if specified (including root level collections)
    if (args.parentId !== undefined) {
      collectionsQuery = ctx.db
        .query("collections")
        .withIndex("by_user_and_parent", (q) =>
          q.eq("userId", identity.subject).eq("parentId", args.parentId)
        );
    }

    const collections = await collectionsQuery.collect();

    // Sort by order
    return collections.sort((a, b) => a.order - b.order);
  },
});

// Get a single collection by ID
export const get = query({
  args: { id: v.id("collections") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const collection = await ctx.db.get(args.id);
    if (!collection || collection.userId !== identity.subject) {
      return null;
    }

    return collection;
  },
});

// Get collection with bookmark count
export const getWithCount = query({
  args: { id: v.id("collections") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const collection = await ctx.db.get(args.id);
    if (!collection || collection.userId !== identity.subject) {
      return null;
    }

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_collection", (q) =>
        q.eq("userId", identity.subject).eq("collectionId", args.id)
      )
      .collect();

    return {
      ...collection,
      bookmarkCount: bookmarks.length,
    };
  },
});

// Create a new collection
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    parentId: v.optional(v.id("collections")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the max order for this user's collections at this level
    const collectionsAtLevel = await ctx.db
      .query("collections")
      .withIndex("by_user_and_parent", (q) =>
        q.eq("userId", identity.subject).eq("parentId", args.parentId)
      )
      .collect();

    const maxOrder = Math.max(0, ...collectionsAtLevel.map((c) => c.order));

    const collectionId = await ctx.db.insert("collections", {
      userId: identity.subject,
      name: args.name,
      description: args.description,
      color: args.color,
      icon: args.icon,
      parentId: args.parentId,
      order: maxOrder + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return collectionId;
  },
});

// Update a collection
export const update = mutation({
  args: {
    id: v.id("collections"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const collection = await ctx.db.get(args.id);
    if (!collection || collection.userId !== identity.subject) {
      throw new Error("Collection not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      name: args.name !== undefined ? args.name : collection.name,
      description: args.description !== undefined ? args.description : collection.description,
      color: args.color !== undefined ? args.color : collection.color,
      icon: args.icon !== undefined ? args.icon : collection.icon,
      updatedAt: Date.now(),
    });
  },
});

// Delete a collection
export const remove = mutation({
  args: { id: v.id("collections") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const collection = await ctx.db.get(args.id);
    if (!collection || collection.userId !== identity.subject) {
      throw new Error("Collection not found or unauthorized");
    }

    // Move bookmarks in this collection to uncategorized (null collectionId)
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_and_collection", (q) =>
        q.eq("userId", identity.subject).eq("collectionId", args.id)
      )
      .collect();

    for (const bookmark of bookmarks) {
      await ctx.db.patch(bookmark._id, {
        collectionId: undefined,
        updatedAt: Date.now(),
      });
    }

    // Delete child collections recursively
    const childCollections = await ctx.db
      .query("collections")
      .withIndex("by_user_and_parent", (q) =>
        q.eq("userId", identity.subject).eq("parentId", args.id)
      )
      .collect();

    for (const child of childCollections) {
      // Recursively delete children by moving them to root level
      await ctx.db.patch(child._id, {
        parentId: undefined,
        updatedAt: Date.now(),
      });
    }

    // Delete the collection
    await ctx.db.delete(args.id);
  },
});

// Reorder collections
export const reorder = mutation({
  args: {
    id: v.id("collections"),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const collection = await ctx.db.get(args.id);
    if (!collection || collection.userId !== identity.subject) {
      throw new Error("Collection not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      order: args.newOrder,
      updatedAt: Date.now(),
    });
  },
});

// Move collection to a different parent
export const moveToParent = mutation({
  args: {
    id: v.id("collections"),
    parentId: v.optional(v.id("collections")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const collection = await ctx.db.get(args.id);
    if (!collection || collection.userId !== identity.subject) {
      throw new Error("Collection not found or unauthorized");
    }

    // Prevent circular references
    if (args.parentId === args.id) {
      throw new Error("Cannot make a collection its own parent");
    }

    // Check if the new parent is a descendant of this collection
    if (args.parentId) {
      let currentParentId = args.parentId;
      while (currentParentId) {
        if (currentParentId === args.id) {
          throw new Error("Cannot create circular reference");
        }
        const parent = await ctx.db.get(currentParentId);
        currentParentId = parent?.parentId;
      }
    }

    await ctx.db.patch(args.id, {
      parentId: args.parentId,
      updatedAt: Date.now(),
    });
  },
});
