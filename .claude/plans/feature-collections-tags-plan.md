# Roadmap: Collections and Tagging System

## Context

**Tech Stack**: Next.js 15, Convex, Clerk, shadcn/ui (Combobox, Badge, Select)

**Feature Description**: Organizational system enabling users to group bookmarks into collections and apply multiple tags for flexible categorization and filtering.

**User Value**: Users can organize bookmarks into themed collections (e.g., "Work", "Learning", "Recipes") and apply tags for cross-collection categorization, making it easy to find and manage related content.

## Implementation Steps

Each step is mandatory for shipping Collections and Tagging System.

### 1. Manual Setup (User Required)

- [ ] Verify Clerk authentication is configured and working
- [ ] Verify Convex deployment is active (check dashboard)
- [ ] Confirm bookmarks table exists with `collectionId` and `tags` fields
- [ ] Verify frontend can access NEXT_PUBLIC_CONVEX_URL environment variable

### 2. Dependencies & Environment

**NPM Packages**:
```bash
# shadcn/ui components for UI elements
npx shadcn@latest add badge
npx shadcn@latest add combobox
npx shadcn@latest add select
npx shadcn@latest add popover
npx shadcn@latest add command
```

**Environment Variables** (`.env.local`):
```bash
# Frontend
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-key>

# Backend (set in Convex Dashboard → Settings → Environment Variables)
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
    collectionId: v.optional(v.id("collections")), // Link to collection
    tags: v.array(v.string()), // Array of tag strings
    notes: v.optional(v.string()),
    transcript: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_collectionId", ["collectionId"]) // For filtering by collection
    .index("by_url", ["url"])
    .index("by_userId_createdAt", ["userId", "createdAt"]),

  collections: defineTable({
    userId: v.string(),
    name: v.string(), // Unique per user
    description: v.optional(v.string()),
    color: v.optional(v.string()), // Hex color for UI customization
    icon: v.optional(v.string()), // Emoji or icon identifier
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_name", ["userId", "name"]), // For duplicate detection

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

**File**: `convex/collections.ts`

#### Mutations

**`createCollection`** (Mutation)
- **Purpose**: Create a new collection
- **Args**: `{ name: v.string(), description: v.optional(v.string()), color: v.optional(v.string()), icon: v.optional(v.string()) }`
- **Returns**: `Id<"collections">`
- **Auth**: Verify `ctx.auth.getUserIdentity()` exists
- **Implementation**:
  - Get userId from `identity.subject`
  - Normalize collection name (trim, lowercase for comparison)
  - Check for duplicate name using `by_userId_name` index
  - Validate color format (hex code) if provided
  - Insert collection with default icon if not provided
  - Return collection ID

```typescript
import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const createCollection = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    // Normalize and validate name
    const normalizedName = args.name.trim();
    if (!normalizedName) throw new Error("Collection name cannot be empty");

    // Check for duplicate
    const existing = await ctx.db
      .query("collections")
      .withIndex("by_userId_name", (q) =>
        q.eq("userId", userId).eq("name", normalizedName)
      )
      .first();

    if (existing) {
      throw new Error("A collection with this name already exists");
    }

    // Validate color format (optional)
    if (args.color && !/^#[0-9A-F]{6}$/i.test(args.color)) {
      throw new Error("Invalid color format. Use hex format (e.g., #FF5733)");
    }

    const collectionId = await ctx.db.insert("collections", {
      userId,
      name: normalizedName,
      description: args.description,
      color: args.color || "#6366f1", // Default indigo color
      icon: args.icon || "📁", // Default folder emoji
      createdAt: Date.now(),
    });

    return collectionId;
  },
});
```

**`updateCollection`** (Mutation)
- **Purpose**: Update an existing collection
- **Args**: `{ id: v.id("collections"), name: v.optional(v.string()), description: v.optional(v.string()), color: v.optional(v.string()), icon: v.optional(v.string()) }`
- **Returns**: `Id<"collections">`
- **Auth**: Verify collection belongs to authenticated user
- **Implementation**:
  - Get userId from `ctx.auth.getUserIdentity()`
  - Fetch existing collection by ID
  - Verify ownership
  - If name is being changed, check for duplicates
  - Validate color format if provided
  - Update collection fields
  - Return collection ID

```typescript
export const updateCollection = mutation({
  args: {
    id: v.id("collections"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    const collection = await ctx.db.get(args.id);
    if (!collection) throw new Error("Collection not found");
    if (collection.userId !== userId) throw new Error("Unauthorized");

    const updates: Record<string, any> = {};

    // Check for duplicate name if changing
    if (args.name !== undefined) {
      const normalizedName = args.name.trim();
      if (!normalizedName) throw new Error("Collection name cannot be empty");

      if (normalizedName !== collection.name) {
        const existing = await ctx.db
          .query("collections")
          .withIndex("by_userId_name", (q) =>
            q.eq("userId", userId).eq("name", normalizedName)
          )
          .first();

        if (existing) {
          throw new Error("A collection with this name already exists");
        }
      }

      updates.name = normalizedName;
    }

    if (args.description !== undefined) updates.description = args.description;
    if (args.icon !== undefined) updates.icon = args.icon;

    if (args.color !== undefined) {
      if (!/^#[0-9A-F]{6}$/i.test(args.color)) {
        throw new Error("Invalid color format. Use hex format (e.g., #FF5733)");
      }
      updates.color = args.color;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});
```

**`deleteCollection`** (Mutation)
- **Purpose**: Delete a collection and handle orphaned bookmarks
- **Args**: `{ id: v.id("collections"), orphanAction: v.union(v.literal("unassign"), v.literal("delete")) }`
- **Returns**: Object `{ success: true, orphanedCount: number }`
- **Auth**: Verify collection belongs to authenticated user
- **Implementation**:
  - Get userId from `ctx.auth.getUserIdentity()`
  - Fetch collection by ID and verify ownership
  - Find all bookmarks in this collection
  - If `orphanAction` is "unassign", set `collectionId` to `undefined`
  - If `orphanAction` is "delete", delete all bookmarks
  - Delete collection
  - Return success with count of affected bookmarks

```typescript
export const deleteCollection = mutation({
  args: {
    id: v.id("collections"),
    orphanAction: v.union(v.literal("unassign"), v.literal("delete")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    const collection = await ctx.db.get(args.id);
    if (!collection) throw new Error("Collection not found");
    if (collection.userId !== userId) throw new Error("Unauthorized");

    // Find bookmarks in this collection
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_collectionId", (q) => q.eq("collectionId", args.id))
      .collect();

    // Handle orphaned bookmarks
    if (args.orphanAction === "unassign") {
      for (const bookmark of bookmarks) {
        await ctx.db.patch(bookmark._id, { collectionId: undefined });
      }
    } else if (args.orphanAction === "delete") {
      for (const bookmark of bookmarks) {
        await ctx.db.delete(bookmark._id);
      }
    }

    await ctx.db.delete(args.id);

    return {
      success: true,
      orphanedCount: bookmarks.length,
    };
  },
});
```

#### Queries

**`listCollections`** (Query)
- **Purpose**: List all collections for the authenticated user
- **Args**: None
- **Returns**: Array of collection objects sorted by name
- **Auth**: Verify `ctx.auth.getUserIdentity()` exists
- **Implementation**:
  - Get userId from identity
  - Query collections using `by_userId` index
  - For each collection, count bookmarks using `by_collectionId` index
  - Sort by name alphabetically
  - Return array with bookmark counts

```typescript
import { query } from "./_generated/server";

export const listCollections = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const collections = await ctx.db
      .query("collections")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Count bookmarks for each collection
    const collectionsWithCounts = await Promise.all(
      collections.map(async (collection) => {
        const count = await ctx.db
          .query("bookmarks")
          .withIndex("by_collectionId", (q) => q.eq("collectionId", collection._id))
          .collect()
          .then((bookmarks) => bookmarks.length);

        return {
          ...collection,
          bookmarkCount: count,
        };
      })
    );

    // Sort by name
    return collectionsWithCounts.sort((a, b) => a.name.localeCompare(b.name));
  },
});
```

**`getCollection`** (Query)
- **Purpose**: Fetch a single collection by ID with bookmark count
- **Args**: `{ id: v.id("collections") }`
- **Returns**: Collection object with `bookmarkCount` field or null
- **Auth**: Verify collection belongs to authenticated user
- **Implementation**:
  - Get userId from `ctx.auth.getUserIdentity()`
  - Fetch collection by ID
  - Verify ownership or return null
  - Count bookmarks in collection
  - Return collection with count

```typescript
export const getCollection = query({
  args: { id: v.id("collections") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const collection = await ctx.db.get(args.id);
    if (!collection || collection.userId !== userId) return null;

    const bookmarkCount = await ctx.db
      .query("bookmarks")
      .withIndex("by_collectionId", (q) => q.eq("collectionId", args.id))
      .collect()
      .then((bookmarks) => bookmarks.length);

    return {
      ...collection,
      bookmarkCount,
    };
  },
});
```

**File**: `convex/tags.ts`

#### Queries

**`getAllTags`** (Query)
- **Purpose**: Get all unique tags used by the authenticated user with usage counts
- **Args**: None
- **Returns**: Array of `{ tag: string, count: number }` sorted by count descending
- **Auth**: Verify `ctx.auth.getUserIdentity()` exists
- **Implementation**:
  - Get userId from identity
  - Fetch all bookmarks for user
  - Flatten tags arrays into single array
  - Count occurrences of each tag
  - Sort by count descending
  - Return array of tag objects

```typescript
import { v } from "convex/values";
import { query } from "./_generated/server";

export const getAllTags = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Count tag occurrences
    const tagCounts = new Map<string, number>();
    for (const bookmark of bookmarks) {
      for (const tag of bookmark.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    // Convert to array and sort by count
    const tagsArray = Array.from(tagCounts.entries()).map(([tag, count]) => ({
      tag,
      count,
    }));

    return tagsArray.sort((a, b) => b.count - a.count);
  },
});
```

**`getTagSuggestions`** (Query)
- **Purpose**: Get tag suggestions based on partial input for autocomplete
- **Args**: `{ query: v.string() }`
- **Returns**: Array of matching tags sorted by relevance
- **Auth**: Verify `ctx.auth.getUserIdentity()` exists
- **Implementation**:
  - Get userId from identity
  - Fetch all tags for user
  - Filter tags that start with query (case-insensitive)
  - Sort by usage count descending
  - Limit to top 10 suggestions
  - Return array of tag strings

```typescript
export const getTagSuggestions = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const allTags = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect()
      .then((bookmarks) => {
        const tagCounts = new Map<string, number>();
        for (const bookmark of bookmarks) {
          for (const tag of bookmark.tags) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        }
        return Array.from(tagCounts.entries());
      });

    const queryLower = args.query.toLowerCase();
    const matches = allTags
      .filter(([tag]) => tag.toLowerCase().startsWith(queryLower))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    return matches;
  },
});
```

#### Mutations

**`addTagToBookmark`** (Mutation)
- **Purpose**: Add a tag to a bookmark (avoid duplicates)
- **Args**: `{ bookmarkId: v.id("bookmarks"), tag: v.string() }`
- **Returns**: Success object
- **Auth**: Verify bookmark belongs to authenticated user
- **Implementation**:
  - Get userId from `ctx.auth.getUserIdentity()`
  - Fetch bookmark by ID and verify ownership
  - Normalize tag (trim, lowercase)
  - Check if tag already exists in bookmark
  - Add tag to array if not duplicate
  - Update bookmark
  - Return success

```typescript
import { mutation } from "./_generated/server";

export const addTagToBookmark = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark) throw new Error("Bookmark not found");
    if (bookmark.userId !== userId) throw new Error("Unauthorized");

    const normalizedTag = args.tag.trim().toLowerCase();
    if (!normalizedTag) throw new Error("Tag cannot be empty");

    if (bookmark.tags.includes(normalizedTag)) {
      return { success: true, message: "Tag already exists" };
    }

    await ctx.db.patch(args.bookmarkId, {
      tags: [...bookmark.tags, normalizedTag],
      updatedAt: Date.now(),
    });

    return { success: true, message: "Tag added" };
  },
});
```

**`removeTagFromBookmark`** (Mutation)
- **Purpose**: Remove a tag from a bookmark
- **Args**: `{ bookmarkId: v.id("bookmarks"), tag: v.string() }`
- **Returns**: Success object
- **Auth**: Verify bookmark belongs to authenticated user
- **Implementation**:
  - Get userId from `ctx.auth.getUserIdentity()`
  - Fetch bookmark by ID and verify ownership
  - Filter out the specified tag
  - Update bookmark with new tags array
  - Return success

```typescript
export const removeTagFromBookmark = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const userId = identity.subject;

    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark) throw new Error("Bookmark not found");
    if (bookmark.userId !== userId) throw new Error("Unauthorized");

    const newTags = bookmark.tags.filter((t) => t !== args.tag);

    await ctx.db.patch(args.bookmarkId, {
      tags: newTags,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Tag removed" };
  },
});
```

### 5. Frontend

**File**: `app/dashboard/collections/page.tsx`
- **Purpose**: Collections management page
- **Components**: `<CollectionGrid />`, `<CreateCollectionButton />`, `<CollectionCard />`
- **Hooks**:
  - `useQuery(api.collections.listCollections)` for fetching collections
  - `useMutation(api.collections.deleteCollection)` for delete action
- **State**: Selected collection, delete confirmation dialog state
- **Layout**: Grid of collection cards with create button

**Component**: `components/collections/CreateCollectionDialog.tsx`
- **Purpose**: Modal dialog for creating new collections
- **Props**: `open`, `onOpenChange`
- **Features**:
  - Name input (required)
  - Description textarea (optional)
  - Color picker for collection theme
  - Icon/emoji picker (optional)
  - Submit button calls `createCollection` mutation
  - Validation for duplicate names
  - Preview of collection appearance

```typescript
"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface CreateCollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateCollectionDialog({ open, onOpenChange }: CreateCollectionDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [icon, setIcon] = useState("📁");

  const createCollection = useMutation(api.collections.createCollection);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Collection name is required", variant: "destructive" });
      return;
    }

    try {
      await createCollection({
        name,
        description: description || undefined,
        color,
        icon,
      });

      toast({ title: "Collection created successfully" });
      onOpenChange(false);
      // Reset form
      setName("");
      setDescription("");
      setColor("#6366f1");
      setIcon("📁");
    } catch (error: any) {
      toast({ title: error.message || "Failed to create collection", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Collection</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Work, Learning, Recipes"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this collection"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="📁"
                maxLength={2}
              />
            </div>
          </div>
          <div className="p-4 border rounded-lg" style={{ borderColor: color }}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{icon}</span>
              <div>
                <div className="font-semibold">{name || "Collection Name"}</div>
                <div className="text-sm text-muted-foreground">
                  {description || "Collection description"}
                </div>
              </div>
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full">
            Create Collection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Component**: `components/collections/CollectionCard.tsx`
- **Purpose**: Display a single collection with stats
- **Props**: `collection` object (with `bookmarkCount`), `onEdit`, `onDelete`, `onClick`
- **Features**:
  - Collection icon and name
  - Bookmark count badge
  - Color-coded border or background
  - Hover effect showing edit/delete actions
  - Click to view bookmarks in collection
  - Context menu for quick actions

**Component**: `components/collections/CollectionSelector.tsx`
- **Purpose**: Dropdown for selecting a collection (used in bookmark forms)
- **Props**: `value`, `onChange`, `allowNone` (boolean)
- **Features**:
  - Combobox with search functionality
  - Lists all user's collections
  - "None" option to unassign from collection
  - Shows collection icon and color
  - Create new collection inline option

**Component**: `components/tags/TagInput.tsx`
- **Purpose**: Input field with autocomplete for adding tags
- **Props**: `value` (string[]), `onChange`, `placeholder`
- **Features**:
  - Displays current tags as dismissible badges
  - Input field for adding new tags
  - Autocomplete dropdown using `getTagSuggestions` query
  - Enter or comma to add tag
  - Click X on badge to remove tag
  - Tag normalization (trim, lowercase)
  - Duplicate prevention

```typescript
"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { X } from "lucide-react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [input, setInput] = useState("");
  const suggestions = useQuery(api.tags.getTagSuggestions, { query: input });

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    if (normalized && !value.includes(normalized)) {
      onChange([...value, normalized]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || "Add tags..."}
        />
        {input && suggestions && suggestions.length > 0 && (
          <Command className="absolute top-full mt-1 w-full border rounded-md shadow-md bg-background z-10">
            <CommandGroup>
              {suggestions.map((tag) => (
                <CommandItem key={tag} onSelect={() => addTag(tag)}>
                  {tag}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        )}
      </div>
    </div>
  );
}
```

**Component**: `components/tags/TagFilter.tsx`
- **Purpose**: Filter bookmarks by tags
- **Props**: `selectedTags` (string[]), `onSelectedTagsChange`
- **Features**:
  - Shows all available tags with usage counts
  - Multi-select checkboxes
  - "Match all" vs "Match any" toggle
  - Clear all filters button
  - Active filters displayed as badges

### 6. Error Prevention

**Convex Validators**:
- [ ] All mutations use proper validators: `v.id()`, `v.string()`, `v.array()`, `v.union()`
- [ ] Validate collection names are not empty after trimming
- [ ] Validate color format (hex code) before saving
- [ ] Validate userId matches authenticated user

**Authentication**:
- [ ] Every mutation/query checks `ctx.auth.getUserIdentity()`
- [ ] Return 401 error if no identity found
- [ ] Extract userId from `identity.subject` consistently
- [ ] Never trust client-provided userId parameter

**Authorization**:
- [ ] All queries filter by userId (row-level security)
- [ ] Collection updates verify ownership before modifying
- [ ] Bookmark-collection assignment validates collection ownership
- [ ] Tag operations verify bookmark ownership

**Type Safety**:
- [ ] Use generated Convex types: `Id<"collections">`, `Doc<"collections">`
- [ ] Properly type mutation/query return values
- [ ] Type component props with TypeScript interfaces
- [ ] Type tag arrays consistently as `string[]`

**Duplicate Detection**:
- [ ] Check for existing collection name before creating
- [ ] Use `by_userId_name` index for efficient duplicate queries
- [ ] Case-insensitive name comparison (normalize before checking)
- [ ] Show user-friendly error message when duplicate found

**Tag Normalization**:
- [ ] Always trim tag strings before saving
- [ ] Convert tags to lowercase for consistency
- [ ] Remove duplicate tags from arrays
- [ ] Handle empty tags gracefully

**Orphaned Bookmarks**:
- [ ] Require user to choose action when deleting collection
- [ ] Options: unassign bookmarks or delete bookmarks
- [ ] Show warning with bookmark count before deletion
- [ ] Implement confirmation dialog for destructive actions

**Error Handling**:
- [ ] Wrap database operations in try-catch
- [ ] Display user-friendly error messages
- [ ] Log errors to monitoring service
- [ ] Handle race conditions (e.g., collection deleted while bookmark being added)

### 7. Testing

**Unit Tests**:
- [ ] Test `createCollection` with valid and invalid names
- [ ] Test duplicate collection name detection
- [ ] Test tag normalization (trim, lowercase)
- [ ] Test tag deduplication logic
- [ ] Test orphaned bookmark handling on collection delete

**Integration Tests**:
- [ ] Create collection → verify appears in list
- [ ] Update collection → verify changes persisted
- [ ] Delete collection with unassign → verify bookmarks kept
- [ ] Delete collection with delete → verify bookmarks removed
- [ ] Add tags to bookmark → verify tags saved correctly
- [ ] Remove tags from bookmark → verify tags removed
- [ ] Test tag autocomplete suggestions

**End-to-End Tests (Playwright)**:
- [ ] User creates new collection
- [ ] Verify collection appears in collections page
- [ ] User assigns bookmark to collection
- [ ] Verify bookmark appears when filtering by collection
- [ ] User adds tags to bookmark
- [ ] Verify tags displayed on bookmark card
- [ ] User filters bookmarks by tag
- [ ] Verify only matching bookmarks shown
- [ ] User deletes collection with unassign option
- [ ] Verify bookmarks still exist but unassigned
- [ ] User deletes collection with delete option
- [ ] Verify bookmarks also deleted

**Manual Testing Checklist**:
- [ ] Create collection with emoji icon
- [ ] Create collection with custom color
- [ ] Verify collection color applied to UI elements
- [ ] Add bookmarks to collection via drag-and-drop (if implemented)
- [ ] Move bookmark between collections
- [ ] Remove bookmark from collection
- [ ] Edit collection name and verify no duplicates allowed
- [ ] Delete collection and choose unassign option
- [ ] Delete collection and choose delete option
- [ ] Add tags to bookmark with autocomplete
- [ ] Type partial tag name and verify suggestions appear
- [ ] Filter bookmarks by single tag
- [ ] Filter bookmarks by multiple tags (AND logic)
- [ ] Filter bookmarks by multiple tags (OR logic)
- [ ] Verify tag usage counts accurate
- [ ] Test with multiple user accounts (no data leakage)

## Documentation Sources

1. Convex Mutations - https://docs.convex.dev/functions/mutations
2. Convex Queries - https://docs.convex.dev/functions/queries
3. Convex Indexes - https://docs.convex.dev/database/indexes
4. Clerk Authentication - https://clerk.com/docs/references/nextjs/overview
5. Next.js 15 App Router - https://nextjs.org/docs/app
6. shadcn/ui Badge - https://ui.shadcn.com/docs/components/badge
7. shadcn/ui Combobox - https://ui.shadcn.com/docs/components/combobox
8. shadcn/ui Select - https://ui.shadcn.com/docs/components/select
9. shadcn/ui Command - https://ui.shadcn.com/docs/components/command
10. TypeScript Arrays - https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#arrays
