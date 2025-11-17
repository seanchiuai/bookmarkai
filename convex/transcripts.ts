import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get transcript for a bookmark
export const getForBookmark = query({
  args: { bookmarkId: v.id("bookmarks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const transcript = await ctx.db
      .query("transcripts")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", args.bookmarkId))
      .first();

    if (!transcript || transcript.userId !== identity.subject) {
      return null;
    }

    return transcript;
  },
});

// Get a single transcript by ID
export const get = query({
  args: { id: v.id("transcripts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const transcript = await ctx.db.get(args.id);
    if (!transcript || transcript.userId !== identity.subject) {
      return null;
    }

    return transcript;
  },
});

// Create a new transcript
export const create = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    segments: v.array(
      v.object({
        timestamp: v.number(),
        text: v.string(),
        startTime: v.number(),
        endTime: v.number(),
      })
    ),
    fullText: v.string(),
    language: v.optional(v.string()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify bookmark ownership
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== identity.subject) {
      throw new Error("Bookmark not found or unauthorized");
    }

    // Check if transcript already exists
    const existing = await ctx.db
      .query("transcripts")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", args.bookmarkId))
      .first();

    if (existing) {
      throw new Error("Transcript already exists for this bookmark");
    }

    const transcriptId = await ctx.db.insert("transcripts", {
      userId: identity.subject,
      bookmarkId: args.bookmarkId,
      segments: args.segments,
      fullText: args.fullText,
      language: args.language,
      duration: args.duration,
      status: "completed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update the bookmark with the transcript ID
    await ctx.db.patch(args.bookmarkId, {
      transcriptId,
      updatedAt: Date.now(),
    });

    return transcriptId;
  },
});

// Update transcript status
export const updateStatus = mutation({
  args: {
    id: v.id("transcripts"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const transcript = await ctx.db.get(args.id);
    if (!transcript || transcript.userId !== identity.subject) {
      throw new Error("Transcript not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

// Update transcript data
export const update = mutation({
  args: {
    id: v.id("transcripts"),
    segments: v.optional(
      v.array(
        v.object({
          timestamp: v.number(),
          text: v.string(),
          startTime: v.number(),
          endTime: v.number(),
        })
      )
    ),
    fullText: v.optional(v.string()),
    language: v.optional(v.string()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const transcript = await ctx.db.get(args.id);
    if (!transcript || transcript.userId !== identity.subject) {
      throw new Error("Transcript not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      segments: args.segments !== undefined ? args.segments : transcript.segments,
      fullText: args.fullText !== undefined ? args.fullText : transcript.fullText,
      language: args.language !== undefined ? args.language : transcript.language,
      duration: args.duration !== undefined ? args.duration : transcript.duration,
      updatedAt: Date.now(),
    });
  },
});

// Delete a transcript
export const remove = mutation({
  args: { id: v.id("transcripts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const transcript = await ctx.db.get(args.id);
    if (!transcript || transcript.userId !== identity.subject) {
      throw new Error("Transcript not found or unauthorized");
    }

    // Remove transcript reference from bookmark
    await ctx.db.patch(transcript.bookmarkId, {
      transcriptId: undefined,
      updatedAt: Date.now(),
    });

    // Delete the transcript
    await ctx.db.delete(args.id);
  },
});

// Search transcript by text
export const search = query({
  args: {
    bookmarkId: v.id("bookmarks"),
    searchText: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const transcript = await ctx.db
      .query("transcripts")
      .withIndex("by_bookmark", (q) => q.eq("bookmarkId", args.bookmarkId))
      .first();

    if (!transcript || transcript.userId !== identity.subject) {
      return [];
    }

    // Filter segments that contain the search text
    const searchLower = args.searchText.toLowerCase();
    const matchingSegments = transcript.segments.filter((segment) =>
      segment.text.toLowerCase().includes(searchLower)
    );

    return matchingSegments;
  },
});
