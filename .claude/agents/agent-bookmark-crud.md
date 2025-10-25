---
name: agent-bookmark-crud
description: Core bookmark CRUD operations with automatic metadata extraction
model: inherit
color: blue
tech_stack:
  framework: Next.js 15
  database: Convex
  auth: Clerk
  provider: Microlink API
generated: 2025-10-24T19:32:00Z
documentation_sources: [
  "https://docs.convex.dev/database/writing-data",
  "https://docs.convex.dev/database/reading-data",
  "https://microlink.io/docs/api/getting-started",
  "https://clerk.com/docs/references/nextjs/overview",
  "https://ui.shadcn.com/docs"
]
---

# Agent: Bookmark CRUD Implementation

## Agent Overview

**Purpose**: Implement core bookmark create, read, update, and delete operations with automatic metadata extraction from URLs. Users can add bookmarks via URL input, view them in list/grid layouts, edit details, add notes, and delete bookmarks. The system automatically fetches title, description, preview images, and favicons using Microlink API with self-hosted fallback.

**Tech Stack**: Next.js 15, Convex, Clerk, shadcn/ui, Tailwind CSS 4, Microlink API (metadata extraction)

**Source**: Convex database docs, Microlink API documentation, Clerk authentication guide, shadcn/ui components

## Critical Implementation Knowledge

### Convex & Next.js 15 Latest Updates 🚨

* **Convex Mutations**: Use `mutation` for write operations - automatically transactional and serializable
* **Convex Queries**: Use `query` for read operations - real-time reactive updates via WebSocket
* **Convex Actions**: Use `action` for external API calls (Microlink) - supports 30-second timeout
* **Next.js 15 Server Actions**: Can call Convex mutations directly from forms - eliminates API route boilerplate
* **Real-time Updates**: Convex `useQuery` hook automatically re-renders components when data changes

### Common Pitfalls & Solutions 🚨

* **Pitfall**: Metadata extraction fails for some URLs (paywalls, JavaScript-heavy sites)
  * **Solution**: Implement graceful fallback - allow manual title/description entry, use URL hostname as fallback title

* **Pitfall**: Large images slow down UI rendering
  * **Solution**: Use Next.js Image component with lazy loading, store image URLs not raw data

* **Pitfall**: Users can edit/delete other users' bookmarks
  * **Solution**: Always filter by `userId` in Convex queries, verify ownership in mutations before updates

* **Pitfall**: Duplicate bookmarks created when user submits URL twice
  * **Solution**: Check for existing URL per user before creating new bookmark

* **Pitfall**: Microlink API rate limits (100 requests/day free tier)
  * **Solution**: Implement self-hosted metadata extraction as primary, Microlink as fallback

### Best Practices 🚨

* **DO**: Validate URLs client-side before submission (regex check for valid format)
* **DO**: Show loading states during metadata extraction (2-5 second operation)
* **DO**: Allow users to edit auto-extracted metadata if incorrect
* **DO**: Store timestamps (`createdAt`, `updatedAt`) for sorting and filtering
* **DO**: Use optimistic updates for better UX (update UI before server confirms)
* **DON'T**: Store raw HTML content - extract only structured metadata
* **DON'T**: Block UI while fetching metadata - use async operations
* **DON'T**: Skip URL validation - prevents malformed data in database

## Implementation Steps

**Architecture Overview**: User submits URL → Frontend validates format → Call Convex mutation → Mutation triggers action for metadata extraction → Store bookmark with metadata → Real-time update pushes to UI → Display bookmark in list/grid.

### Backend Implementation

**File**: `convex/bookmarks.ts`
* **Purpose**: Core CRUD mutations and queries for bookmarks
* **Functions**:
  * `createBookmark(url: string)` - Create bookmark with metadata extraction
  * `updateBookmark(id: Id<"bookmarks">, updates: Partial<Bookmark>)` - Update bookmark fields
  * `deleteBookmark(id: Id<"bookmarks">)` - Delete bookmark
  * `getBookmark(id: Id<"bookmarks">)` - Get single bookmark
  * `listBookmarks(userId: string, filters: Filters)` - List user's bookmarks with optional filters

**File**: `convex/metadata.ts`
* **Purpose**: Metadata extraction actions using external APIs
* **Functions**:
  * `extractMetadata(url: string)` - Call Microlink API or self-hosted scraper
  * `extractFavicon(url: string)` - Get site favicon
  * `validateUrl(url: string)` - Ensure URL is valid and accessible

### Frontend Integration

**Component**: `app/dashboard/bookmarks/page.tsx`
* **Purpose**: Main bookmarks page with list/grid view toggle
* **Hooks**: `useQuery` for listing bookmarks, `useMutation` for create/update/delete
* **UI**: Search bar, view toggle, add bookmark button, bookmark cards

**Component**: `components/bookmarks/AddBookmarkDialog.tsx`
* **Purpose**: Modal dialog for adding new bookmarks
* **Features**: URL input, loading states, manual metadata override, validation

**Component**: `components/bookmarks/BookmarkCard.tsx`
* **Purpose**: Individual bookmark card with thumbnail, title, description
* **Features**: Click to open URL, edit button, delete button, copy link

**Component**: `components/bookmarks/BookmarkList.tsx`
* **Purpose**: List view of bookmarks with infinite scroll
* **Features**: Virtual scrolling for performance, sort options, empty states

## Code Patterns

### `convex/bookmarks.ts`

```typescript
import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api, internal } from "./_generated/api";

// Create new bookmark with metadata extraction
export const createBookmark = mutation({
  args: {
    url: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, { url, title, description }) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const userId = identity.subject;

    // Check for duplicate URL
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("url"), url))
      .first();

    if (existing) {
      throw new Error("Bookmark already exists");
    }

    // Extract metadata if not provided
    let metadata = { title, description };
    if (!title || !description) {
      metadata = await ctx.runAction(internal.metadata.extractMetadata, { url });
    }

    // Create bookmark
    const bookmarkId = await ctx.db.insert("bookmarks", {
      userId,
      url,
      title: metadata.title || new URL(url).hostname,
      description: metadata.description || "",
      imageUrl: metadata.imageUrl,
      faviconUrl: metadata.faviconUrl,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return bookmarkId;
  },
});

// Update bookmark
export const updateBookmark = mutation({
  args: {
    id: v.id("bookmarks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    notes: v.optional(v.string()),
    collectionId: v.optional(v.id("collections")),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { id, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Verify ownership
    const bookmark = await ctx.db.get(id);
    if (!bookmark || bookmark.userId !== identity.subject) {
      throw new Error("Bookmark not found or unauthorized");
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

// Delete bookmark
export const deleteBookmark = mutation({
  args: { id: v.id("bookmarks") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const bookmark = await ctx.db.get(id);
    if (!bookmark || bookmark.userId !== identity.subject) {
      throw new Error("Bookmark not found or unauthorized");
    }

    await ctx.db.delete(id);
    return { success: true };
  },
});

// Get single bookmark
export const getBookmark = query({
  args: { id: v.id("bookmarks") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const bookmark = await ctx.db.get(id);
    if (!bookmark || bookmark.userId !== identity.subject) {
      return null;
    }

    return bookmark;
  },
});

// List user's bookmarks
export const listBookmarks = query({
  args: {
    collectionId: v.optional(v.id("collections")),
    tags: v.optional(v.array(v.string())),
    search: v.optional(v.string()),
  },
  handler: async (ctx, { collectionId, tags, search }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let query = ctx.db
      .query("bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc");

    // Apply filters
    if (collectionId) {
      query = query.filter((q) => q.eq(q.field("collectionId"), collectionId));
    }

    if (tags && tags.length > 0) {
      query = query.filter((q) =>
        tags.every((tag) => q.field("tags").includes(tag))
      );
    }

    if (search) {
      query = query.filter((q) =>
        q.or(
          q.field("title").toLowerCase().includes(search.toLowerCase()),
          q.field("description")?.toLowerCase().includes(search.toLowerCase()) ?? false
        )
      );
    }

    return await query.collect();
  },
});
```

**Validation**: Functions enforce authentication, verify ownership, check for duplicates, and handle errors gracefully. Metadata extraction is async and non-blocking.

### `convex/metadata.ts`

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";

// Extract metadata using Microlink API
export const extractMetadata = action({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    try {
      // Primary: Microlink API
      const response = await fetch(
        `https://api.microlink.io?url=${encodeURIComponent(url)}`
      );

      if (!response.ok) {
        throw new Error("Microlink API failed");
      }

      const data = await response.json();
      const { title, description, image, logo } = data.data;

      return {
        title: title || "",
        description: description || "",
        imageUrl: image?.url || "",
        faviconUrl: logo?.url || "",
      };
    } catch (error) {
      console.error("Metadata extraction failed:", error);

      // Fallback: Return URL hostname as title
      try {
        const hostname = new URL(url).hostname;
        return {
          title: hostname,
          description: "",
          imageUrl: "",
          faviconUrl: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
        };
      } catch {
        throw new Error("Invalid URL");
      }
    }
  },
});
```

**Validation**: Implements primary/fallback strategy for metadata extraction. Handles API failures gracefully with URL-based fallbacks.

### `components/bookmarks/AddBookmarkDialog.tsx`

```typescript
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";

export function AddBookmarkDialog() {
  const [url, setUrl] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const createBookmark = useMutation(api.bookmarks.createBookmark);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate URL
    try {
      new URL(url);
    } catch {
      alert("Please enter a valid URL");
      return;
    }

    setIsLoading(true);

    try {
      await createBookmark({ url });
      setUrl("");
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to create bookmark:", error);
      alert("Failed to add bookmark. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Bookmark
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Bookmark</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add Bookmark"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Validation**: Component validates URL client-side, shows loading states, handles errors, and closes dialog on success.

## Testing & Debugging

* **Convex Dashboard**: Monitor mutation logs, inspect bookmark records, verify metadata extraction
* **Browser DevTools**: Check network requests to Microlink API, verify URL validation
* **Unit Tests**: Test URL validation regex, metadata extraction fallback logic
* **Integration Tests**: Test create → verify bookmark appears in list, test update → verify changes persist
* **End-to-End Tests (Playwright)**: Simulate user adding bookmark → verify metadata extracted → edit bookmark → delete bookmark
* **Microlink API Testing**: Use API playground to test URLs before integration
* **Clerk Dashboard**: Verify userId correctly associated with bookmarks

## Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_CONVEX_URL=<convex-deployment-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk-publishable-key>
```

### Backend (Convex Dashboard)
```bash
CLERK_JWT_ISSUER_DOMAIN=<clerk-jwt-issuer>   # e.g., https://your-app.clerk.accounts.dev
# MICROLINK_API_KEY (optional for paid tier)
```

## Success Metrics

* ✅ Users can add bookmarks via URL input
* ✅ Metadata extraction succeeds >90% of the time (measure via logs)
* ✅ Metadata extraction completes in <5 seconds P95
* ✅ Duplicate URL detection prevents redundant bookmarks
* ✅ Users can edit bookmark title, description, notes
* ✅ Users can delete bookmarks with confirmation
* ✅ Real-time updates work (new bookmark appears immediately without refresh)
* ✅ Row-level security enforced (users only see their own bookmarks)
* ✅ Graceful fallback when metadata extraction fails (shows hostname as title)
* ✅ Mobile responsive (works on 320px+ screens)
