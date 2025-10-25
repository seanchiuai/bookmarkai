# Backend Structure Documentation

**Bookmark AI** - Convex backend architecture and conventions

**Version**: 1.0
**Last Updated**: October 24, 2025
**Status**: Production Ready (v1.0 Implemented)

---

## Table of Contents

1. [Convex Functions Architecture](#convex-functions-architecture)
2. [Database Schema Design](#database-schema-design)
3. [Authentication and Authorization](#authentication-and-authorization)
4. [Middleware Structure](#middleware-structure)
5. [Error Handling and Logging](#error-handling-and-logging)
6. [Folder Organization](#folder-organization)

---

## Convex Functions Architecture

### Overview

**Note**: Convex is already configured in the template. This section describes how to write Convex functions for building features.

Convex provides four types of functions:

| Type | Purpose | Can Call External APIs? | Transactional? | Real-time? |
|------|---------|------------------------|----------------|------------|
| **Query** | Read data | No | No | Yes |
| **Mutation** | Write data | No | Yes | Yes |
| **Action** | External API calls | Yes | No | No |
| **Internal** | Helper functions | No | Depends | No |

### Queries (Read-only, Real-time)

**Purpose**: Fetch data from database, subscribe to changes

**Example: List bookmarks**:
```typescript
// convex/bookmarks.ts
import { query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {
    collectionId: v.optional(v.id('collections')),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    // Query bookmarks filtered by userId
    let query = ctx.db
      .query('bookmarks')
      .withIndex('by_userId', (q) => q.eq('userId', identity.subject));

    // Apply filters
    if (args.collectionId) {
      query = query.filter((q) => q.eq(q.field('collectionId'), args.collectionId));
    }

    if (args.tags && args.tags.length > 0) {
      query = query.filter((q) =>
        args.tags!.some((tag) => q.field('tags').includes(tag))
      );
    }

    // Execute query
    const bookmarks = await query.order('desc').take(100);

    return bookmarks;
  },
});
```

**Frontend usage**:
```typescript
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

const bookmarks = useQuery(api.bookmarks.list, {
  collectionId: 'collection-123',
  tags: ['react', 'nextjs'],
});

// bookmarks === undefined → Loading
// bookmarks === [] → Empty
// bookmarks === [Bookmark] → Data loaded
```

**Key Points**:
- Queries are cached and auto-update via WebSocket
- Always filter by `userId` for data isolation
- Use indexes for fast lookups
- Return `undefined` for loading state (never throw in queries)

### Mutations (Write Operations, Transactional)

**Purpose**: Create, update, delete data in database

**Example: Create bookmark**:
```typescript
// convex/bookmarks.ts
import { mutation } from './_generated/server';
import { v } from 'convex/values';

export const create = mutation({
  args: {
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    collectionId: v.optional(v.id('collections')),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Authentication check
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    // Validate URL
    if (!isValidUrl(args.url)) {
      throw new Error('Invalid URL format');
    }

    // Check for duplicates
    const existing = await ctx.db
      .query('bookmarks')
      .withIndex('by_url', (q) => q.eq('url', args.url).eq('userId', identity.subject))
      .first();

    if (existing) {
      throw new Error('Bookmark already exists');
    }

    // Insert bookmark
    const bookmarkId = await ctx.db.insert('bookmarks', {
      userId: identity.subject,
      url: args.url,
      title: args.title || new URL(args.url).hostname,
      description: args.description,
      collectionId: args.collectionId,
      tags: args.tags || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Schedule metadata fetching (async action)
    await ctx.scheduler.runAfter(0, internal.bookmarks.fetchMetadata, {
      bookmarkId,
    });

    return bookmarkId;
  },
});
```

**Frontend usage**:
```typescript
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

const addBookmark = useMutation(api.bookmarks.create);

const handleSubmit = async () => {
  try {
    const bookmarkId = await addBookmark({
      url: 'https://nextjs.org',
      tags: ['nextjs', 'documentation'],
    });
    toast.success('Bookmark added!');
  } catch (error) {
    toast.error(error.message);
  }
};
```

**Key Points**:
- Mutations are atomic (all-or-nothing)
- Throw errors for validation failures
- Always verify `userId` before updates/deletes
- Trigger real-time updates to all subscribers
- Use `ctx.scheduler.runAfter` for async work

### Actions (External API Calls)

**Purpose**: Call external APIs (OpenAI, Microlink, etc.)

**Example: Fetch metadata**:
```typescript
// convex/bookmarks.ts
import { action } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

export const fetchMetadata = action({
  args: {
    url: v.string(),
  },
  handler: async (ctx, args) => {
    // Call external API (Microlink)
    const response = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(args.url)}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch metadata');
    }

    const data = await response.json();

    // Extract metadata
    const metadata = {
      title: data.data.title,
      description: data.data.description,
      imageUrl: data.data.image?.url,
      faviconUrl: data.data.logo?.url,
    };

    return metadata;
  },
});
```

**Example: AI chat with streaming**:
```typescript
// convex/ai.ts
import { action } from './_generated/server';
import { api } from './_generated/api';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const chat = action({
  args: {
    message: v.string(),
    history: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    // 1. Generate query embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: args.message,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // 2. Vector search bookmarks
    const results = await ctx.runQuery(api.bookmarks.vectorSearch, {
      embedding: queryEmbedding,
      limit: 5,
    });

    // 3. Assemble context
    const context = results.map((r) => ({
      title: r.title,
      description: r.description,
      url: r.url,
    }));

    // 4. Stream GPT response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Answer based on the user\'s bookmarks only. Include citations.',
        },
        {
          role: 'user',
          content: `Context: ${JSON.stringify(context)}\n\nQuestion: ${args.message}`,
        },
      ],
      stream: true,
    });

    // Return stream to client
    return stream;
  },
});
```

**Frontend usage (streaming)**:
```typescript
import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

const chat = useAction(api.ai.chat);

const handleSend = async (message: string) => {
  const stream = await chat({ message });

  // Handle stream
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      setResponse((prev) => prev + content);
    }
  }
};
```

### Internal Functions (Helper Functions)

**Purpose**: Reusable functions called by other Convex functions (not exposed to client)

**Example: Store embedding**:
```typescript
// convex/ai.ts
import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const storeEmbedding = internalMutation({
  args: {
    bookmarkId: v.id('bookmarks'),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    // Update bookmark with embedding
    await ctx.db.patch(args.bookmarkId, {
      embedding: args.embedding,
      updatedAt: Date.now(),
    });
  },
});
```

**Calling internal functions**:
```typescript
// From an action
await ctx.runMutation(internal.ai.storeEmbedding, {
  bookmarkId: 'bookmark-123',
  embedding: [0.1, 0.2, 0.3, ...],
});
```

**Key Points**:
- Prefix with `internal` (not exposed to client)
- Used for code reuse and security
- Can be queries, mutations, or actions

---

## Database Schema Design

### Schema Definition

**Note**: Convex auto-generates TypeScript types from schema.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // Bookmarks table
  bookmarks: defineTable({
    userId: v.string(),              // From Clerk (e.g., "user_abc123")
    url: v.string(),                 // Original URL
    title: v.string(),               // Extracted or manual
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    collectionId: v.optional(v.id('collections')),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),   // User notes
    transcript: v.optional(v.string()), // YouTube transcript
    embedding: v.optional(v.array(v.float64())), // 1536-dim vector
    createdAt: v.number(),           // Timestamp (ms)
    updatedAt: v.number(),
  })
    // Indexes for fast queries
    .index('by_userId', ['userId'])
    .index('by_collectionId', ['collectionId'])
    .index('by_tags', ['tags'])
    .index('by_url', ['url', 'userId']) // Composite index for duplicate check
    // Vector index for semantic search
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 1536,
      filterFields: ['userId'], // Only search user's bookmarks
    }),

  // Collections table
  collections: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),   // Hex color or Tailwind class
    icon: v.optional(v.string()),    // Emoji or icon name
    createdAt: v.number(),
  })
    .index('by_userId', ['userId']),

  // Users table (synced from Clerk)
  users: defineTable({
    clerkId: v.string(),             // From Clerk webhook
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    preferences: v.object({
      theme: v.union(v.literal('light'), v.literal('dark')),
      defaultView: v.union(v.literal('list'), v.literal('grid')),
    }),
    createdAt: v.number(),
  })
    .index('by_clerkId', ['clerkId']),
});
```

### Schema Design Principles

**1. User Isolation**:
- Every table (except `users`) has `userId` field
- All queries filter by `userId`
- Prevents data leakage between users

**2. Denormalization for Performance**:
```typescript
// Instead of joining collections table:
// ❌ SLOW: Query bookmark → Join collection → Get name
bookmark.collectionId → collections.find(id) → collection.name

// ✅ FAST: Embed collection name in bookmark
bookmark.collectionName // No join needed
```

**When to denormalize**:
- Read-heavy data (collection names displayed frequently)
- Data rarely changes (collection names change infrequently)

**When to normalize**:
- Write-heavy data (tags changed often)
- Large data (embeddings stored once)

**3. Indexes for Every Query Pattern**:

```typescript
// Query: Get user's bookmarks
.index('by_userId', ['userId'])

// Query: Filter by collection
.index('by_collectionId', ['collectionId'])

// Query: Filter by tags
.index('by_tags', ['tags'])

// Query: Check duplicate URLs per user
.index('by_url', ['url', 'userId']) // Composite index
```

**Rule**: If you query by a field, create an index.

### Relationships

**One-to-Many** (Bookmark → Collection):
```typescript
// Bookmark belongs to one collection
{
  _id: 'bookmark-123',
  collectionId: 'collection-abc', // Foreign key
}

// Query bookmarks in collection
await ctx.db
  .query('bookmarks')
  .withIndex('by_collectionId', (q) => q.eq('collectionId', collectionId))
  .collect();
```

**Many-to-Many** (Bookmark ↔ Tags):
```typescript
// Store tags as array (denormalized)
{
  _id: 'bookmark-123',
  tags: ['react', 'nextjs', 'documentation'],
}

// Query bookmarks by tag
await ctx.db
  .query('bookmarks')
  .withIndex('by_tags', (q) => q.eq('tags', 'react'))
  .collect();
```

### Data Types

**Convex value types**:
```typescript
import { v } from 'convex/values';

v.string()                  // "hello"
v.number()                  // 42, 3.14
v.boolean()                 // true, false
v.id('tableName')           // "bookmark-123"
v.array(v.string())         // ["tag1", "tag2"]
v.object({ key: v.string() }) // { key: "value" }
v.optional(v.string())      // "hello" | undefined
v.union(v.literal('a'), v.literal('b')) // "a" | "b"
v.any()                     // any (avoid if possible)
```

**TypeScript types auto-generated**:
```typescript
import type { Doc, Id } from '@/convex/_generated/dataModel';

const bookmark: Doc<'bookmarks'> = {
  _id: 'bookmark-123' as Id<'bookmarks'>,
  userId: 'user-abc',
  url: 'https://example.com',
  title: 'Example',
  tags: ['tag1', 'tag2'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};
```

---

## Authentication and Authorization

### Clerk Integration

**Note**: Clerk is already configured in the template. This section shows how to use it in Convex functions.

**Get authenticated user**:
```typescript
export const myQuery = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error('Unauthorized'); // User not signed in
    }

    const userId = identity.subject; // "user_abc123"
    const email = identity.email;     // "user@example.com"

    // Use userId to filter data
    const bookmarks = await ctx.db
      .query('bookmarks')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();

    return bookmarks;
  },
});
```

### Row-Level Security

**Enforce user ownership**:

```typescript
// ✅ GOOD: Filters by userId
export const list = query(async ({ auth, db }) => {
  const identity = await auth.getUserIdentity();
  if (!identity) throw new Error('Unauthorized');

  return await db
    .query('bookmarks')
    .withIndex('by_userId', (q) => q.eq('userId', identity.subject))
    .collect();
});

// ❌ BAD: Exposes all bookmarks
export const listAll = query(async ({ db }) => {
  return await db.query('bookmarks').collect(); // INSECURE
});
```

**Verify ownership before updates**:

```typescript
export const updateBookmark = mutation({
  args: {
    bookmarkId: v.id('bookmarks'),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    // Fetch bookmark
    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark) throw new Error('Bookmark not found');

    // CRITICAL: Verify ownership
    if (bookmark.userId !== identity.subject) {
      throw new Error('Forbidden'); // User doesn't own this bookmark
    }

    // Update bookmark
    await ctx.db.patch(args.bookmarkId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});
```

### Syncing Users from Clerk

**Webhook handler**:
```typescript
// convex/http.ts
import { httpRouter } from 'convex/server';
import { internal } from './_generated/api';
import { Webhook } from 'svix';

const http = httpRouter();

http.route({
  path: '/webhooks/clerk',
  method: 'POST',
  handler: async (ctx, request) => {
    // Verify webhook signature
    const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
    const payload = await request.text();
    const headers = Object.fromEntries(request.headers.entries());

    const evt = webhook.verify(payload, headers);

    // Handle user.created event
    if (evt.type === 'user.created') {
      await ctx.runMutation(internal.users.create, {
        clerkId: evt.data.id,
        email: evt.data.email_addresses[0].email_address,
        name: evt.data.first_name + ' ' + evt.data.last_name,
        imageUrl: evt.data.image_url,
      });
    }

    return new Response(null, { status: 200 });
  },
});

export default http;
```

**Internal mutation to create user**:
```typescript
// convex/users.ts
import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const create = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('users', {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      preferences: {
        theme: 'dark',
        defaultView: 'grid',
      },
      createdAt: Date.now(),
    });
  },
});
```

---

## Middleware Structure

### Next.js Middleware (Clerk)

**Note**: Clerk middleware is already configured in the template.

```typescript
// app/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',           // Landing page
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect(); // Require authentication
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

**Protected routes**:
- `/dashboard` → Requires authentication
- `/api/*` → Requires authentication (except webhooks)

**Public routes**:
- `/` → Landing page (no auth)
- `/sign-in`, `/sign-up` → Clerk pages

---

## Error Handling and Logging

### Error Handling Patterns

**In queries** (use `undefined` for errors):
```typescript
export const get = query({
  args: { bookmarkId: v.id('bookmarks') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return undefined; // Don't throw in queries

    const bookmark = await ctx.db.get(args.bookmarkId);

    // Verify ownership
    if (bookmark && bookmark.userId !== identity.subject) {
      return undefined; // Hide unauthorized bookmarks
    }

    return bookmark;
  },
});
```

**In mutations** (throw descriptive errors):
```typescript
export const create = mutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Unauthorized'); // Clear error message
    }

    if (!isValidUrl(args.url)) {
      throw new Error('Invalid URL format'); // User-friendly
    }

    // Continue...
  },
});
```

**In actions** (handle external API errors):
```typescript
export const fetchMetadata = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`https://api.microlink.io/?url=${args.url}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[FETCH_METADATA_ERROR]', { url: args.url, error });

      // Fallback to self-hosted scraper
      return await selfHostedScraper(args.url);
    }
  },
});
```

### Logging Standards

**Log levels**:
```typescript
// Informational events
console.log('[BOOKMARK_CREATED]', { bookmarkId, userId });

// Warnings (recoverable issues)
console.warn('[METADATA_FALLBACK]', { url, reason: 'Microlink API failed' });

// Errors (critical failures)
console.error('[EMBEDDING_FAILED]', { bookmarkId, error });
```

**Structured logging**:
```typescript
// ✅ GOOD: Structured
console.log('[BOOKMARK_CREATED]', {
  bookmarkId: 'bookmark-123',
  userId: 'user-abc',
  url: 'https://example.com',
  timestamp: Date.now(),
});

// ❌ BAD: Unstructured
console.log('Bookmark created: bookmark-123');
```

**Log sensitive data carefully**:
```typescript
// ❌ BAD: Logs user email
console.log('[USER_LOGIN]', { email: 'user@example.com' });

// ✅ GOOD: Logs userId only
console.log('[USER_LOGIN]', { userId: 'user-abc' });
```

---

## Folder Organization

### Convex Directory Structure

```
/convex
  ├── _generated              # Auto-generated (don't edit)
  │   ├── api.d.ts
  │   ├── dataModel.d.ts
  │   └── server.d.ts
  ├── schema.ts               # Database schema definitions
  ├── bookmarks.ts            # Bookmark CRUD functions
  │   ├── queries             # list, get, search
  │   ├── mutations           # create, update, delete
  │   └── actions             # fetchMetadata
  ├── collections.ts          # Collection management
  │   ├── queries             # list, get
  │   └── mutations           # create, update, delete
  ├── ai.ts                   # AI/RAG functions
  │   ├── actions             # chat, generateEmbedding, semanticSearch
  │   └── internalMutations   # storeEmbedding
  ├── users.ts                # User management
  │   ├── queries             # getCurrentUser
  │   └── internalMutations   # create (from Clerk webhook)
  ├── http.ts                 # HTTP endpoints (webhooks)
  │   └── routes              # /webhooks/clerk
  └── lib                     # Utility functions
      ├── validators.ts       # URL validation, schema validation
      ├── constants.ts        # MAX_TAGS, MAX_TITLE_LENGTH
      └── helpers.ts          # Date formatting, string utils
```

### File Naming Conventions

**Feature-based files**:
```
bookmarks.ts    → All bookmark-related functions
collections.ts  → All collection-related functions
ai.ts           → All AI/RAG functions
```

**Function naming**:
```typescript
// Queries (read data)
export const list = query(...)
export const get = query(...)
export const search = query(...)

// Mutations (write data)
export const create = mutation(...)
export const update = mutation(...)
export const delete_ = mutation(...) // "delete" is reserved keyword

// Actions (external APIs)
export const fetchMetadata = action(...)
export const generateEmbedding = action(...)

// Internal functions
export const storeEmbedding = internalMutation(...)
```

### Shared Utilities

```typescript
// convex/lib/validators.ts
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeUrl(url: string): string {
  return url.trim().replace(/\s+/g, '');
}

// convex/lib/constants.ts
export const MAX_TAGS_PER_BOOKMARK = 20;
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 500;
export const EMBEDDING_DIMENSIONS = 1536;
```

---

## Summary

This backend structure document covers:
- ✅ Convex functions architecture (queries, mutations, actions, internal)
- ✅ Database schema design (tables, indexes, relationships)
- ✅ Authentication and authorization (Clerk integration, row-level security)
- ✅ Middleware structure (Clerk middleware for protected routes)
- ✅ Error handling and logging (patterns, standards)
- ✅ Folder organization (feature-based structure)

**Key Principles**:
1. **Row-level security**: Always filter by `userId`
2. **Use indexes**: Index every query pattern
3. **Validate inputs**: Check auth, validate data before writes
4. **Handle errors gracefully**: Descriptive errors, fallbacks
5. **Log structured data**: JSON format for easy searching

**Next Steps**: Build Convex functions following these patterns using the pre-configured template.
