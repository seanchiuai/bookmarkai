import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all tags for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const tags = await ctx.db
      .query("tags")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();

    return tags;
  },
});

// Get a single tag by ID
export const get = query({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const tag = await ctx.db.get(args.id);
    if (!tag || tag.userId !== identity.subject) {
      return null;
    }

    return tag;
  },
});

// Get tag with bookmark count
export const getWithCount = query({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const tag = await ctx.db.get(args.id);
    if (!tag || tag.userId !== identity.subject) {
      return null;
    }

    const tagRelations = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.id))
      .collect();

    return {
      ...tag,
      bookmarkCount: tagRelations.length,
    };
  },
});

// Get tags for a specific bookmark
export const getForBookmark = query({
  args: { bookmarkId: v.id("bookmarks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const tagRelations = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", args.bookmarkId))
      .collect();

    const tags = await Promise.all(
      tagRelations.map(async (rel) => {
        const tag = await ctx.db.get(rel.tagId);
        return tag;
      })
    );

    return tags.filter((tag) => tag !== null);
  },
});

// Create a new tag
export const create = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if tag with this name already exists for this user
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", identity.subject).eq("name", args.name)
      )
      .first();

    if (existing) {
      throw new Error("Tag with this name already exists");
    }

    const tagId = await ctx.db.insert("tags", {
      userId: identity.subject,
      name: args.name,
      color: args.color,
      createdAt: Date.now(),
    });

    return tagId;
  },
});

// Find or create a tag by name
export const findOrCreate = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if tag already exists
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", identity.subject).eq("name", args.name)
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new tag
    const tagId = await ctx.db.insert("tags", {
      userId: identity.subject,
      name: args.name,
      color: args.color,
      createdAt: Date.now(),
    });

    return tagId;
  },
});

// Update a tag
export const update = mutation({
  args: {
    id: v.id("tags"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const tag = await ctx.db.get(args.id);
    if (!tag || tag.userId !== identity.subject) {
      throw new Error("Tag not found or unauthorized");
    }

    // If updating name, check for duplicates
    if (args.name !== undefined && args.name !== tag.name) {
      const existing = await ctx.db
        .query("tags")
        .withIndex("by_user_and_name", (q) =>
          q.eq("userId", identity.subject).eq("name", args.name)
        )
        .first();

      if (existing) {
        throw new Error("Tag with this name already exists");
      }
    }

    await ctx.db.patch(args.id, {
      name: args.name !== undefined ? args.name : tag.name,
      color: args.color !== undefined ? args.color : tag.color,
    });
  },
});

// Delete a tag
export const remove = mutation({
  args: { id: v.id("tags") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const tag = await ctx.db.get(args.id);
    if (!tag || tag.userId !== identity.subject) {
      throw new Error("Tag not found or unauthorized");
    }

    // Delete all bookmark-tag relationships
    const tagRelations = await ctx.db
      .query("bookmarkTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.id))
      .collect();

    for (const relation of tagRelations) {
      await ctx.db.delete(relation._id);

      // Also update the bookmark's tagIds array
      const bookmark = await ctx.db.get(relation.bookmarkId);
      if (bookmark) {
        const updatedTagIds = bookmark.tagIds.filter((id) => id !== args.id);
        await ctx.db.patch(relation.bookmarkId, {
          tagIds: updatedTagIds,
          updatedAt: Date.now(),
        });
      }
    }

    // Delete the tag
    await ctx.db.delete(args.id);
  },
});
