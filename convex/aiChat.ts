import { v } from "convex/values";
import { action, internalAction, internalQuery, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Generate embedding for text using OpenAI API
 * This is an internal action that can only be called by other Convex functions
 */
export const generateEmbedding = internalAction({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    // Dynamically import OpenAI to avoid issues with Convex bundling
    const { default: OpenAI } = await import("openai");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured in Convex environment variables");
    }

    const openai = new OpenAI({ apiKey });

    try {
      // Truncate text to stay within token limits (~8000 chars ≈ 2000 tokens)
      const truncatedText = text.slice(0, 8000);

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: truncatedText,
      });

      return response.data[0].embedding; // Returns 1536-dim array
    } catch (error: any) {
      console.error("OpenAI embedding generation failed:", error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  },
});

/**
 * Save generated embedding to bookmark record
 */
export const saveEmbedding = internalMutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, { bookmarkId, embedding }) => {
    const bookmark = await ctx.db.get(bookmarkId);
    if (!bookmark) {
      throw new Error("Bookmark not found");
    }

    await ctx.db.patch(bookmarkId, {
      embedding,
      updatedAt: Date.now(),
    });

    return true;
  },
});

/**
 * Generate and save embedding for a bookmark
 */
export const generateBookmarkEmbedding = action({
  args: { bookmarkId: v.id("bookmarks") },
  handler: async (ctx, { bookmarkId }) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Get bookmark
    const bookmark = await ctx.runQuery(internal.aiChat.getBookmark, {
      bookmarkId,
    });

    if (!bookmark) {
      throw new Error("Bookmark not found");
    }

    // Verify ownership
    if (bookmark.userId !== identity.subject) {
      throw new Error("Unauthorized: bookmark does not belong to user");
    }

    // Prepare text for embedding (combine relevant fields)
    const embeddingText = [
      bookmark.title,
      bookmark.description || "",
      bookmark.notes || "",
      bookmark.transcript?.slice(0, 2000) || "", // Include part of transcript if available
      bookmark.tags.join(" "),
    ]
      .filter((s) => s.length > 0)
      .join(" ");

    // Generate embedding
    const embedding = await ctx.runAction(internal.aiChat.generateEmbedding, {
      text: embeddingText,
    });

    // Save embedding
    await ctx.runMutation(internal.aiChat.saveEmbedding, {
      bookmarkId,
      embedding,
    });

    return { success: true };
  },
});

/**
 * Internal query to get a bookmark by ID
 */
export const getBookmark = internalQuery({
  args: { bookmarkId: v.id("bookmarks") },
  handler: async (ctx, { bookmarkId }) => {
    return await ctx.db.get(bookmarkId);
  },
});

/**
 * Execute vector similarity search
 */
export const vectorSearch = internalQuery({
  args: {
    embedding: v.array(v.float64()),
    userId: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, { embedding, userId, limit }) => {
    const results = await ctx.db
      .query("bookmarks")
      .withIndex("by_embedding", (q) =>
        q.similar("embedding", embedding, limit * 2) // Get more results for filtering
      )
      .filter((q) => q.eq(q.field("userId"), userId)) // Row-level security
      .collect();

    // Return top results
    return results.slice(0, limit);
  },
});

/**
 * Perform semantic search to find relevant bookmarks
 */
export const semanticSearch = action({
  args: {
    query: v.string(),
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, userId: providedUserId, limit = 5 }) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Use authenticated user ID
    const userId = providedUserId || identity.subject;

    // Verify user can only search their own bookmarks
    if (userId !== identity.subject) {
      throw new Error("Unauthorized: cannot search other users' bookmarks");
    }

    // Generate query embedding
    const queryEmbedding = await ctx.runAction(internal.aiChat.generateEmbedding, {
      text: query,
    });

    // Perform vector search
    const results = await ctx.runQuery(internal.aiChat.vectorSearch, {
      embedding: queryEmbedding,
      userId,
      limit,
    });

    return results;
  },
});

/**
 * Stream GPT response with bookmark context (RAG)
 */
export const streamChatResponse = action({
  args: {
    message: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { message, userId: providedUserId }) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = providedUserId || identity.subject;

    // Verify user identity matches
    if (userId !== identity.subject) {
      throw new Error("Unauthorized: user ID mismatch");
    }

    // Find relevant bookmarks using semantic search
    const bookmarks = await ctx.runAction(api.aiChat.semanticSearch, {
      query: message,
      userId,
      limit: 5,
    });

    // Assemble context from bookmarks
    const context = bookmarks
      .map(
        (b, i) =>
          `[${i + 1}] ${b.title}\n${b.description || "No description"}\nURL: ${b.url}\n${
            b.notes ? `Notes: ${b.notes}\n` : ""
          }${b.tags.length > 0 ? `Tags: ${b.tags.join(", ")}` : ""}`
      )
      .join("\n\n");

    const systemPrompt = `You are a helpful AI assistant that helps users find and understand their saved bookmarks. Answer questions based ONLY on the provided bookmarks below. Always cite sources using [1], [2], etc. that correspond to the bookmark numbers. If the bookmarks don't contain relevant information to answer the question, say so politely.

Available bookmarks:
${context || "No relevant bookmarks found."}`;

    const userPrompt = message;

    // Return context and prompt for the API route to use
    return {
      systemPrompt,
      userPrompt,
      bookmarks: bookmarks.map((b, i) => ({
        id: b._id,
        title: b.title,
        description: b.description,
        url: b.url,
        citationNumber: i + 1,
      })),
    };
  },
});

/**
 * Batch generate embeddings for bookmarks without embeddings
 */
export const batchGenerateEmbeddings = action({
  args: {
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId: providedUserId, limit = 10 }) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = providedUserId || identity.subject;

    // Verify user identity matches
    if (userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Get bookmarks without embeddings
    const bookmarks = await ctx.runQuery(internal.aiChat.getBookmarksWithoutEmbeddings, {
      userId,
      limit,
    });

    const results = [];

    for (const bookmark of bookmarks) {
      try {
        await ctx.runAction(api.aiChat.generateBookmarkEmbedding, {
          bookmarkId: bookmark._id,
        });
        results.push({ bookmarkId: bookmark._id, success: true });
      } catch (error: any) {
        console.error(`Failed to generate embedding for bookmark ${bookmark._id}:`, error);
        results.push({
          bookmarkId: bookmark._id,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      total: bookmarks.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  },
});

/**
 * Get bookmarks without embeddings (internal)
 */
export const getBookmarksWithoutEmbeddings = internalQuery({
  args: {
    userId: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, { userId, limit }) => {
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("embedding"), undefined))
      .take(limit);

    return bookmarks;
  },
});

/**
 * Get count of bookmarks with and without embeddings
 */
export const getEmbeddingStats = action({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, { userId: providedUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = providedUserId || identity.subject;

    if (userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    const stats = await ctx.runQuery(internal.aiChat.countEmbeddings, { userId });
    return stats;
  },
});

/**
 * Count bookmarks with and without embeddings (internal)
 */
export const countEmbeddings = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const allBookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const withEmbeddings = allBookmarks.filter((b) => b.embedding !== undefined).length;
    const withoutEmbeddings = allBookmarks.length - withEmbeddings;

    return {
      total: allBookmarks.length,
      withEmbeddings,
      withoutEmbeddings,
      percentageComplete: allBookmarks.length > 0
        ? Math.round((withEmbeddings / allBookmarks.length) * 100)
        : 0,
    };
  },
});
