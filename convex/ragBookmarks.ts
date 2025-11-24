import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import OpenAI from "openai";

// Search bookmarks using vector similarity (RAG)
export const searchBookmarks = action({
  args: {
    query: v.string(),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<{bookmark: any, transcript?: any}>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Generate embedding for the search query
    let queryEmbedding: number[];
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: args.query,
      });

      queryEmbedding = response.data[0].embedding;
    } catch (error) {
      console.error("Failed to generate query embedding:", error);
      return [];
    }

    // Perform vector search
    const results = await ctx.vectorSearch("bookmarks", "by_embedding", {
      vector: queryEmbedding,
      limit: args.maxResults || 10,
      filter: (doc) => doc.userId === identity.subject,
    });

    // Get full bookmark data and transcripts
    const bookmarksWithContext = await Promise.all(
      results.map(async (result) => {
        const bookmark = await ctx.runQuery("bookmarks:get", { id: result._id });
        if (!bookmark) return null;

        // Get transcript if it exists
        const transcript = bookmark.transcriptId
          ? await ctx.runQuery("transcripts:getForBookmark", { bookmarkId: bookmark._id })
          : null;

        return { bookmark, transcript };
      })
    );

    return bookmarksWithContext.filter(item => item !== null);
  },
});

// Generate AI chat response with RAG context
export const generateChatResponse = action({
  args: {
    userMessage: v.string(),
    context: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      url: v.string(),
      transcript: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Format context for the AI
    const contextText = args.context.map((item, index) => {
      let contextString = `[${index + 1}] **${item.title}**\n`;
      if (item.description) {
        contextString += `Description: ${item.description}\n`;
      }
      if (item.transcript) {
        contextString += `Transcript: ${item.transcript.substring(0, 500)}...\n`;
      }
      contextString += `URL: ${item.url}`;
      return contextString;
    }).join('\n\n');

    const systemPrompt = `You are a helpful AI assistant that helps users find relevant information from their bookmarks.
Use the provided context from the user's bookmarks to answer their questions. Always reference the specific bookmarks by their number [1], [2], etc. when providing information.
If the context doesn't contain relevant information, say so politely and suggest what the user might search for.

Context from bookmarks:
${contextText}`;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using a faster, cheaper model
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: args.userMessage,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Failed to generate AI response:", error);
      return "Sorry, I encountered an error while generating a response. Please try again.";
    }
  },
});

// Update existing bookmark with embedding
export const updateBookmarkEmbedding = action({
  args: {
    bookmarkId: v.id("bookmarks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bookmark = await ctx.runQuery("bookmarks:get", { id: args.bookmarkId });
    if (!bookmark || bookmark.userId !== identity.subject) {
      throw new Error("Bookmark not found or unauthorized");
    }

    // Generate embedding for the bookmark content
    const contentToEmbed = `${bookmark.title || ""} ${bookmark.description || ""} ${bookmark.url}`;

    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: contentToEmbed,
      });

      const embedding = response.data[0].embedding;

      // Update the bookmark with the embedding
      await ctx.runMutation("bookmarks:updateEmbedding", {
        bookmarkId: args.bookmarkId,
        embedding,
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      return { success: false, error: "Failed to generate embedding" };
    }
  },
});

// Chat completion action
export const chatWithBookmarks = action({
  args: {
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { error: "Not authenticated" };
    }

    try {
      // Search for relevant bookmarks
      const searchResults = await ctx.runAction("ragBookmarks:searchBookmarks", {
        query: args.message,
        maxResults: 5,
      });

      // Prepare context for AI
      const context = searchResults.map(item => ({
        title: item.bookmark.title,
        description: item.bookmark.description,
        url: item.bookmark.url,
        transcript: item.transcript?.fullText,
      }));

      // Generate AI response
      const aiResponse = await ctx.runAction("ragBookmarks:generateChatResponse", {
        userMessage: args.message,
        context,
      });

      return {
        response: aiResponse,
        bookmarks: searchResults.map(item => item.bookmark),
      };
    } catch (error) {
      console.error("Chat with bookmarks failed:", error);
      return { error: "Failed to process your request" };
    }
  },
});