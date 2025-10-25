# Roadmap: YouTube Transcript Extraction

## Context

**Tech Stack**: Next.js 15, Convex, Clerk, YouTube Transcript API (free, no API key required)

**Feature Description**: Automatic detection and extraction of YouTube video transcripts when users bookmark YouTube URLs, storing transcripts for searchability and RAG chat integration.

**User Value**: Users can bookmark YouTube videos and have their full transcripts automatically extracted and stored, making video content searchable and enabling AI chat to reference video content accurately.

## Implementation Steps

Each step is mandatory for shipping YouTube Transcript Extraction.

### 1. Manual Setup (User Required)

- [ ] Verify Clerk authentication is configured and working
- [ ] Verify Convex deployment is active (check dashboard)
- [ ] Confirm bookmarks table exists with `transcript` field
- [ ] Verify frontend can access NEXT_PUBLIC_CONVEX_URL environment variable
- [ ] No API key required (YouTube Transcript API is free and open)

### 2. Dependencies & Environment

**NPM Packages**:
```bash
# Install YouTube Transcript API client
npm install youtube-transcript
# TypeScript types (if available)
npm install --save-dev @types/youtube-transcript
```

**Alternative (if npm package unavailable)**:
```bash
# Use custom fetch-based implementation (no dependencies required)
# The Transcript API is accessible via standard HTTP requests
```

**Environment Variables** (`.env.local`):
```bash
# Frontend
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-key>

# Backend (set in Convex Dashboard → Settings → Environment Variables)
CLERK_JWT_ISSUER_DOMAIN=<your-clerk-jwt-issuer>
# No YouTube API key required
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
    transcript: v.optional(v.string()), // YouTube video transcript (full text)
    transcriptLanguage: v.optional(v.string()), // Language code (e.g., "en", "es")
    isYouTubeVideo: v.optional(v.boolean()), // Flag for YouTube URLs
    youtubeVideoId: v.optional(v.string()), // Extracted video ID
    embedding: v.optional(v.array(v.float64())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_collectionId", ["collectionId"])
    .index("by_url", ["url"])
    .index("by_userId_createdAt", ["userId", "createdAt"])
    .index("by_userId_isYouTubeVideo", ["userId", "isYouTubeVideo"]), // For filtering YouTube bookmarks

  collections: defineTable({
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_name", ["userId", "name"]),

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

**File**: `convex/youtube.ts`

#### Helper Functions (Internal)

**`isYouTubeUrl`** (Internal function)
- **Purpose**: Detect if a URL is a YouTube video
- **Args**: `url: string`
- **Returns**: `boolean`
- **Implementation**:
  - Check if URL contains `youtube.com/watch` or `youtu.be/`
  - Support mobile URLs (`m.youtube.com`)
  - Support embed URLs (`youtube.com/embed/`)
  - Return true if matches any pattern

```typescript
// Internal utility function (not exported as Convex function)
export function isYouTubeUrl(url: string): boolean {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ];

  return patterns.some((pattern) => pattern.test(url));
}
```

**`extractVideoId`** (Internal function)
- **Purpose**: Extract video ID from YouTube URL
- **Args**: `url: string`
- **Returns**: `string | null`
- **Implementation**:
  - Use regex to match video ID patterns
  - Handle different URL formats (watch, short, embed)
  - Return 11-character video ID or null

```typescript
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
```

#### Actions

**`fetchTranscript`** (Action)
- **Purpose**: Fetch transcript from YouTube video using YouTube Transcript API
- **Args**: `{ videoId: v.string(), preferredLanguage: v.optional(v.string()) }`
- **Returns**: Object with `transcript: string`, `language: string`
- **Auth**: Verify `ctx.auth.getUserIdentity()` exists
- **Implementation**:
  - Use `youtube-transcript` npm package or custom fetch
  - Request transcript with preferred language (default "en")
  - Fallback to auto-generated transcript if manual unavailable
  - Combine transcript segments into single text
  - Handle cases where transcript is disabled/unavailable
  - Return full transcript text and detected language

```typescript
import { v } from "convex/values";
import { action } from "./_generated/server";

export const fetchTranscript = action({
  args: {
    videoId: v.string(),
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    try {
      // YouTube Transcript API endpoint (unofficial but widely used)
      const apiUrl = `https://youtube-transcript-api.alexcomeau.com/api/transcript`;
      const params = new URLSearchParams({
        videoId: args.videoId,
        lang: args.preferredLanguage || "en",
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(`${apiUrl}?${params.toString()}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Transcript API error: ${response.status}`);
      }

      const data = await response.json();

      // data is an array of { text, offset, duration }
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error("No transcript available for this video");
      }

      // Combine all text segments
      const fullTranscript = data.map((segment: any) => segment.text).join(" ");

      return {
        transcript: fullTranscript,
        language: args.preferredLanguage || "en",
      };
    } catch (error: any) {
      console.error("Transcript extraction failed:", error);

      // Check if error is due to disabled transcripts
      if (error.message.includes("disabled") || error.message.includes("unavailable")) {
        throw new Error("Transcripts are disabled for this video");
      }

      // Return null for graceful handling
      throw new Error("Failed to fetch transcript. The video may not have captions available.");
    }
  },
});
```

**Alternative Implementation (using youtube-transcript npm package)**:
```typescript
// If using the npm package instead of API endpoint
import { YoutubeTranscript } from "youtube-transcript";

export const fetchTranscript = action({
  args: {
    videoId: v.string(),
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    try {
      const transcriptData = await YoutubeTranscript.fetchTranscript(args.videoId, {
        lang: args.preferredLanguage || "en",
      });

      const fullTranscript = transcriptData.map((segment) => segment.text).join(" ");

      return {
        transcript: fullTranscript,
        language: args.preferredLanguage || "en",
      };
    } catch (error: any) {
      console.error("Transcript extraction failed:", error);
      throw new Error("Failed to fetch transcript. The video may not have captions available.");
    }
  },
});
```

**`processYouTubeBookmark`** (Action)
- **Purpose**: Enhanced bookmark creation that detects YouTube URLs and extracts transcripts
- **Args**: Same as `createBookmark` mutation
- **Returns**: `Id<"bookmarks">`
- **Auth**: Verify `ctx.auth.getUserIdentity()` exists
- **Implementation**:
  - Check if URL is YouTube video using `isYouTubeUrl`
  - If YouTube, extract video ID using `extractVideoId`
  - Call `fetchTranscript` to get transcript (non-blocking if fails)
  - Enhance metadata with YouTube-specific fields
  - Call `createBookmark` mutation with all data
  - Return bookmark ID

```typescript
import { internal } from "./_generated/api";

export const processYouTubeBookmark = action({
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

    let transcript: string | undefined;
    let transcriptLanguage: string | undefined;
    let isYouTubeVideo = false;
    let youtubeVideoId: string | undefined;

    // Check if URL is YouTube
    if (isYouTubeUrl(args.url)) {
      isYouTubeVideo = true;
      const videoId = extractVideoId(args.url);

      if (videoId) {
        youtubeVideoId = videoId;

        try {
          // Attempt to fetch transcript
          const transcriptData = await ctx.runAction(internal.youtube.fetchTranscript, {
            videoId,
            preferredLanguage: "en",
          });

          transcript = transcriptData.transcript;
          transcriptLanguage = transcriptData.language;
        } catch (error) {
          console.error("Failed to fetch transcript, continuing without it:", error);
          // Don't fail the entire bookmark creation if transcript fails
        }
      }
    }

    // Create bookmark with enhanced data
    const bookmarkId = await ctx.runMutation(internal.bookmarks.createBookmarkInternal, {
      userId: identity.subject,
      url: args.url,
      title: args.title || args.url,
      description: args.description,
      imageUrl: args.imageUrl,
      faviconUrl: args.faviconUrl,
      collectionId: args.collectionId,
      tags: args.tags || [],
      notes: args.notes,
      transcript,
      transcriptLanguage,
      isYouTubeVideo,
      youtubeVideoId,
    });

    return bookmarkId;
  },
});
```

#### Internal Mutations

**File**: `convex/bookmarks.ts` (enhance existing file)

**`createBookmarkInternal`** (Internal Mutation)
- **Purpose**: Internal mutation that accepts YouTube-specific fields
- **Args**: All bookmark fields + `transcript`, `transcriptLanguage`, `isYouTubeVideo`, `youtubeVideoId`
- **Returns**: `Id<"bookmarks">`
- **Auth**: Called internally, assumes validation already done
- **Implementation**:
  - Same as `createBookmark` but includes YouTube fields
  - Used by `processYouTubeBookmark` action

```typescript
import { internalMutation } from "./_generated/server";

export const createBookmarkInternal = internalMutation({
  args: {
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
    transcriptLanguage: v.optional(v.string()),
    isYouTubeVideo: v.optional(v.boolean()),
    youtubeVideoId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existing) {
      throw new Error("This URL has already been bookmarked");
    }

    const now = Date.now();
    const bookmarkId = await ctx.db.insert("bookmarks", {
      userId: args.userId,
      url: args.url,
      title: args.title,
      description: args.description,
      imageUrl: args.imageUrl,
      faviconUrl: args.faviconUrl,
      collectionId: args.collectionId,
      tags: args.tags,
      notes: args.notes,
      transcript: args.transcript,
      transcriptLanguage: args.transcriptLanguage,
      isYouTubeVideo: args.isYouTubeVideo,
      youtubeVideoId: args.youtubeVideoId,
      createdAt: now,
      updatedAt: now,
    });

    return bookmarkId;
  },
});
```

#### Queries

**`getYouTubeBookmarks`** (Query)
- **Purpose**: List all YouTube bookmarks for the authenticated user
- **Args**: `{ limit: v.optional(v.number()) }`
- **Returns**: Array of YouTube bookmark objects
- **Auth**: Verify `ctx.auth.getUserIdentity()` exists
- **Implementation**:
  - Get userId from identity
  - Query bookmarks using `by_userId_isYouTubeVideo` index
  - Filter where `isYouTubeVideo === true`
  - Sort by `createdAt` descending
  - Apply limit (default 50)
  - Return array

```typescript
import { query } from "./_generated/server";

export const getYouTubeBookmarks = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_userId_isYouTubeVideo", (q) =>
        q.eq("userId", userId).eq("isYouTubeVideo", true)
      )
      .order("desc")
      .take(args.limit || 50);

    return bookmarks;
  },
});
```

### 5. Frontend

**File**: `app/dashboard/bookmarks/page.tsx` (enhance existing)
- **Purpose**: Update AddBookmark flow to use `processYouTubeBookmark` action
- **Changes**:
  - Replace `createBookmark` mutation with `processYouTubeBookmark` action
  - Show loading state: "Extracting transcript..." when URL is YouTube
  - Display success message indicating transcript was extracted
  - Handle graceful fallback if transcript extraction fails

**Component**: `components/bookmarks/AddBookmarkDialog.tsx` (enhance existing)
- **Purpose**: Enhanced dialog that handles YouTube URLs specially
- **Features**:
  - Detect YouTube URL on paste/input
  - Show YouTube badge when URL detected
  - Call `processYouTubeBookmark` action instead of `createBookmark` mutation
  - Display transcript extraction progress indicator
  - Show success/warning toast based on transcript availability
  - Display transcript preview in dialog (optional, truncated)

```typescript
"use client";

import { useState, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Youtube } from "lucide-react";

interface AddBookmarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectionId?: string;
}

// Helper function to detect YouTube URLs
function isYouTubeUrl(url: string): boolean {
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  return patterns.some((pattern) => pattern.test(url));
}

export function AddBookmarkDialog({ open, onOpenChange, collectionId }: AddBookmarkDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isYouTube, setIsYouTube] = useState(false);

  const extractMetadata = useAction(api.bookmarks.extractMetadata);
  const processYouTubeBookmark = useAction(api.youtube.processYouTubeBookmark);
  const { toast } = useToast();

  // Detect YouTube URL on input change
  useEffect(() => {
    setIsYouTube(isYouTubeUrl(url));
  }, [url]);

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

    setIsExtracting(true);
    try {
      await processYouTubeBookmark({
        url,
        title,
        description: description || undefined,
        notes: notes || undefined,
        tags: tags ? tags.split(",").map((t) => t.trim()) : [],
        collectionId: collectionId as any,
      });

      if (isYouTube) {
        toast({
          title: "YouTube bookmark created",
          description: "Transcript extraction in progress...",
        });
      } else {
        toast({ title: "Bookmark created successfully" });
      }

      onOpenChange(false);
      // Reset form
      setUrl("");
      setTitle("");
      setDescription("");
      setNotes("");
      setTags("");
    } catch (error: any) {
      toast({ title: error.message || "Failed to create bookmark", variant: "destructive" });
    } finally {
      setIsExtracting(false);
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
              <div className="flex-1 relative">
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                />
                {isYouTube && (
                  <Badge className="absolute right-2 top-1/2 -translate-y-1/2" variant="secondary">
                    <Youtube className="h-3 w-3 mr-1" />
                    YouTube
                  </Badge>
                )}
              </div>
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
          {isYouTube && (
            <div className="p-3 bg-muted rounded-md text-sm">
              <p className="flex items-center gap-2">
                <Youtube className="h-4 w-4" />
                Transcript will be automatically extracted for AI search
              </p>
            </div>
          )}
          <Button onClick={handleSubmit} className="w-full" disabled={isExtracting}>
            {isExtracting ? "Creating..." : "Create Bookmark"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Component**: `components/bookmarks/YouTubePreview.tsx`
- **Purpose**: Enhanced bookmark card for YouTube videos
- **Props**: `bookmark` object (with transcript)
- **Features**:
  - Embedded YouTube player thumbnail
  - YouTube logo badge
  - "View Transcript" button
  - Transcript length indicator (e.g., "2,450 words")
  - Click to expand full transcript in modal
  - Search/highlight within transcript (optional)

```typescript
"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Youtube, FileText } from "lucide-react";

interface YouTubePreviewProps {
  bookmark: {
    youtubeVideoId?: string;
    title: string;
    transcript?: string;
    transcriptLanguage?: string;
  };
}

export function YouTubePreview({ bookmark }: YouTubePreviewProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  if (!bookmark.youtubeVideoId) return null;

  const thumbnailUrl = `https://img.youtube.com/vi/${bookmark.youtubeVideoId}/maxresdefault.jpg`;
  const wordCount = bookmark.transcript ? bookmark.transcript.split(" ").length : 0;

  return (
    <div className="space-y-2">
      <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
        <img
          src={thumbnailUrl}
          alt={bookmark.title}
          className="w-full h-full object-cover"
        />
        <Badge className="absolute top-2 right-2" variant="destructive">
          <Youtube className="h-3 w-3 mr-1" />
          YouTube
        </Badge>
      </div>

      {bookmark.transcript && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <FileText className="h-4 w-4" />
            {wordCount.toLocaleString()} words
            {bookmark.transcriptLanguage && ` (${bookmark.transcriptLanguage})`}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTranscript(true)}
          >
            View Transcript
          </Button>
        </div>
      )}

      <Dialog open={showTranscript} onOpenChange={setShowTranscript}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{bookmark.title} - Transcript</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] prose prose-sm dark:prose-invert">
            <p className="whitespace-pre-wrap">{bookmark.transcript}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

**Component**: `components/bookmarks/TranscriptViewer.tsx`
- **Purpose**: Standalone transcript viewer with search and highlighting
- **Props**: `transcript` string, `videoId` string
- **Features**:
  - Full transcript display with timestamps (if available)
  - Search within transcript
  - Highlight search results
  - Copy transcript to clipboard
  - Download transcript as .txt file
  - Jump to timestamp in YouTube player (optional)

### 6. Error Prevention

**Convex Validators**:
- [ ] Validate YouTube video ID format (11 alphanumeric characters)
- [ ] Validate transcript is string or undefined
- [ ] Validate language code format (2-letter ISO code)
- [ ] Validate userId matches authenticated user

**Authentication**:
- [ ] Every action checks `ctx.auth.getUserIdentity()`
- [ ] Return 401 error if no identity found
- [ ] Extract userId from `identity.subject` consistently

**Authorization**:
- [ ] Transcript queries verify bookmark ownership
- [ ] Only user who created bookmark can access transcript

**Type Safety**:
- [ ] Use generated Convex types for all database operations
- [ ] Type YouTube Transcript API responses properly
- [ ] Handle optional fields correctly (transcript may be undefined)

**URL Parsing**:
- [ ] Validate YouTube URL format before extraction
- [ ] Handle edge cases: playlists, timestamped URLs, shorts
- [ ] Extract video ID correctly from all URL formats
- [ ] Sanitize video IDs to prevent injection

**Transcript Availability**:
- [ ] Handle videos with disabled transcripts gracefully
- [ ] Don't fail bookmark creation if transcript unavailable
- [ ] Show clear message to user when transcript missing
- [ ] Support manual transcript upload (future enhancement)

**API Error Handling**:
- [ ] Wrap transcript API calls in try-catch
- [ ] Implement timeout (15 seconds max)
- [ ] Handle rate limiting gracefully
- [ ] Log errors for monitoring
- [ ] Display user-friendly error messages

**Async Processing**:
- [ ] Don't block bookmark creation on transcript extraction
- [ ] Process transcript in background if possible
- [ ] Update bookmark record when transcript completes
- [ ] Show loading state in UI during extraction

### 7. Testing

**Unit Tests**:
- [ ] Test `isYouTubeUrl` with various URL formats
- [ ] Test `extractVideoId` with valid and invalid URLs
- [ ] Test video ID extraction from playlists (should extract first video)
- [ ] Test video ID extraction from timestamped URLs
- [ ] Test transcript text combination from segments

**Integration Tests**:
- [ ] Create bookmark with YouTube URL → verify transcript extracted
- [ ] Create bookmark with non-YouTube URL → verify no transcript
- [ ] Test with video that has transcript → verify stored correctly
- [ ] Test with video without transcript → verify graceful fallback
- [ ] Test with private video → verify error handling
- [ ] Test with deleted video → verify error handling

**End-to-End Tests (Playwright)**:
- [ ] User pastes YouTube URL into bookmark dialog
- [ ] Verify YouTube badge appears
- [ ] User submits form
- [ ] Verify bookmark created with "Extracting transcript..." message
- [ ] Wait for transcript extraction to complete
- [ ] Verify transcript stored in database
- [ ] Click "View Transcript" button
- [ ] Verify transcript modal opens with full text
- [ ] Test search within transcript
- [ ] Test copy transcript to clipboard
- [ ] Test with video without transcript → verify warning shown

**Manual Testing Checklist**:
- [ ] Add bookmark with standard YouTube URL (`youtube.com/watch?v=...`)
- [ ] Add bookmark with short YouTube URL (`youtu.be/...`)
- [ ] Add bookmark with mobile YouTube URL (`m.youtube.com/watch?v=...`)
- [ ] Add bookmark with embed YouTube URL (`youtube.com/embed/...`)
- [ ] Add bookmark with timestamped URL (`&t=120s`)
- [ ] Verify transcript extracted for video with captions
- [ ] Verify graceful handling for video without captions
- [ ] Test with age-restricted video
- [ ] Test with region-restricted video
- [ ] View transcript in modal
- [ ] Search within transcript
- [ ] Copy transcript to clipboard
- [ ] Verify transcript used in RAG chat (if integrated)
- [ ] Test with multiple user accounts (no data leakage)
- [ ] Verify mobile responsive design for transcript viewer

## Documentation Sources

1. YouTube Transcript API (Unofficial) - https://github.com/Kakulukian/youtube-transcript-api
2. YouTube URL Formats - https://gist.github.com/rodrigoborgesdeoliveira/987683cfbfcc8d800192da1e73adc486
3. Convex Actions - https://docs.convex.dev/production/actions
4. Convex Internal Functions - https://docs.convex.dev/functions/internal-functions
5. Convex Indexes - https://docs.convex.dev/database/indexes
6. Clerk Authentication - https://clerk.com/docs/references/nextjs/overview
7. Next.js 15 App Router - https://nextjs.org/docs/app
8. shadcn/ui Dialog - https://ui.shadcn.com/docs/components/dialog
9. shadcn/ui Badge - https://ui.shadcn.com/docs/components/badge
10. Fetch API with Timeout - https://developer.mozilla.org/en-US/docs/Web/API/AbortController
