import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is entirely optional.
// You can delete this file (schema.ts) and the
// app will continue to work.
// The schema provides more precise TypeScript types.
export default defineSchema({
  bookmarks: defineTable({
    userId: v.string(),
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    transcript: v.optional(v.string()), // YouTube video transcript (full text)
    transcriptLanguage: v.optional(v.string()), // Language code (e.g., "en", "es")
    isYouTubeVideo: v.optional(v.boolean()), // Flag for YouTube URLs
    youtubeVideoId: v.optional(v.string()), // Extracted video ID
    embedding: v.optional(v.array(v.float64())), // For RAG chat (1536-dim vector)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_collectionId", ["collectionId"])
    .index("by_url", ["url"]) // For duplicate detection
    .index("by_userId_createdAt", ["userId", "createdAt"]) // For sorted lists
    .index("by_userId_isYouTubeVideo", ["userId", "isYouTubeVideo"]) // For filtering YouTube bookmarks
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId"], // Ensure user data isolation
    }),

  collections: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_name", ["userId", "name"]),

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    preferences: v.object({
      theme: v.union(v.literal("light"), v.literal("dark")),
      defaultView: v.union(v.literal("list"), v.literal("grid")),
    }),
    createdAt: v.number(),
  }).index("by_clerkId", ["clerkId"]),
});
