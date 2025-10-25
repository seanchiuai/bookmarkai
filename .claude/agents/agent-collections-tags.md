---
name: agent-collections-tags
description: Collections (folders) and tagging system for flexible bookmark organization
model: inherit
color: green
tech_stack:
  framework: Next.js 15
  database: Convex
  auth: Clerk
  provider: shadcn/ui
generated: 2025-10-24T19:32:00Z
documentation_sources: [
  "https://docs.convex.dev/database/indexes",
  "https://docs.convex.dev/database/reading-data",
  "https://ui.shadcn.com/docs/components",
  "https://clerk.com/docs/references/nextjs/overview"
]
---

# Agent: Collections & Tags Implementation

## Agent Overview

**Purpose**: Implement folder-based collections and flexible tagging system for organizing bookmarks. Users can create collections (folders) with custom names, colors, and icons, then assign bookmarks to collections. Tags provide cross-cutting categorization with multi-tag support, autocomplete suggestions, and filtering capabilities.

**Tech Stack**: Next.js 15, Convex, Clerk, shadcn/ui, Tailwind CSS 4

**Source**: Convex database indexes, shadcn/ui components (Combobox, Badge, Select)

## Critical Implementation Knowledge

### Convex Database Patterns 🚨

* **Indexes**: Create indexes on `collectionId` and `tags` for fast filtering
* **Relations**: Bookmarks reference collections via `collectionId` (optional foreign key)
* **Arrays**: Store tags as array of strings in bookmark documents
* **Queries**: Use `withIndex` for efficient collection/tag filtering

### Common Pitfalls & Solutions 🚨

* **Pitfall**: Deleting collection leaves orphaned bookmarks
  * **Solution**: Either cascade delete bookmarks or set `collectionId` to null when collection deleted

* **Pitfall**: Tag autocomplete becomes slow with >1000 unique tags
  * **Solution**: Limit autocomplete results to 20 most recently used tags

* **Pitfall**: Users can create duplicate collections with same name
  * **Solution**: Check for existing collection name before creation (case-insensitive)

* **Pitfall**: Tag filtering with multiple tags uses OR instead of AND logic
  * **Solution**: Implement proper intersection logic in Convex query filter

### Best Practices 🚨

* **DO**: Allow renaming collections without breaking bookmark references (update by ID)
* **DO**: Provide visual cues (color, icon) for collections in UI
* **DO**: Implement tag autocomplete for better UX
* **DO**: Allow bulk tagging operations (add tag to multiple bookmarks)
* **DO**: Sort collections alphabetically or by creation date
* **DON'T**: Store collection name in bookmark (use reference ID)
* **DON'T**: Allow special characters in tag names (normalize to lowercase alphanumeric + hyphens)

## Implementation Steps

**Architecture Overview**: User creates collection → Store in `collections` table → Assign bookmarks via `collectionId` → Filter bookmarks by collection. User adds tags → Store as array in bookmark → Provide autocomplete → Filter by multiple tags.

### Backend Implementation

**File**: `convex/collections.ts`
* **Purpose**: CRUD operations for collections
* **Functions**:
  * `createCollection(name, description, color, icon)` - Create new collection
  * `updateCollection(id, updates)` - Update collection details
  * `deleteCollection(id)` - Delete collection (handle orphaned bookmarks)
  * `listCollections(userId)` - List user's collections

**File**: `convex/tags.ts`
* **Purpose**: Tag management and suggestions
* **Functions**:
  * `addTag(bookmarkId, tag)` - Add tag to bookmark
  * `removeTag(bookmarkId, tag)` - Remove tag from bookmark
  * `getTagSuggestions(userId, prefix)` - Autocomplete suggestions
  * `getAllTags(userId)` - List all unique tags for user

### Frontend Integration

**Component**: `app/dashboard/collections/page.tsx`
* **Purpose**: Collections management page
* **Features**: Create collection, edit, delete, view bookmarks per collection

**Component**: `components/collections/CollectionCard.tsx`
* **Purpose**: Display collection with icon, color, bookmark count
* **Features**: Click to filter bookmarks, edit/delete buttons

**Component**: `components/tags/TagInput.tsx`
* **Purpose**: Tag input with autocomplete
* **Features**: Add multiple tags, autocomplete dropdown, tag badges

**Component**: `components/tags/TagFilter.tsx`
* **Purpose**: Filter bookmarks by tags
* **Features**: Multi-select tags, clear filters, tag count display

## Code Patterns

### `convex/collections.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createCollection = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, { name, description, color, icon }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Check for duplicate name
    const existing = await ctx.db
      .query("collections")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.eq(q.field("name").toLowerCase(), name.toLowerCase()))
      .first();

    if (existing) {
      throw new Error("Collection with this name already exists");
    }

    const collectionId = await ctx.db.insert("collections", {
      userId: identity.subject,
      name,
      description: description || "",
      color: color || "blue",
      icon: icon || "📁",
      createdAt: Date.now(),
    });

    return collectionId;
  },
});

export const listCollections = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    return await ctx.db
      .query("collections")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .collect();
  },
});

export const deleteCollection = mutation({
  args: { id: v.id("collections") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const collection = await ctx.db.get(id);
    if (!collection || collection.userId !== identity.subject) {
      throw new Error("Collection not found");
    }

    // Unlink bookmarks from this collection
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_collectionId", (q) => q.eq("collectionId", id))
      .collect();

    for (const bookmark of bookmarks) {
      await ctx.db.patch(bookmark._id, { collectionId: undefined });
    }

    await ctx.db.delete(id);
    return { success: true };
  },
});
```

**Validation**: Prevents duplicate collection names, handles orphaned bookmarks when deleting collections, enforces user ownership.

### `convex/tags.ts`

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const addTag = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    tag: v.string(),
  },
  handler: async (ctx, { bookmarkId, tag }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const bookmark = await ctx.db.get(bookmarkId);
    if (!bookmark || bookmark.userId !== identity.subject) {
      throw new Error("Bookmark not found");
    }

    // Normalize tag (lowercase, trim)
    const normalizedTag = tag.toLowerCase().trim();

    // Add tag if not already present
    if (!bookmark.tags.includes(normalizedTag)) {
      await ctx.db.patch(bookmarkId, {
        tags: [...bookmark.tags, normalizedTag],
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

export const getTagSuggestions = query({
  args: { prefix: v.string() },
  handler: async (ctx, { prefix }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    // Extract all unique tags matching prefix
    const allTags = new Set<string>();
    bookmarks.forEach((b) => {
      b.tags.forEach((tag) => {
        if (tag.startsWith(prefix.toLowerCase())) {
          allTags.add(tag);
        }
      });
    });

    return Array.from(allTags).slice(0, 20); // Limit to 20 suggestions
  },
});
```

**Validation**: Normalizes tags to lowercase, prevents duplicates, provides efficient autocomplete.

### `components/collections/CollectionCard.tsx`

```typescript
"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Edit } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface CollectionCardProps {
  id: Id<"collections">;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  bookmarkCount: number;
  onClick: () => void;
}

export function CollectionCard({
  id,
  name,
  description,
  color,
  icon,
  bookmarkCount,
  onClick,
}: CollectionCardProps) {
  const deleteCollection = useMutation(api.collections.deleteCollection);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete collection "${name}"? Bookmarks will not be deleted.`)) {
      await deleteCollection({ id });
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
      style={{ borderLeftColor: color, borderLeftWidth: "4px" }}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            {name}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-sm mt-2">{bookmarkCount} bookmarks</p>
      </CardContent>
    </Card>
  );
}
```

**Validation**: Displays collection with visual theming (color, icon), handles delete with confirmation, prevents event bubbling.

## Testing & Debugging

* **Convex Dashboard**: Verify collections created, check bookmark-collection relationships, inspect tag arrays
* **Browser DevTools**: Test tag autocomplete performance, verify collection filtering
* **Unit Tests**: Test tag normalization logic, collection name uniqueness check
* **Integration Tests**: Create collection → assign bookmarks → filter → delete collection
* **End-to-End Tests (Playwright)**: Simulate user creating collection, adding tags, filtering bookmarks

## Environment Variables

### Frontend (.env.local)
```bash
NEXT_PUBLIC_CONVEX_URL=<convex-deployment-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk-publishable-key>
```

### Backend (Convex Dashboard)
```bash
CLERK_JWT_ISSUER_DOMAIN=<clerk-jwt-issuer>
```

## Success Metrics

* ✅ Users can create collections with custom names, colors, icons
* ✅ Bookmarks correctly filter by collection
* ✅ Deleting collection unlinks bookmarks (doesn't delete them)
* ✅ Tag autocomplete shows relevant suggestions in <300ms
* ✅ Multi-tag filtering uses AND logic (shows bookmarks with ALL selected tags)
* ✅ Tag normalization prevents duplicates (Work, work, WORK all become "work")
* ✅ Real-time updates when collections/tags change
* ✅ Mobile responsive collection cards and tag inputs
