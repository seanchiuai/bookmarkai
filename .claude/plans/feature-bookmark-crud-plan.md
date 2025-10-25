# Roadmap: Bookmark CRUD Operations

## Context

**Tech Stack**: Next.js 15, Convex, Clerk, Microlink API (optional for metadata)

**Feature Description**: Core bookmark management system enabling users to create, read, update, and delete bookmarks with automatic metadata extraction from URLs (title, description, favicon, preview image).

**User Value**: Users can save and manage bookmarks effortlessly with rich metadata automatically extracted from URLs, providing a visual and organized way to preserve web content.

## Implementation Steps

Each step is mandatory for shipping Bookmark CRUD Operations.

### 1. Manual Setup (User Required)

- [ ] Verify Clerk authentication is configured and working
- [ ] Verify Convex deployment is active (check dashboard)
- [ ] (Optional) Create Microlink API account at https://microlink.io for paid tier with higher rate limits
- [ ] (Optional) Generate Microlink API key if using paid tier
- [ ] Confirm frontend can access NEXT_PUBLIC_CONVEX_URL environment variable

### 2. Dependencies & Environment

**NPM Packages**:
```bash
# No additional packages required for basic implementation
# Microlink is called via fetch API
```

**Environment Variables** (`.env.local`):
```bash
# Frontend
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-key>

# Backend (set in Convex Dashboard → Settings → Environment Variables)
CLERK_JWT_ISSUER_DOMAIN=<your-clerk-jwt-issuer>
MICROLINK_API_KEY=<your-microlink-api-key> # Optional, only for paid tier
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
    transcript: v.optional(v.string()), // For YouTube integration
    embedding: v.optional(v.array(v.float64())), // For RAG chat
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_collectionId", ["collectionId"])
    .index("by_url", ["url"]) // For duplicate detection
    .index("by_userId_createdAt", ["userId", "createdAt"]), // For sorted lists

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

**File**: `convex/bookmarks.ts`

#### Actions

**`extractMetadata`** (Action)
- **Purpose**: Fetch metadata from URL using Microlink API
- **Args**: `{ url: v.string() }`
- **Returns**: Object with `title`, `description`, `imageUrl`, `faviconUrl`
- **Auth**: Verify `ctx.auth.getUserIdentity()` exists
- **Implementation**:
  - Validate URL format (must start with http:// or https://)
  - Build Microlink API URL: `https://api.microlink.io?url=${encodeURIComponent(url)}`
  - Add API key to headers if MICROLINK_API_KEY env var exists
  - Call fetch with timeout (10 seconds)
  - Parse response and extract: `data.title`, `data.description`, `data.image.url`, `data.logo.url`
  - Return fallback values if extraction fails (title = URL, others = null)
  - Handle errors gracefully (network failures, timeouts, invalid URLs)

```typescript
import { v } from "convex/values";
import { action } from "./_generated/server";

export const extractMetadata = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    // Validate URL
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(args.url)) {
      throw new Error("Invalid URL format");
    }

    try {
      const apiKey = process.env.MICROLINK_API_KEY;
      const microlinkUrl = `https://api.microlink.io?url=${encodeURIComponent(args.url)}`;

      const headers: Record<string, string> = {};
      if (apiKey) {
        headers["x-api-key"] = apiKey;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(microlinkUrl, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Microlink API error: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data || {};

      return {
        title: data.title || args.url,
        description: data.description || null,
        imageUrl: data.image?.url || null,
        faviconUrl: data.logo?.url || null,
      };
    } catch (error) {
      console.error("Metadata extraction failed:", error);
      // Return fallback metadata
      return {
        title: args.url,
        description: null,
        imageUrl: null,
        faviconUrl: null,
      };
    }
  },
});
```

#### Mutations

**`createBookmark`** (Mutation)
- **Purpose**: Create a new bookmark with metadata
- **Args**: `{ url: v.string(), title: v.optional(v.string()), description: v.optional(v.string()), imageUrl: v.optional(v.string()), faviconUrl: v.optional(v.string()), collectionId: v.optional(v.id("collections")), tags: v.optional(v.array(v.string())), notes: v.optional(v.string()) }`
- **Returns**: `Id<"bookmarks">`
- **Auth**: Verify `ctx.auth.getUserIdentity()` exists and extract userId
- **Implementation**:
  - Get userId from `identity.subject`
  - Check for duplicate URL using `by_url` index
  - If duplicate exists for this user, throw error with message
  - Validate collectionId exists and belongs to user (if provided)
  - Insert bookmark with default values for missing fields
  - Set `createdAt` and `updatedAt` to `Date.now()`
  - Initialize `tags` as empty array if not provided
  - Return new bookmark ID

```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const createBookmark = mutation({
  args: {
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    faviconUrl: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    // Check for duplicate
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (existing) {
      throw new Error("This URL has already been bookmarked");
    }

    // Validate collection ownership if provided
    if (args.collectionId) {
      const collection = await ctx.db.get(args.collectionId);
      if (!collection || collection.userId !== userId) {
        throw new Error("Invalid collection");
      }
    }

    const now = Date.now();
    const bookmarkId = await ctx.db.insert("bookmarks", {
      userId,
      url: args.url,
      title: args.title || args.url,
      description: args.description,
      imageUrl: args.imageUrl,
      faviconUrl: args.faviconUrl,
      collectionId: args.collectionId,
      tags: args.tags || [],
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return bookmarkId;
  },
});
```

**`updateBookmark`** (Mutation)
- **Purpose**: Update an existing bookmark
- **Args**: `{ id: v.id("bookmarks"), title: v.optional(v.string()), description: v.optional(v.string()), collectionId: v.optional(v.id("collections")), tags: v.optional(v.array(v.string())), notes: v.optional(v.string()) }`
- **Returns**: `Id<"bookmarks">`
- **Auth**: Verify bookmark belongs to authenticated user
- **Implementation**:
  - Get userId from `ctx.auth.getUserIdentity()`
  - Fetch existing bookmark by ID
  - Verify `bookmark.userId === userId`
  - Validate collectionId if provided
  - Update only provided fields using spread operator
  - Update `updatedAt` timestamp
  - Return bookmark ID

```typescript
export const updateBookmark = mutation({
  args: {
    id: v.id("bookmarks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark) throw new Error("Bookmark not found");
    if (bookmark.userId !== userId) throw new Error("Unauthorized");

    // Validate collection ownership if provided
    if (args.collectionId !== undefined && args.collectionId !== null) {
      const collection = await ctx.db.get(args.collectionId);
      if (!collection || collection.userId !== userId) {
        throw new Error("Invalid collection");
      }
    }

    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.collectionId !== undefined) updates.collectionId = args.collectionId;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.notes !== undefined) updates.notes = args.notes;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});
```

**`deleteBookmark`** (Mutation)
- **Purpose**: Delete a bookmark
- **Args**: `{ id: v.id("bookmarks") }`
- **Returns**: Success object `{ success: true }`
- **Auth**: Verify bookmark belongs to authenticated user
- **Implementation**:
  - Get userId from `ctx.auth.getUserIdentity()`
  - Fetch bookmark by ID
  - Verify ownership
  - Delete bookmark from database
  - Return success confirmation

```typescript
export const deleteBookmark = mutation({
  args: { id: v.id("bookmarks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark) throw new Error("Bookmark not found");
    if (bookmark.userId !== userId) throw new Error("Unauthorized");

    await ctx.db.delete(args.id);
    return { success: true };
  },
});
```

#### Queries

**`getBookmark`** (Query)
- **Purpose**: Fetch a single bookmark by ID
- **Args**: `{ id: v.id("bookmarks") }`
- **Returns**: Bookmark object or null
- **Auth**: Verify bookmark belongs to authenticated user
- **Implementation**:
  - Get userId from `ctx.auth.getUserIdentity()`
  - Fetch bookmark by ID
  - Verify ownership or return null
  - Return bookmark object

```typescript
import { query } from "./_generated/server";

export const getBookmark = query({
  args: { id: v.id("bookmarks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const bookmark = await ctx.db.get(args.id);
    if (!bookmark || bookmark.userId !== userId) return null;

    return bookmark;
  },
});
```

**`listBookmarks`** (Query)
- **Purpose**: List all bookmarks for the authenticated user with optional filtering
- **Args**: `{ collectionId: v.optional(v.id("collections")), search: v.optional(v.string()), limit: v.optional(v.number()) }`
- **Returns**: Array of bookmark objects sorted by `createdAt` descending
- **Auth**: Verify `ctx.auth.getUserIdentity()` exists
- **Implementation**:
  - Get userId from identity
  - Query bookmarks using `by_userId_createdAt` index
  - Filter by collectionId if provided
  - Filter by search term (case-insensitive match in title, description, notes)
  - Sort by `createdAt` descending
  - Apply limit (default 100, max 500)
  - Return array of bookmarks

```typescript
export const listBookmarks = query({
  args: {
    collectionId: v.optional(v.id("collections")),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    let query = ctx.db
      .query("bookmarks")
      .withIndex("by_userId_createdAt", (q) => q.eq("userId", userId))
      .order("desc");

    let bookmarks = await query.collect();

    // Filter by collection
    if (args.collectionId) {
      bookmarks = bookmarks.filter((b) => b.collectionId === args.collectionId);
    }

    // Filter by search term
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      bookmarks = bookmarks.filter((b) => {
        return (
          b.title.toLowerCase().includes(searchLower) ||
          b.description?.toLowerCase().includes(searchLower) ||
          b.notes?.toLowerCase().includes(searchLower) ||
          b.url.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply limit
    const limit = Math.min(args.limit || 100, 500);
    return bookmarks.slice(0, limit);
  },
});
```

### 5. Frontend

**File**: `app/dashboard/bookmarks/page.tsx`
- **Purpose**: Main bookmarks list page
- **Components**: `<BookmarkList />`, `<AddBookmarkButton />`, `<SearchBar />`, `<FilterBar />`
- **Hooks**:
  - `useQuery(api.bookmarks.listBookmarks)` for fetching bookmarks
  - `useMutation(api.bookmarks.deleteBookmark)` for delete action
  - `useAction(api.bookmarks.extractMetadata)` for metadata extraction
- **State**: Search query, selected collection filter, view mode (list/grid)
- **Layout**: Top bar with search and add button, main content area with bookmarks

**Component**: `components/bookmarks/AddBookmarkDialog.tsx`
- **Purpose**: Modal dialog for adding new bookmarks
- **Props**: `open`, `onOpenChange`, `collectionId` (optional)
- **Features**:
  - URL input field with validation (required, must be valid URL)
  - "Fetch Metadata" button that calls `extractMetadata` action
  - Manual override fields: title, description (optional)
  - Collection selector dropdown (optional)
  - Tags input with comma separation
  - Notes textarea (optional)
  - Submit button calls `createBookmark` mutation
  - Loading states during metadata extraction
  - Error handling for duplicate URLs
  - Success toast notification on creation
- **Validation**:
  - URL format validation before allowing fetch
  - Required field validation (URL, title)
  - Duplicate URL detection on submit

```typescript
"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface AddBookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId?: string;
}

export function AddBookmarkDialog({ open, onOpenChange, collectionId }: AddBookmarkDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const extractMetadata = useAction(api.bookmarks.extractMetadata);
  const createBookmark = useMutation(api.bookmarks.createBookmark);
  const { toast } = useToast();

  const handleFetchMetadata = async () => {
    if (!url) {
      toast({ title: "Please enter a URL first", variant: "destructive" });
      return;
    }

    setIsExtracting(true);
    try {
      const metadata = await extractMetadata({ url });
      setTitle(metadata.title);
      setDescription(metadata.description || "");
      toast({ title: "Metadata extracted successfully" });
    } catch (error) {
      toast({ title: "Failed to extract metadata", variant: "destructive" });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async () => {
    if (!url || !title) {
      toast({ title: "URL and title are required", variant: "destructive" });
      return;
    }

    try {
      await createBookmark({
        url,
        title,
        description: description || undefined,
        notes: notes || undefined,
        tags: tags ? tags.split(",").map((t) => t.trim()) : [],
        collectionId: collectionId as any,
      });

      toast({ title: "Bookmark created successfully" });
      onOpenChange(false);
      // Reset form
      setUrl("");
      setTitle("");
      setDescription("");
      setNotes("");
      setTags("");
    } catch (error: any) {
      toast({ title: error.message || "Failed to create bookmark", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Bookmark</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="url">URL *</Label>
            <div className="flex gap-2">
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
              />
              <Button onClick={handleFetchMetadata} disabled={isExtracting}>
                {isExtracting ? "Fetching..." : "Fetch"}
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bookmark title"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>
          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Personal notes"
            />
          </div>
          <Button onClick={handleSubmit} className="w-full">
            Create Bookmark
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Component**: `components/bookmarks/BookmarkCard.tsx`
- **Purpose**: Display a single bookmark in card format
- **Props**: `bookmark` object, `onEdit`, `onDelete`
- **Features**:
  - Thumbnail image with fallback to favicon or placeholder
  - Title with truncation (max 2 lines)
  - Description with truncation (max 3 lines)
  - Tags displayed as badges
  - Collection badge if bookmark is in a collection
  - Hover effect showing actions menu (edit, delete, open in new tab)
  - Click on card opens URL in new tab
  - Right-click context menu for quick actions
  - Timestamp showing when bookmark was created

**Component**: `components/bookmarks/BookmarkList.tsx`
- **Purpose**: Grid or list view of bookmarks
- **Props**: `bookmarks` array, `view` mode ("grid" | "list"), `onEdit`, `onDelete`
- **Features**:
  - Responsive grid layout (1 col mobile, 2 col tablet, 3-4 col desktop)
  - List view shows more metadata in table format
  - Empty state when no bookmarks found
  - Loading skeleton during fetch
  - Virtual scrolling for large lists (optional optimization)
  - Bulk selection mode (optional for future)

**Component**: `components/bookmarks/EditBookmarkDialog.tsx`
- **Purpose**: Modal dialog for editing existing bookmarks
- **Props**: `bookmark` object, `open`, `onOpenChange`
- **Features**:
  - Pre-filled form with existing bookmark data
  - Same fields as AddBookmarkDialog but with update mutation
  - Cannot change URL (display only)
  - Delete button in footer
  - Confirmation dialog for destructive actions

### 6. Error Prevention

**Convex Validators**:
- [ ] All mutations use proper validators: `v.id()`, `v.string()`, `v.optional()`, `v.array()`
- [ ] Validate URL format before inserting into database
- [ ] Validate userId matches authenticated user in all operations
- [ ] Validate collection ownership before assigning bookmarks

**Authentication**:
- [ ] Every mutation/query checks `ctx.auth.getUserIdentity()`
- [ ] Return 401 error if no identity found
- [ ] Extract userId from `identity.subject` consistently
- [ ] Never trust client-provided userId parameter

**Authorization**:
- [ ] All queries filter by userId (row-level security)
- [ ] Bookmark updates verify ownership before modifying
- [ ] Delete operations verify ownership before deletion
- [ ] Collection assignment validates user owns target collection

**Type Safety**:
- [ ] Use generated Convex types: `Id<"bookmarks">`, `Doc<"bookmarks">`
- [ ] Properly type mutation/query return values
- [ ] Type component props with TypeScript interfaces
- [ ] Use Zod or validator functions for form validation

**Duplicate Detection**:
- [ ] Check for existing URL before creating bookmark
- [ ] Use `by_url` index for efficient duplicate queries
- [ ] Show user-friendly error message when duplicate found
- [ ] Consider offering to update existing bookmark instead

**URL Validation**:
- [ ] Validate URL format on client (HTML5 URL input)
- [ ] Validate URL format on server before API calls
- [ ] Sanitize URLs to prevent injection attacks
- [ ] Handle edge cases: localhost, IP addresses, custom protocols

**Error Handling**:
- [ ] Wrap Microlink API calls in try-catch
- [ ] Implement timeout for metadata extraction (10s max)
- [ ] Show fallback UI when metadata extraction fails
- [ ] Log errors to monitoring service (Sentry/LogRocket)
- [ ] Display user-friendly error messages (not raw API errors)

### 7. Testing

**Unit Tests**:
- [ ] Test `extractMetadata` with mock fetch responses
- [ ] Test `createBookmark` with valid and invalid inputs
- [ ] Test duplicate detection logic
- [ ] Test URL validation functions
- [ ] Test tag parsing and normalization

**Integration Tests**:
- [ ] Create bookmark → verify appears in list
- [ ] Update bookmark → verify changes persisted
- [ ] Delete bookmark → verify removed from database
- [ ] Test metadata extraction with real URLs
- [ ] Test collection assignment and filtering

**End-to-End Tests (Playwright)**:
- [ ] User clicks "Add Bookmark" button
- [ ] User enters URL and clicks "Fetch Metadata"
- [ ] Verify title and description auto-fill
- [ ] User adds tags and notes
- [ ] User submits form → verify bookmark appears in list
- [ ] User clicks bookmark card → verify opens in new tab
- [ ] User edits bookmark → verify updates reflected
- [ ] User deletes bookmark → verify removed from UI
- [ ] Test error handling for duplicate URLs
- [ ] Test error handling for invalid URLs

**Manual Testing Checklist**:
- [ ] Add bookmark with valid URL
- [ ] Verify metadata extraction works for popular sites
- [ ] Test with URLs that have no metadata (plain HTML)
- [ ] Test with URLs that return 404 or errors
- [ ] Add bookmark to collection
- [ ] Move bookmark between collections
- [ ] Remove bookmark from collection
- [ ] Edit bookmark title, description, tags, notes
- [ ] Delete bookmark and verify permanent removal
- [ ] Test search functionality (if implemented)
- [ ] Test pagination/infinite scroll with 100+ bookmarks
- [ ] Test mobile responsive design
- [ ] Test with multiple user accounts (no data leakage)

## Documentation Sources

1. Microlink API Documentation - https://microlink.io/docs/api/getting-started/overview
2. Convex Mutations - https://docs.convex.dev/functions/mutations
3. Convex Queries - https://docs.convex.dev/functions/queries
4. Convex Actions - https://docs.convex.dev/production/actions
5. Convex Indexes - https://docs.convex.dev/database/indexes
6. Clerk Authentication - https://clerk.com/docs/references/nextjs/overview
7. Next.js 15 App Router - https://nextjs.org/docs/app
8. shadcn/ui Dialog - https://ui.shadcn.com/docs/components/dialog
9. shadcn/ui Form - https://ui.shadcn.com/docs/components/form
10. TypeScript Validation with Zod - https://zod.dev
