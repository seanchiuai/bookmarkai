---
name: agent-rag-chat
description: AI-powered chat interface using Retrieval-Augmented Generation with GPT-5 and Convex vector search
model: inherit
color: purple
tech_stack:
  framework: Next.js 15
  database: Convex
  auth: Clerk
  provider: OpenAI (GPT-5, text-embedding-3-small)
generated: 2025-10-24T19:32:00Z
documentation_sources: [
  "https://sdk.vercel.ai/docs",
  "https://platform.openai.com/docs/guides/embeddings",
  "https://docs.convex.dev/vector-search",
  "https://docs.convex.dev/production/actions",
  "https://clerk.com/docs/references/nextjs/overview"
]
---

# Agent: RAG Chat Interface Implementation

## Agent Overview

**Purpose**: Implement an AI-powered chat interface that enables users to search their bookmark collection using natural language queries. The system uses Retrieval-Augmented Generation (RAG) to find semantically similar bookmarks via vector search, then generates contextual responses with GPT-5 that explain relevance and provide summaries. Chat responses stream to the UI for better UX.

**Tech Stack**: Next.js 15, Convex (database + vector search), Clerk (authentication), OpenAI API (GPT-5 for chat, GPT-4o-mini for internal operations, text-embedding-3-small for embeddings), Vercel AI SDK (streaming)

**Source**: Vercel AI SDK documentation, OpenAI Embeddings Guide, Convex Vector Search docs, Convex Actions guide

## Critical Implementation Knowledge

### OpenAI & Vercel AI SDK Latest Updates 🚨

* **GPT-5**: Latest model with improved reasoning and context understanding - use for user-facing chat responses
* **GPT-4o-mini**: Cost-efficient model suitable for internal RAG operations like query rewriting
* **text-embedding-3-small**: 1536-dimension embeddings at $0.02/1M tokens - optimal cost/performance for MVP
* **Vercel AI SDK**: Supports streaming responses with `streamText()` function - integrates with React Server Components
* **Convex Actions**: 30-second timeout for external API calls - sufficient for embedding generation and GPT queries

### Common Pitfalls & Solutions 🚨

* **Pitfall**: OpenAI free tier rate limits (3 RPM) block development
  * **Solution**: Upgrade to Tier 1 ($5+ spend) immediately for 500 RPM - essential for MVP

* **Pitfall**: Large context windows exceed GPT token limits
  * **Solution**: Limit retrieved bookmarks to top 5 results, chunk long content to 500-1000 chars

* **Pitfall**: Vector search returns irrelevant results
  * **Solution**: Use metadata filters (tags, collections) + similarity threshold (>0.7) for quality control

* **Pitfall**: Streaming breaks with Convex queries
  * **Solution**: Use Convex Actions (not queries) for OpenAI calls - actions support external HTTP requests

* **Pitfall**: Authentication state missing in API routes
  * **Solution**: Always call `ctx.auth.getUserIdentity()` in Convex functions - enforces row-level security

### Best Practices 🚨

* **DO**: Cache embeddings permanently - never regenerate unless content changes
* **DO**: Implement exponential backoff for OpenAI API failures with 3 retry attempts
* **DO**: Filter vector search results by userId to prevent data leakage between users
* **DO**: Stream responses to UI using Vercel AI SDK - improves perceived performance
* **DO**: Include citations in responses linking back to source bookmarks
* **DON'T**: Store API keys client-side - always use server-side Convex actions
* **DON'T**: Skip authentication checks - every Convex function must verify user identity
* **DON'T**: Embed entire web pages - chunk to 500-1000 chars focusing on title + description + notes

## Implementation Steps

**Architecture Overview**: User submits natural language query → Frontend calls Convex action → Action generates query embedding via OpenAI → Convex vector search finds top 5 similar bookmarks → Assemble context (query + bookmarks) → Stream GPT-5 response via Vercel AI SDK → Display with citations in UI.

### Backend Implementation

**File**: `convex/aiChat.ts`
* **Purpose**: Convex actions for RAG pipeline (embedding generation, vector search, GPT streaming)
* **Functions**:
  * `generateEmbedding(text: string)` - Call OpenAI API to generate 1536-dim vector
  * `semanticSearch(query: string, userId: string, limit: number)` - Perform vector similarity search
  * `streamChatResponse(message: string, userId: string)` - RAG pipeline with GPT-5 streaming

**File**: `convex/embeddings.ts`
* **Purpose**: Manage embedding generation and updates for bookmarks
* **Functions**:
  * `generateBookmarkEmbedding(bookmarkId: Id<"bookmarks">)` - Create embedding for single bookmark
  * `batchGenerateEmbeddings(userId: string)` - Queue processing for bulk embedding generation

### Frontend Integration

**Component**: `app/dashboard/chat/page.tsx`
* **Purpose**: Main chat interface page with streaming responses
* **Hooks**: `useChat` from Vercel AI SDK, `useAction` for Convex actions
* **UI**: Chat message list, input field, loading states, citation links

**Component**: `components/chat/ChatInterface.tsx`
* **Purpose**: Reusable chat UI with message bubbles and streaming support
* **Features**: Message history, streaming indicators, bookmark citations, copy to clipboard

**Component**: `components/chat/BookmarkCitation.tsx`
* **Purpose**: Display bookmark preview when cited in AI response
* **Features**: Thumbnail, title, description, click to open full bookmark

## Code Patterns

### `convex/aiChat.ts`

```typescript
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate embedding for text using OpenAI
export const generateEmbedding = internalAction({
  args: { text: v.string() },
  handler: async (ctx, { text }) => {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000), // Truncate to token limit
      });

      return response.data[0].embedding; // Returns 1536-dim array
    } catch (error) {
      console.error("Embedding generation failed:", error);
      throw new Error("Failed to generate embedding");
    }
  },
});

// Semantic search using vector similarity
export const semanticSearch = action({
  args: {
    query: v.string(),
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { query, userId, limit = 5 }) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
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

// Stream GPT-5 response with bookmark context
export const streamChatResponse = action({
  args: {
    message: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { message, userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Find relevant bookmarks
    const bookmarks = await ctx.runAction(api.aiChat.semanticSearch, {
      query: message,
      userId,
      limit: 5,
    });

    // Assemble context for GPT
    const context = bookmarks
      .map((b, i) => `[${i + 1}] ${b.title}\n${b.description || ""}\n${b.url}`)
      .join("\n\n");

    const systemPrompt = `You are a helpful AI assistant that helps users find and understand their saved bookmarks. Answer questions based ONLY on the provided bookmarks. Always cite sources using [1], [2], etc. If the bookmarks don't contain relevant information, say so.`;

    const userPrompt = `User's bookmarks:\n\n${context}\n\nUser's question: ${message}`;

    // Stream response using OpenAI
    const stream = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 1000,
    });

    return stream;
  },
});
```

**Validation**: This action authenticates users, generates embeddings, performs vector search, and streams GPT-5 responses with bookmark citations. Error handling prevents API failures from crashing the app.

### `convex/schema.ts` (Vector Index Addition)

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
    transcript: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())), // 1536-dim vector
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_collectionId", ["collectionId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId"], // Ensure user data isolation
    }),
});
```

**Validation**: Vector index on `embedding` field enables semantic search. Filter by `userId` prevents cross-user data leakage.

### `app/dashboard/chat/page.tsx`

```typescript
"use client";

import { useChat } from "ai/react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function ChatPage() {
  const streamChat = useAction(api.aiChat.streamChatResponse);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat", // Route handler for streaming
  });

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">AI Chat</h1>
      <ChatInterface
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
```

**Validation**: Uses Vercel AI SDK's `useChat` hook for streaming support. Integrates with Convex action via API route.

### `app/api/chat/route.ts`

```typescript
import { OpenAI } from "openai";
import { streamText } from "ai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const { messages } = await req.json();
  const lastMessage = messages[messages.length - 1];

  // Get user from Clerk (implement auth middleware)
  const userId = "user-id-from-clerk"; // TODO: Extract from Clerk session

  // Find relevant bookmarks via Convex
  const bookmarks = await convex.action(api.aiChat.semanticSearch, {
    query: lastMessage.content,
    userId,
    limit: 5,
  });

  const context = bookmarks
    .map((b, i) => `[${i + 1}] ${b.title}\n${b.description || ""}\n${b.url}`)
    .join("\n\n");

  const systemPrompt = `You are a helpful AI assistant that helps users find and understand their saved bookmarks. Answer questions based ONLY on the provided bookmarks. Always cite sources using [1], [2], etc.`;

  const response = await streamText({
    model: openai("gpt-5"),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `User's bookmarks:\n\n${context}\n\nUser's question: ${lastMessage.content}` },
    ],
  });

  return response.toAIStreamResponse();
}
```

**Validation**: API route bridges Next.js frontend and Convex backend. Streams GPT-5 responses using Vercel AI SDK.

## Testing & Debugging

* **Convex Dashboard**: Monitor action logs, inspect database records, verify vector index population
* **OpenAI Playground**: Test prompts and embeddings independently before integrating
* **Browser DevTools Network Tab**: Inspect streaming responses, check for authentication headers
* **Convex Logs**: Track embedding generation progress, debug vector search queries
* **Unit Tests**: Test embedding generation, vector search logic, citation extraction
* **End-to-End Tests (Playwright)**: Simulate user typing query → verify streaming response → check citations
* **Clerk Dashboard**: Verify JWT tokens being passed correctly to Convex

## Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_CONVEX_URL=<convex-deployment-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk-publishable-key>
```

### Backend (Convex Dashboard)
```bash
OPENAI_API_KEY=<openai-api-key>              # GPT-5 and embeddings
CLERK_JWT_ISSUER_DOMAIN=<clerk-jwt-issuer>   # e.g., https://your-app.clerk.accounts.dev
```

## Success Metrics

* ✅ Semantic search returns relevant bookmarks (subjective validation by testing with sample queries)
* ✅ Search latency <500ms P95 (measure via Convex dashboard performance metrics)
* ✅ RAG response time <3 seconds from query to first token streamed
* ✅ GPT-5 responses include proper citations [1], [2], etc. linking to source bookmarks
* ✅ Streaming works smoothly in UI without blocking
* ✅ Authentication enforced - users only see their own bookmarks in results
* ✅ No cross-user data leakage (test with multiple user accounts)
* ✅ Graceful error handling if OpenAI API fails (display friendly error message)
* ✅ Cache hit rate for embeddings >90% (only generate once per bookmark)
* ✅ Zero client-side API key exposure (verify in browser DevTools)
