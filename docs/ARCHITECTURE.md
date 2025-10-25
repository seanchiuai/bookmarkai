# System Architecture

**Bookmark AI** - Technical architecture and design

**Version**: 1.0
**Last Updated**: October 24, 2025
**Status**: Production Ready (v1.0 Implemented)

---

## Table of Contents

1. [High-Level System Design](#high-level-system-design)
2. [Component Interactions](#component-interactions)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Caching Strategy](#caching-strategy)
5. [Security Architecture](#security-architecture)
6. [Scalability Considerations](#scalability-considerations)
7. [Performance Optimizations](#performance-optimizations)

---

## High-Level System Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BOOKMARK AI ARCHITECTURE                          │
│                      (Convex & Clerk Pre-configured)                 │
└─────────────────────────────────────────────────────────────────────┘

                          ┌─────────────┐
                          │   BROWSER   │
                          │   (Client)  │
                          └──────┬──────┘
                                 │
                    HTTPS / WebSocket (Real-time)
                                 │
                    ┌────────────▼────────────┐
                    │  VERCEL EDGE NETWORK    │
                    │  (Global CDN)           │
                    │  • Static Assets        │
                    │  • Edge Functions       │
                    │  • Automatic HTTPS      │
                    └────────────┬────────────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
       ┌────────▼─────┐  ┌──────▼──────┐  ┌─────▼──────┐
       │   CLERK      │  │   NEXT.JS   │  │  CONVEX    │
       │   (Auth)     │  │   15 APP    │  │  (Backend) │
       │              │  │   ROUTER    │  │            │
       │ • JWT Tokens │  │ • RSC       │  │ • Database │
       │ • Sessions   │◄─┤ • Streaming │◄─┤ • Vector   │
       │ • Users      │  │ • Middleware│  │   Search   │
       └──────────────┘  └─────────────┘  │ • Real-time│
                                          │ • Functions │
                                          └──────┬──────┘
                                                 │
                         ┌───────────────────────┼──────────────┐
                         │                       │              │
                  ┌──────▼──────┐      ┌─────────▼────┐  ┌─────▼─────┐
                  │  OPENAI API │      │  MICROLINK   │  │  YOUTUBE  │
                  │             │      │   API        │  │ TRANSCRIPT│
                  │ • GPT-5     │      │ (Metadata)   │  │   API     │
                  │ • text-     │      │              │  │           │
                  │   embedding │      │ (Free tier)  │  │ (Free)    │
                  │   -3-small  │      │              │  │           │
                  └─────────────┘      └──────────────┘  └───────────┘
```

### Key Architectural Decisions

**1. Serverless-First Architecture**
- No dedicated servers to manage
- Automatic scaling via Vercel Edge Functions
- Convex handles all backend logic (no separate API layer)
- Cost-efficient pay-per-use model

**2. Real-Time by Default**
- Convex WebSocket subscriptions for instant updates
- No polling required for data freshness
- Collaborative-ready architecture (future: multi-user collections)

**3. Edge-Native Design**
- Static pages served from CDN globally
- Server Components reduce JavaScript bundle
- Streaming responses for AI chat (progressive rendering)

**4. Type-Safe End-to-End**
- Convex auto-generates TypeScript types from schema
- Shared types between frontend and backend
- Compile-time error detection

---

## Component Interactions

### Frontend Components (Next.js 15)

**App Router Structure**:
```
/app
  ├── dashboard
  │   ├── bookmarks/page.tsx     # Main bookmarks view (Client Component)
  │   ├── collections/page.tsx   # Collections management
  │   └── chat/page.tsx          # AI chat interface
  ├── api
  │   └── chat/route.ts          # Streaming chat API endpoint (Edge)
  ├── font-test/page.tsx         # Font testing page
  ├── server/page.tsx            # Server-protected route example
  ├── layout.tsx                 # Root layout (Clerk + Convex providers)
  ├── page.tsx                   # Landing page (redirects to bookmarks)
  └── middleware.ts              # Clerk auth middleware (in root)

**Component Hierarchy**:
```
<RootLayout>                              # Clerk provider, theme provider
  └── <ClerkMiddleware>                   # Auth protection
      ├── <LandingPage>                   # Public (unauthenticated)
      └── <DashboardLayout>               # Protected (authenticated)
          ├── <Sidebar>                   # Collections, tags, filters
          │   ├── <CollectionList />      # Real-time Convex query
          │   └── <TagCloud />            # Real-time tag counts
          ├── <Header>
          │   ├── <SearchBar />           # Keyword search
          │   ├── <AIChatToggle />        # Open AI chat panel
          │   └── <AddBookmarkButton />   # Quick add modal
          └── <MainContent>
              ├── <BookmarkGrid />        # Real-time bookmark list
              │   └── <BookmarkCard />    # Individual bookmark
              └── <AIChatPanel />         # AI chat interface
                  ├── <ChatMessages />    # Message history
                  └── <ChatInput />       # User input + streaming
```

**Client vs Server Components**:

| Component | Type | Reason |
|-----------|------|--------|
| `LandingPage` | Server | Static content, SEO benefits |
| `DashboardLayout` | Server | Fetch initial data server-side |
| `BookmarkGrid` | Client | Real-time updates, user interactions |
| `BookmarkCard` | Client | Interactive (edit, delete, drag) |
| `AIChatPanel` | Client | Streaming AI responses, WebSocket |
| `Sidebar` | Client | Real-time filters, drag-and-drop |
| `SearchBar` | Client | Debounced input, instant search |

### Backend Components (Convex)

**Convex Function Architecture**:
```
/convex
  ├── schema.ts                   # Database schema definitions
  ├── bookmarks.ts                # Bookmark CRUD functions
  │   ├── queries                 # Read-only, real-time subscriptions
  │   │   ├── listBookmarks()     # Get user's bookmarks with filters
  │   │   └── getBookmark()       # Get single bookmark
  │   ├── mutations               # Write operations, transactional
  │   │   ├── createBookmark()    # Add bookmark
  │   │   ├── updateBookmark()    # Edit bookmark
  │   │   ├── deleteBookmark()    # Delete bookmark
  │   │   └── createBookmarkInternal() # Internal mutation for YouTube
  │   └── actions                 # External API calls (non-deterministic)
  │       └── extractMetadata()   # Microlink API call
  ├── collections.ts              # Collection management
  │   ├── queries
  │   │   ├── listCollections()
  │   │   └── getCollection()
  │   └── mutations
  │       ├── createCollection()
  │       ├── updateCollection()
  │       └── deleteCollection()
  ├── tags.ts                     # Tag management
  │   ├── queries
  │   │   ├── getAllTags()
  │   │   └── getTagSuggestions()
  │   └── mutations
  │       ├── addTagToBookmark()
  │       └── removeTagFromBookmark()
  ├── youtube.ts                  # YouTube transcript extraction
  │   ├── actions
  │   │   ├── fetchTranscript()   # YouTube Transcript API
  │   │   └── processYouTubeBookmark()
  │   └── queries
  │       └── getYouTubeBookmarks()
  ├── aiChat.ts                   # AI/RAG functions
  │   ├── actions
  │   │   ├── generateEmbedding() # OpenAI API call
  │   │   ├── semanticSearch()    # Vector search
  │   │   ├── streamChatResponse() # GPT-4o streaming chat
  │   │   ├── batchGenerateEmbeddings()
  │   │   └── getEmbeddingStats()
  │   ├── internalQueries
  │   │   ├── vectorSearch()
  │   │   ├── getBookmarksWithoutEmbeddings()
  │   │   └── getBookmark()
  │   └── internalMutations
  │       └── saveEmbedding()
  └── auth.config.ts              # Clerk JWT configuration
```

**Function Types Explained**:

1. **Queries** (Read-only, cached, real-time):
   - Automatically subscribe to changes
   - Can run in parallel
   - Example: `useQuery(api.bookmarks.list, { userId })`

2. **Mutations** (Write operations, transactional):
   - Atomic, serializable isolation
   - Trigger real-time updates to all subscribers
   - Example: `useMutation(api.bookmarks.create)`

3. **Actions** (External API calls, non-deterministic):
   - Can call OpenAI, Microlink, etc.
   - Not transactional
   - Can call mutations internally
   - Example: `useAction(api.ai.chat)`

4. **Internal Functions** (Called by other functions):
   - Not exposed to client
   - Used for code reuse and security
   - Example: `ctx.runMutation(internal.ai.storeEmbedding)`

---

## Data Flow Diagrams

### Flow 1: User Adds a Bookmark

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │ 1. User pastes URL
       │    + clicks "Save"
       ▼
┌──────────────────────┐
│  Next.js Client      │
│  <AddBookmarkDialog> │
└──────┬───────────────┘
       │ 2. useMutation(api.bookmarks.create)
       │    payload: { url, userId }
       ▼
┌──────────────────────┐
│  Convex Mutation     │
│  bookmarks.create()  │
└──────┬───────────────┘
       │ 3. Validate URL, insert to DB
       │    return: { bookmarkId }
       │ 4. Trigger action: fetchMetadata
       ▼
┌──────────────────────┐
│  Convex Action       │
│  fetchMetadata()     │
└──────┬───────────────┘
       │ 5. Call Microlink API
       │    GET https://api.microlink.io/?url=...
       ▼
┌──────────────────────┐
│   Microlink API      │
│   (External)         │
└──────┬───────────────┘
       │ 6. Return metadata:
       │    { title, description, image, favicon }
       ▼
┌──────────────────────┐
│  Convex Action       │
│  fetchMetadata()     │
└──────┬───────────────┘
       │ 7. Call mutation: updateBookmark
       │    payload: { bookmarkId, metadata }
       ▼
┌──────────────────────┐
│  Convex Mutation     │
│  bookmarks.update()  │
└──────┬───────────────┘
       │ 8. Update DB with metadata
       │ 9. Trigger action: generateEmbedding (async)
       │ 10. Real-time push to all subscribers
       ▼
┌──────────────────────┐
│   Browser (Client)   │
│   BookmarkGrid       │
└──────┬───────────────┘
       │ 11. New bookmark appears instantly
       │     (Convex WebSocket update)
       ▼
┌──────────────────────┐
│  Convex Action       │
│  generateEmbedding() │
└──────┬───────────────┘
       │ 12. Call OpenAI API
       │     POST https://api.openai.com/v1/embeddings
       │     model: text-embedding-3-small
       ▼
┌──────────────────────┐
│   OpenAI API         │
└──────┬───────────────┘
       │ 13. Return embedding vector [1536 dims]
       ▼
┌──────────────────────┐
│  Convex Action       │
│  generateEmbedding() │
└──────┬───────────────┘
       │ 14. Call internal mutation: storeEmbedding
       │     payload: { bookmarkId, embedding }
       ▼
┌──────────────────────┐
│  Convex Internal     │
│  storeEmbedding()    │
└──────┬───────────────┘
       │ 15. Update DB with embedding vector
       │ 16. Real-time push to subscribers
       ▼
┌──────────────────────┐
│   Browser (Client)   │
│   BookmarkCard       │
└──────────────────────┘
       │ 17. Bookmark marked as "Indexed" (searchable)
       ▼
     [END]
```

**Key Points**:
- Steps 1-10: ~1-2 seconds (user sees bookmark immediately)
- Steps 11-17: ~2-5 seconds (background embedding, non-blocking)
- Real-time updates at steps 10 and 16 push to all clients
- Error handling at each API boundary

---

### Flow 2: AI Chat Search

```
┌─────────────┐
│   Browser   │
│  (Client)   │
└──────┬──────┘
       │ 1. User types: "find React articles"
       │    + presses Enter
       ▼
┌──────────────────────┐
│  Next.js Client      │
│  <AIChatPanel>       │
└──────┬───────────────┘
       │ 2. useAction(api.ai.chat)
       │    payload: { message, userId, history }
       ▼
┌──────────────────────┐
│  Convex Action       │
│  ai.chat()           │
└──────┬───────────────┘
       │ 3. Generate query embedding
       │    Call OpenAI: text-embedding-3-small
       ▼
┌──────────────────────┐
│   OpenAI API         │
│   (Embeddings)       │
└──────┬───────────────┘
       │ 4. Return query vector [1536 dims]
       ▼
┌──────────────────────┐
│  Convex Action       │
│  ai.chat()           │
└──────┬───────────────┘
       │ 5. Vector search in bookmarks table
       │    SELECT * FROM bookmarks
       │    WHERE userId = <userId>
       │    ORDER BY cosine_similarity(embedding, query_vector)
       │    LIMIT 5
       ▼
┌──────────────────────┐
│  Convex Vector Index │
│  (Built-in)          │
└──────┬───────────────┘
       │ 6. Return top 5 bookmarks with similarity scores:
       │    [bookmark1: 0.92, bookmark2: 0.87, ...]
       ▼
┌──────────────────────┐
│  Convex Action       │
│  ai.chat()           │
└──────┬───────────────┘
       │ 7. Assemble context:
       │    system: "Answer using bookmarks only"
       │    bookmarks: [{ title, description, url }]
       │    question: "find React articles"
       │ 8. Call OpenAI Streaming API
       │    model: GPT-5
       ▼
┌──────────────────────┐
│   OpenAI API         │
│   (Chat Completions) │
└──────┬───────────────┘
       │ 9. Stream response chunks:
       │    "I found" → " 3 " → "React" → " articles" → ...
       ▼
┌──────────────────────┐
│  Convex Action       │
│  ai.chat() (Streaming)│
└──────┬───────────────┘
       │ 10. Forward stream to client (Vercel AI SDK)
       ▼
┌──────────────────────┐
│   Next.js Client     │
│   <ChatMessages>     │
└──────┬───────────────┘
       │ 11. Render stream progressively:
       │     "I found"
       │     "I found 3"
       │     "I found 3 React"
       │     "I found 3 React articles:"
       │     ...
       ▼
┌──────────────────────┐
│   Browser (Client)   │
│   UI Updates         │
└──────────────────────┘
       │ 12. Complete response with citations:
       │     [1] React Performance Guide
       │     [2] React Hooks Tutorial
       │     [3] React 19 Migration
       ▼
     [END]
```

**Key Points**:
- Steps 1-6: ~500-800ms (embedding + vector search)
- Steps 7-12: ~1-2 seconds (streaming response)
- Total time: ~2-3 seconds for complete answer
- Streaming provides immediate feedback to user

---

### Flow 3: Real-Time Collaboration (Future)

```
┌─────────────┐         ┌─────────────┐
│  User A     │         │  User B     │
│  (Browser)  │         │  (Browser)  │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │ 1. User A adds bookmark to shared collection
       ▼                       │
┌──────────────────────┐       │
│  Convex Mutation     │       │
│  bookmarks.create()  │       │
└──────┬───────────────┘       │
       │ 2. Write to database  │
       │ 3. Real-time broadcast to ALL subscribers
       ├───────────────────────┤
       │                       │
       ▼                       ▼
┌──────────────────────┐ ┌──────────────────────┐
│  User A (Browser)    │ │  User B (Browser)    │
│  BookmarkGrid        │ │  BookmarkGrid        │
└──────────────────────┘ └──────────────────────┘
       │                       │
       │ 4. Both see new bookmark instantly
       ▼                       ▼
   [User A: Added]        [User B: Appears]
```

**Technical Implementation**:
- Convex WebSocket subscriptions handle real-time sync
- No additional code needed for collaboration
- Already prepared for multi-user features post-MVP

---

## Caching Strategy

### 1. Browser-Level Caching

**Static Assets** (via Vercel CDN):
```
Cache-Control: public, max-age=31536000, immutable
```
- Next.js static assets (images, fonts, CSS)
- Served from global CDN (200+ locations)
- Versioned URLs prevent stale content

**API Responses** (via HTTP headers):
```
Cache-Control: private, no-cache
```
- Bookmark data always fresh (no caching)
- User-specific content not cached publicly

### 2. Convex Query Caching

**Automatic Optimistic Updates**:
```typescript
// Convex handles caching automatically
const bookmarks = useQuery(api.bookmarks.list, { userId });

// Mutations trigger cache invalidation
const addBookmark = useMutation(api.bookmarks.create);

// Real-time updates refresh cache instantly
```

**How it works**:
1. First query fetches from database
2. Result cached client-side
3. WebSocket subscription keeps cache fresh
4. Mutations invalidate relevant queries
5. No manual cache management needed

### 3. AI Response Caching

**Problem**: Same question asked multiple times wastes OpenAI credits

**Solution**: In-memory cache with TTL

```typescript
// Convex in-memory cache (server-side)
const aiResponseCache = new Map<string, {
  response: string,
  expiresAt: number
}>();

async function cachedAIChat(query: string, bookmarks: Bookmark[]) {
  const cacheKey = hashQuery(query + JSON.stringify(bookmarks));

  const cached = aiResponseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.response; // Return cached response
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [...]
  });

  aiResponseCache.set(cacheKey, {
    response,
    expiresAt: Date.now() + (60 * 60 * 1000) // 1 hour TTL
  });

  return response;
}
```

**Cache Hit Rate Target**: 70%+

**Cache Invalidation**:
- Time-based: Expire after 1 hour
- Event-based: Clear if bookmarks updated
- Size-based: LRU eviction at 10,000 entries

### 4. Metadata Caching

**Problem**: Fetching same URL metadata repeatedly

**Solution**: Store metadata in database, refresh only on demand

```typescript
// Check if metadata exists before fetching
const existingBookmark = await db
  .query('bookmarks')
  .withIndex('by_url', (q) => q.eq('url', url))
  .first();

if (existingBookmark?.metadata) {
  return existingBookmark.metadata; // Use cached metadata
}

// Only fetch if not cached
const metadata = await fetchFromMicrolink(url);
```

**Cache Duration**: Permanent (metadata rarely changes)

### 5. Embedding Caching

**Problem**: Re-generating embeddings wastes OpenAI credits

**Solution**: Never regenerate unless content changes

```typescript
// Only regenerate embedding if content changed
if (updatedFields.includes('title', 'description', 'notes')) {
  await regenerateEmbedding(bookmarkId);
} else {
  // Keep existing embedding
}
```

**Cache Duration**: Permanent (embeddings stored in database)

---

## Security Architecture

### 1. Authentication Flow (Clerk)

**Note**: Clerk is already configured in the template. This section describes how to use it securely.

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ 1. User signs in via Clerk
       ▼
┌──────────────────────┐
│   Clerk (Hosted)     │
│   - OAuth flow       │
│   - MFA (optional)   │
└──────┬───────────────┘
       │ 2. Return JWT token
       ▼
┌──────────────────────┐
│   Browser            │
│   - JWT stored in    │
│     HTTP-only cookie │
└──────┬───────────────┘
       │ 3. Every request includes JWT
       ▼
┌──────────────────────┐
│  Next.js Middleware  │
│  - Validate JWT      │
│  - Extract userId    │
└──────┬───────────────┘
       │ 4. Forward to Convex with userId
       ▼
┌──────────────────────┐
│   Convex Backend     │
│   - Verify JWT       │
│   - Authorize access │
└──────────────────────┘
```

**JWT Claims**:
```json
{
  "sub": "user_abc123",
  "email": "user@example.com",
  "iat": 1698765432,
  "exp": 1698851832
}
```

**Security Features**:
- Tokens expire after 24 hours
- Automatic token refresh (Clerk handles this)
- HTTP-only cookies prevent XSS attacks
- HTTPS-only in production

### 2. Authorization (Row-Level Security)

**Every Convex query/mutation enforces userId filtering**:

```typescript
// BAD: Exposes all users' bookmarks
export const list = query(async ({ db }) => {
  return await db.query('bookmarks').collect(); // INSECURE
});

// GOOD: Only returns authenticated user's bookmarks
export const list = query(async ({ auth, db }) => {
  const identity = await auth.getUserIdentity();
  if (!identity) throw new Error('Unauthorized');

  return await db
    .query('bookmarks')
    .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
    .collect();
});
```

**Authorization Rules**:
1. All queries/mutations MUST call `auth.getUserIdentity()`
2. Filter all database queries by `userId`
3. Never expose other users' data in responses
4. Validate ownership before update/delete operations

**Example: Delete with ownership check**:
```typescript
export const deleteBookmark = mutation(async ({ auth, db }, { bookmarkId }) => {
  const identity = await auth.getUserIdentity();
  if (!identity) throw new Error('Unauthorized');

  const bookmark = await db.get(bookmarkId);
  if (!bookmark) throw new Error('Not found');

  // CRITICAL: Verify ownership before deleting
  if (bookmark.userId !== identity.subject) {
    throw new Error('Forbidden');
  }

  await db.delete(bookmarkId);
});
```

### 3. Data Encryption

**At Rest** (Convex/AWS):
- AES-256 encryption for all database records
- Encrypted backups
- Managed by Convex (no configuration needed)

**In Transit**:
- TLS 1.3 for all HTTPS connections
- WSS (WebSocket Secure) for real-time updates
- Certificate pinning via Vercel

**Secrets Management**:
```bash
# Environment variables (Vercel)
CONVEX_DEPLOYMENT_URL=https://xxx.convex.cloud  # Public
CLERK_SECRET_KEY=sk_test_xxx                    # Private
OPENAI_API_KEY=sk-xxx                           # Private
MICROLINK_API_KEY=xxx                           # Private (if paid tier)
```

**Security Rules**:
- Never expose API keys client-side
- Use Vercel environment variables (encrypted at rest)
- Separate keys for dev/staging/production
- Rotate keys every 90 days

### 4. Rate Limiting

**Application-Level** (Convex):
```typescript
// Limit bookmark creation to 100/hour per user
const rateLimiter = new Map<string, { count: number, resetAt: number }>();

export const create = mutation(async ({ auth, db }, { url }) => {
  const identity = await auth.getUserIdentity();
  const userId = identity.subject;

  const limit = rateLimiter.get(userId);
  const now = Date.now();

  if (limit && limit.resetAt > now) {
    if (limit.count >= 100) {
      throw new Error('Rate limit exceeded. Try again later.');
    }
    limit.count++;
  } else {
    rateLimiter.set(userId, {
      count: 1,
      resetAt: now + (60 * 60 * 1000) // 1 hour
    });
  }

  // Continue with bookmark creation
});
```

**External API Rate Limits**:
- OpenAI: 500 RPM (Tier 1, requires $5+ spend)
- Microlink: 100 requests/day (free tier)
- YouTube Transcript API: No official limit (unofficial API)

**Rate Limit Strategy**:
1. Client-side throttling (debounce search input)
2. Server-side limits per user
3. Exponential backoff for external APIs
4. Queue for bulk operations

### 5. Input Validation

**URL Validation**:
```typescript
import { z } from 'zod';

const urlSchema = z.string().url().max(2000);

export const create = mutation(async ({ auth, db }, { url }) => {
  // Validate URL format
  const validatedUrl = urlSchema.parse(url);

  // Additional checks
  if (validatedUrl.includes('javascript:')) {
    throw new Error('Invalid URL scheme');
  }

  // Continue with creation
});
```

**XSS Prevention**:
- Next.js auto-escapes JSX content
- Use `dangerouslySetInnerHTML` only for sanitized HTML
- CSP headers in production

**SQL Injection Prevention**:
- Convex uses parameterized queries automatically
- No raw SQL executed
- Type-safe query builder

---

## Scalability Considerations

### 1. Database Scaling (Convex)

**Current Limits**:
- Free tier: 0.5 GB storage, 1 GB/month bandwidth
- Professional: 50 GB storage, 50 GB/month bandwidth
- Scales automatically with usage

**Vector Search Limits**:
- Convex supports 1M+ vectors per table
- 1536-dimension vectors (OpenAI embeddings)
- Sub-50ms query latency up to 100K vectors

**When to migrate to Pinecone**:
```
IF (bookmarkCount > 100,000 OR queryLatency > 500ms) {
  migrate to Pinecone for vector search
  keep Convex for relational data
  cost: +$70-100/month
}
```

**Scaling Path**:
| Users | Bookmarks | Convex Tier | Vector DB | Cost |
|-------|-----------|-------------|-----------|------|
| 100 | 10K | Professional | Convex | $40/mo |
| 1K | 100K | Professional | Convex | $60/mo |
| 5K | 500K | Professional | Pinecone | $150/mo |
| 10K+ | 1M+ | Enterprise | Pinecone | $500+/mo |

### 2. Compute Scaling (Vercel)

**Serverless Functions**:
- Auto-scaling from 0 to 1000+ concurrent invocations
- 10-second timeout per function
- Stateless (no local storage)

**Edge Functions**:
- Global deployment (200+ locations)
- Sub-50ms response times
- Lightweight JavaScript runtime

**Cold Start Mitigation**:
- Keep functions warm with periodic pings
- Use Edge Middleware for auth checks (instant)
- Lazy load heavy dependencies

### 3. Bandwidth Optimization

**Image Optimization**:
```typescript
import Image from 'next/image';

<Image
  src={bookmark.imageUrl}
  alt={bookmark.title}
  width={400}
  height={200}
  placeholder="blur"
  blurDataURL={bookmark.blurHash} // Low-quality placeholder
/>
```

**Benefits**:
- Automatic WebP/AVIF conversion
- Responsive image sizing
- Lazy loading below fold
- ~50% bandwidth reduction

**Code Splitting**:
```typescript
// Lazy load AI chat panel (reduces initial bundle)
const AIChatPanel = dynamic(() => import('@/components/AIChatPanel'), {
  loading: () => <ChatSkeleton />,
  ssr: false
});
```

### 4. Cost Projections

**At 100 Users**:
```
Convex:      $10/mo  (storage + bandwidth)
OpenAI:      $5/mo   (embeddings + chat)
Vercel:      $30/mo  (Pro plan)
Clerk:       $0/mo   (free tier)
Total:       $45/mo
```

**At 1,000 Users**:
```
Convex:      $40/mo
OpenAI:      $30/mo
Vercel:      $50/mo
Clerk:       $25/mo  (exceeded free tier)
Total:       $145/mo
```

**At 10,000 Users**:
```
Convex:      $150/mo
OpenAI:      $200/mo
Vercel:      $100/mo
Clerk:       $25/mo
Pinecone:    $100/mo (vector search)
Total:       $575/mo
```

---

## Performance Optimizations

### 1. Database Indexes

**Convex Schema with Indexes**:
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  bookmarks: defineTable({
    userId: v.string(),
    url: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    collectionId: v.optional(v.id('collections')),
    tags: v.array(v.string()),
    embedding: v.optional(v.array(v.float64())),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])              // List user's bookmarks
    .index('by_collectionId', ['collectionId'])  // Filter by collection
    .index('by_tags', ['tags'])                  // Filter by tags
    .index('by_url', ['url'])                    // Check duplicates
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['userId']                   // Search only user's bookmarks
    }),
});
```

**Index Usage**:
- `by_userId`: 100% of queries (always filter by user)
- `by_collectionId`: Collection filtering
- `by_tags`: Tag filtering
- `by_embedding`: AI semantic search

**Query Performance**:
```typescript
// SLOW: No index (full table scan)
await db.query('bookmarks').filter(q => q.eq(q.field('userId'), userId)).collect();

// FAST: Uses index (O(log n) lookup)
await db.query('bookmarks').withIndex('by_userId', q => q.eq('userId', userId)).collect();
```

### 2. Lazy Loading

**Infinite Scroll for Bookmarks**:
```typescript
// Load 20 bookmarks at a time
const { results, loadMore, status } = usePaginatedQuery(
  api.bookmarks.list,
  { userId },
  { initialNumItems: 20 }
);

// Load more when user scrolls to bottom
<InfiniteScroll onLoadMore={loadMore}>
  {results.map(bookmark => <BookmarkCard key={bookmark._id} {...bookmark} />)}
</InfiniteScroll>
```

**Benefits**:
- Faster initial page load
- Reduced bandwidth
- Better perceived performance

### 3. Debouncing and Throttling

**Search Input Debouncing**:
```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebouncedValue(searchTerm, 300); // 300ms delay

const results = useQuery(api.bookmarks.search, {
  userId,
  query: debouncedSearch
});
```

**Benefits**:
- Reduce API calls by 90%
- Prevent Convex rate limits
- Better UX (no flickering results)

### 4. Parallel Requests

**Load Dashboard Data in Parallel**:
```typescript
// BAD: Sequential (slow)
const bookmarks = await db.query('bookmarks').collect();
const collections = await db.query('collections').collect();
const tags = await db.query('tags').collect();

// GOOD: Parallel (fast)
const [bookmarks, collections, tags] = await Promise.all([
  db.query('bookmarks').collect(),
  db.query('collections').collect(),
  db.query('tags').collect()
]);
```

**Savings**: 3x faster dashboard load

### 5. AI Response Streaming

**Instead of waiting for complete response**:
```typescript
// BAD: Wait for full response (3+ seconds)
const response = await openai.chat.completions.create({...});
return response.choices[0].message.content;

// GOOD: Stream response (immediate feedback)
const stream = await openai.chat.completions.create({
  model: 'gpt-5',
  stream: true,
  ...
});

for await (const chunk of stream) {
  yield chunk.choices[0].delta.content;
}
```

**Benefits**:
- Perceived latency: ~200ms (vs 3+ seconds)
- Better UX (progressive rendering)
- Users can read while AI generates

---

## Monitoring and Observability

### 1. Error Tracking (Sentry)

**Setup** (already in template):
```typescript
// app/layout.tsx
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

**What to monitor**:
- Unhandled exceptions
- API errors (OpenAI, Microlink)
- Database query failures
- Authentication errors

### 2. Performance Monitoring

**Core Web Vitals** (Vercel Analytics):
- LCP (Largest Contentful Paint): <2.5s
- FID (First Input Delay): <100ms
- CLS (Cumulative Layout Shift): <0.1

**Custom Metrics**:
```typescript
// Track AI search latency
const startTime = Date.now();
const response = await aiSearch(query);
const latency = Date.now() - startTime;

// Log to Vercel Analytics
analytics.track('ai_search', { latency, resultCount: response.length });
```

### 3. Logging

**Convex Logging**:
```typescript
export const create = mutation(async ({ auth, db }, { url }) => {
  console.log('[BOOKMARK_CREATE]', { userId: auth.userId, url });

  try {
    const result = await db.insert('bookmarks', {...});
    console.log('[BOOKMARK_CREATE_SUCCESS]', { bookmarkId: result });
    return result;
  } catch (error) {
    console.error('[BOOKMARK_CREATE_ERROR]', { error, url });
    throw error;
  }
});
```

**Log Levels**:
- `console.log`: Informational events
- `console.warn`: Recoverable errors
- `console.error`: Critical failures

---

## Disaster Recovery

### 1. Backup Strategy

**Convex Automatic Backups**:
- Point-in-time recovery (last 30 days)
- Managed by Convex (no configuration needed)
- Restore via Convex dashboard

**Manual Backups** (additional):
```typescript
// Export all user data as JSON
export const exportData = query(async ({ auth, db }) => {
  const identity = await auth.getUserIdentity();

  const bookmarks = await db
    .query('bookmarks')
    .withIndex('by_userId', q => q.eq('userId', identity.subject))
    .collect();

  const collections = await db
    .query('collections')
    .withIndex('by_userId', q => q.eq('userId', identity.subject))
    .collect();

  return { bookmarks, collections };
});
```

**Backup Frequency**: Daily automated, on-demand manual

### 2. Incident Response

**If OpenAI API down**:
1. Detect failure (Sentry alert)
2. Show user-friendly error message
3. Fallback to keyword search
4. Queue failed embedding jobs for retry
5. Monitor OpenAI status page

**If Convex down**:
1. Vercel health check fails
2. Show maintenance page
3. Wait for Convex recovery (SLA: 99.9% uptime)
4. No data loss (automatic recovery)

---

## Summary

This architecture document covers:
- ✅ High-level system design (6 components)
- ✅ Component interactions (frontend + backend)
- ✅ Data flow diagrams (3 critical flows)
- ✅ Caching strategy (5 layers)
- ✅ Security architecture (5 pillars)
- ✅ Scalability considerations (100 to 10K users)
- ✅ Performance optimizations (5 techniques)

**Key Architectural Principles**:
1. **Serverless-first**: No servers to manage
2. **Real-time by default**: Instant updates across clients
3. **Type-safe end-to-end**: TypeScript everywhere
4. **Security-first**: Row-level security, encryption, rate limiting
5. **Optimized for performance**: Caching, indexes, streaming

**Next Steps**: Implement this architecture using the pre-configured Convex and Clerk setup in the template.
