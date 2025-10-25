# Roadmap: RAG Chat Interface

## Context

**Tech Stack**: Next.js 15, Convex, Clerk, OpenAI API (GPT-5, text-embedding-3-small), Vercel AI SDK, shadcn/ui

**Feature Description**: AI-powered chat interface enabling users to search their bookmark collection using natural language queries via Retrieval-Augmented Generation (RAG).

**User Value**: Users can ask questions like "show me articles about React performance" and receive AI-generated responses with relevant bookmark citations, summaries, and explanations of relevance.

## Implementation Steps

Each step is mandatory for shipping RAG Chat Interface.

### 1. Manual Setup (User Required)

- [ ] Create OpenAI account at https://platform.openai.com
- [ ] Generate OpenAI API key in API Keys section
- [ ] Add minimum $5 credit to upgrade to Tier 1 (500 RPM rate limit)
- [ ] Verify Convex deployment has vector search enabled (check dashboard)
- [ ] Confirm Clerk authentication is configured and working

### 2. Dependencies & Environment

**NPM Packages**:
```bash
npm install ai openai
npm install --save-dev @types/node
```

**Environment Variables** (`.env.local`):
```bash
# Frontend
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-key>

# Backend (set in Convex Dashboard → Settings → Environment Variables)
OPENAI_API_KEY=<your-openai-api-key>
CLERK_JWT_ISSUER_DOMAIN=<your-clerk-jwt-issuer>
```

### 3. Database Schema

**File**: `convex/schema.ts`

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

  collections: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

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
```

### 4. Backend Functions

**File**: `convex/aiChat.ts`

#### Actions

**`generateEmbedding`** (Internal Action)
- **Purpose**: Generate 1536-dim embedding vector for text using OpenAI API
- **Args**: `{ text: v.string() }`
- **Returns**: `number[]` (1536-dimension array)
- **Auth**: No auth required (internal only)
- **Implementation**:
  - Call OpenAI `embeddings.create()` with model `text-embedding-3-small`
  - Truncate input to 8000 chars to respect token limits
  - Implement retry logic with exponential backoff (3 attempts)
  - Handle API errors gracefully

**`semanticSearch`** (Action)
- **Purpose**: Perform vector similarity search to find relevant bookmarks
- **Args**: `{ query: v.string(), userId: v.string(), limit: v.optional(v.number()) }`
- **Returns**: Array of bookmark objects with similarity scores
- **Auth**: Verify `ctx.auth.getUserIdentity()` exists
- **Implementation**:
  - Generate query embedding via `internal.aiChat.generateEmbedding`
  - Call `ctx.runQuery(internal.aiChat.vectorSearch)` with embedding
  - Filter results by userId for data isolation
  - Return top K results (default K=5)

**`streamChatResponse`** (Action)
- **Purpose**: Generate GPT-5 streaming response with bookmark context
- **Args**: `{ message: v.string(), userId: v.string(), history: v.optional(v.array(v.any())) }`
- **Returns**: Streaming response object
- **Auth**: Verify `ctx.auth.getUserIdentity()` matches userId
- **Implementation**:
  - Find relevant bookmarks via `semanticSearch`
  - Assemble context: bookmarks with [1], [2], etc. citations
  - Build system prompt: "Answer based ONLY on provided bookmarks. Always cite sources."
  - Call OpenAI chat completions with `model: "gpt-5"`, `stream: true`
  - Return stream for client consumption

#### Internal Queries

**`vectorSearch`** (Internal Query)
- **Purpose**: Execute vector similarity query on Convex vector index
- **Args**: `{ embedding: v.array(v.float64()), userId: v.string(), limit: v.number() }`
- **Returns**: Array of bookmarks sorted by similarity
- **Implementation**:
  - Use `ctx.db.query("bookmarks").withIndex("by_embedding")`
  - Filter by `userId` for row-level security
  - Apply similarity threshold (>0.7 for quality control)
  - Sort by similarity score descending

#### Mutations

**`saveEmbedding`** (Internal Mutation)
- **Purpose**: Store generated embedding in bookmark record
- **Args**: `{ bookmarkId: v.id("bookmarks"), embedding: v.array(v.float64()) }`
- **Returns**: Success boolean
- **Implementation**:
  - Verify bookmark exists
  - Update `embedding` field
  - Update `updatedAt` timestamp

### 5. Frontend

**File**: `app/api/chat/route.ts` (API Route Handler)
- **Purpose**: Bridge Next.js frontend and Convex backend for streaming
- **Implementation**:
  - Extract user ID from Clerk session
  - Call `convex.action(api.aiChat.semanticSearch)` to get bookmarks
  - Assemble context from bookmarks
  - Use Vercel AI SDK `streamText()` with GPT-5
  - Return `response.toAIStreamResponse()`

**File**: `app/dashboard/chat/page.tsx`
- **Purpose**: Main chat interface page
- **Components**: `<ChatInterface />`, `<ChatHeader />`, `<BookmarkCitations />`
- **Hooks**:
  - `useChat()` from Vercel AI SDK for message management
  - `useAction(api.aiChat.streamChatResponse)` for Convex integration
- **State**: Messages array, input string, loading state, citations
- **Layout**: Full-height chat container, sticky input at bottom

**Component**: `components/chat/ChatInterface.tsx`
- **Purpose**: Reusable chat UI with streaming support
- **Props**: `messages`, `input`, `handleInputChange`, `handleSubmit`, `isLoading`
- **Features**:
  - Message bubbles (user vs assistant styling)
  - Streaming indicator (typing animation)
  - Citation links in markdown format [1], [2]
  - Auto-scroll to latest message
  - Copy message to clipboard button

**Component**: `components/chat/BookmarkCitation.tsx`
- **Purpose**: Display bookmark preview when cited
- **Props**: `bookmark` object, `citationNumber`
- **Features**:
  - Thumbnail image with fallback
  - Title and description truncation
  - Click to open bookmark in new tab
  - Hover effect with shadow

**Component**: `components/chat/ChatInput.tsx`
- **Purpose**: Message input with send button
- **Features**:
  - Textarea with auto-resize (max 4 lines)
  - Enter to send, Shift+Enter for new line
  - Send button disabled when empty or loading
  - Character count indicator (optional)

### 6. Error Prevention

**Convex Validators**:
- [ ] All actions use `v.string()`, `v.number()`, `v.id()` validators
- [ ] Validate embedding arrays with `v.array(v.float64())`
- [ ] Validate userId matches authenticated user

**Authentication**:
- [ ] Every action checks `ctx.auth.getUserIdentity()`
- [ ] Verify userId from auth matches args userId
- [ ] Return 401 error if no identity found

**Authorization**:
- [ ] Vector search filters by userId (prevent cross-user data leakage)
- [ ] Bookmarks query enforces row-level security
- [ ] No admin bypass for testing in production

**Type Safety**:
- [ ] Use generated Convex types (`Id<"bookmarks">`, `Doc<"bookmarks">`)
- [ ] Properly type OpenAI API responses
- [ ] Type streaming response handlers

**Rate Limiting**:
- [ ] Implement request throttling (max 10 chat messages/minute per user)
- [ ] Queue embedding generation to avoid OpenAI rate limits
- [ ] Cache embeddings permanently (never regenerate unless content changes)

**Error Handling**:
- [ ] Wrap OpenAI API calls in try-catch
- [ ] Implement exponential backoff for transient failures
- [ ] Display user-friendly error messages (not raw API errors)
- [ ] Log errors to Sentry for monitoring

### 7. Testing

**Unit Tests**:
- [ ] Test `generateEmbedding` with mock OpenAI responses
- [ ] Test `vectorSearch` query filtering logic
- [ ] Test citation extraction from markdown
- [ ] Test URL parsing for bookmark links

**Integration Tests**:
- [ ] Create test bookmarks → generate embeddings → verify searchable
- [ ] Test semantic search returns relevant results
- [ ] Test chat response includes proper citations [1], [2]
- [ ] Test authentication rejection for unauthenticated users

**End-to-End Tests (Playwright)**:
- [ ] User types query "show me React articles"
- [ ] Verify AI response streams to UI
- [ ] Click citation [1] → verify navigates to bookmark
- [ ] Test empty state when no relevant bookmarks found
- [ ] Test error handling when OpenAI API fails

**Manual Testing Checklist**:
- [ ] Add 10-20 test bookmarks on various topics
- [ ] Generate embeddings for all bookmarks
- [ ] Ask questions covering different topics
- [ ] Verify relevance of returned bookmarks
- [ ] Check citation numbers match correct bookmarks
- [ ] Test streaming works smoothly without stuttering
- [ ] Verify mobile responsive chat interface
- [ ] Test with multiple user accounts (no data leakage)

## Documentation Sources

1. Vercel AI SDK - https://sdk.vercel.ai/docs
2. OpenAI Embeddings Guide - https://platform.openai.com/docs/guides/embeddings
3. Convex Vector Search - https://docs.convex.dev/vector-search
4. Convex Actions - https://docs.convex.dev/production/actions
5. Clerk Authentication - https://clerk.com/docs/references/nextjs/overview
6. Next.js 15 App Router - https://nextjs.org/docs/app
7. shadcn/ui Components - https://ui.shadcn.com/docs
