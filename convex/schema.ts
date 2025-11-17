import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Database schema for Bookmark AI
export default defineSchema({
  // Legacy tables (keeping for backward compatibility)
  numbers: defineTable({
    value: v.number(),
  }),
  todos: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("completed")),
    userId: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // Bookmarks - Core bookmark storage
  bookmarks: defineTable({
    userId: v.string(),
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    // Video-specific fields
    isVideo: v.boolean(),
    videoType: v.optional(v.union(v.literal("youtube"), v.literal("instagram"))),
    transcriptId: v.optional(v.id("transcripts")),
    // Organization
    collectionId: v.optional(v.id("collections")),
    tagIds: v.array(v.id("tags")),
    order: v.number(), // For manual ordering within collections
    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    // Metadata extraction status
    metadataStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_collection", ["userId", "collectionId"])
    .index("by_url", ["url"])
    .index("by_created", ["userId", "createdAt"]),

  // Collections - Folders/groups for bookmarks
  collections: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    parentId: v.optional(v.id("collections")), // For nested collections
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_parent", ["userId", "parentId"]),

  // Tags - Labels for bookmarks
  tags: defineTable({
    userId: v.string(),
    name: v.string(),
    color: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "name"]),

  // Bookmark Tags - Many-to-many relationship
  bookmarkTags: defineTable({
    userId: v.string(),
    bookmarkId: v.id("bookmarks"),
    tagId: v.id("tags"),
    createdAt: v.number(),
  })
    .index("by_bookmark", ["bookmarkId"])
    .index("by_tag", ["tagId"])
    .index("by_user", ["userId"]),

  // Transcripts - Video transcriptions with timestamps
  transcripts: defineTable({
    userId: v.string(),
    bookmarkId: v.id("bookmarks"),
    segments: v.array(
      v.object({
        timestamp: v.number(), // seconds
        text: v.string(),
        startTime: v.number(),
        endTime: v.number(),
      })
    ),
    fullText: v.string(),
    language: v.optional(v.string()),
    duration: v.optional(v.number()), // video duration in seconds
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_bookmark", ["bookmarkId"])
    .index("by_user", ["userId"]),
});
