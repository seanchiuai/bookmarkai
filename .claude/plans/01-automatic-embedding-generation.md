# Feature 2: Automatic Embedding Generation

## Priority: CRITICAL
This feature unblocks RAG functionality. Without automatic embeddings, the chatbot and semantic search won't work.

## Strategy
**Wait for metadata and transcription completion, then generate embeddings**

This ensures embeddings include:
- Bookmark title + description + URL (metadata)
- Full transcript text (for videos)
- Maximum context for semantic search

## Dependencies
No new dependencies required - uses existing OpenAI SDK.

## Implementation Steps

### 2.1 Update Bookmark Schema (`convex/schema.ts`)

**Add new field:**
```typescript
bookmarks: defineTable({
  // ... existing fields ...
  embeddingStatus: v.union(
    v.literal("pending"),
    v.literal("processing"),
    v.literal("completed"),
    v.literal("failed")
  ),
})
```

**Rationale:** Track embedding generation separately from metadata extraction.

---

### 2.2 Create Embedding Orchestration (`convex/embeddings.ts` - NEW FILE)

**Purpose:** Central orchestration logic that checks prerequisites before generating embeddings.

```typescript
import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const generateEmbeddingForBookmark = action({
  args: { bookmarkId: v.id("bookmarks") },
  handler: async (ctx, args) => {
    const bookmark = await ctx.runQuery(api.bookmarks.get, { id: args.bookmarkId });

    if (!bookmark) {
      return { status: "error", reason: "bookmark_not_found" };
    }

    // Check if metadata is ready
    if (bookmark.metadataStatus !== "completed") {
      return { status: "waiting", reason: "metadata_not_ready" };
    }

    // Check if video transcription is ready (if applicable)
    if (bookmark.isVideo && bookmark.transcriptId) {
      const transcript = await ctx.runQuery(
        api.transcripts.get,
        { id: bookmark.transcriptId }
      );

      if (transcript?.status !== "completed") {
        return { status: "waiting", reason: "transcript_not_ready" };
      }
    }

    // All prerequisites met - generate embedding
    await ctx.runMutation(api.bookmarks.updateEmbeddingStatus, {
      bookmarkId: args.bookmarkId,
      status: "processing"
    });

    try {
      await ctx.runAction(api.ragBookmarks.updateBookmarkEmbedding, {
        bookmarkId: args.bookmarkId
      });

      await ctx.runMutation(api.bookmarks.updateEmbeddingStatus, {
        bookmarkId: args.bookmarkId,
        status: "completed"
      });

      return { status: "success" };
    } catch (error) {
      await ctx.runMutation(api.bookmarks.updateEmbeddingStatus, {
        bookmarkId: args.bookmarkId,
        status: "failed"
      });

      return { status: "error", error: (error as Error).message };
    }
  }
});
```

---

### 2.3 Add updateEmbeddingStatus Mutation (`convex/bookmarks.ts`)

**Add this new mutation:**
```typescript
export const updateEmbeddingStatus = mutation({
  args: {
    bookmarkId: v.id("bookmarks"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const bookmark = await ctx.db.get(args.bookmarkId);
    if (!bookmark || bookmark.userId !== identity.subject) {
      throw new Error("Bookmark not found or unauthorized");
    }

    await ctx.db.patch(args.bookmarkId, {
      embeddingStatus: args.status,
      updatedAt: Date.now(),
    });
  },
});
```

---

### 2.4 Update RAG Embeddings to Include Transcripts (`convex/ragBookmarks.ts`)

**Modify the `updateBookmarkEmbedding` action (lines ~154):**

**Find this line:**
```typescript
const contentToEmbed = `${bookmark.title || ""} ${bookmark.description || ""} ${bookmark.url}`;
```

**Replace with:**
```typescript
let contentToEmbed = `${bookmark.title || ""} ${bookmark.description || ""} ${bookmark.url}`;

// Include transcript for video bookmarks
if (bookmark.transcriptId) {
  const transcript = await ctx.runQuery(api.transcripts.get, {
    id: bookmark.transcriptId
  });
  if (transcript?.fullText) {
    contentToEmbed += ` ${transcript.fullText}`;
  }
}
```

**Note:** You'll also need to add a `get` query to `convex/transcripts.ts` if it doesn't exist:
```typescript
export const get = query({
  args: { id: v.id("transcripts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const transcript = await ctx.db.get(args.id);
    if (!transcript || transcript.userId !== identity.subject) {
      return null;
    }

    return transcript;
  },
});
```

---

### 2.5 Add Trigger Hooks

#### In `convex/bookmarks.ts` - After bookmark creation

**In the `create` mutation, at the end (after line ~157):**
```typescript
const bookmarkId = await ctx.db.insert("bookmarks", {
  // ... existing fields ...
  embeddingStatus: "pending", // ADD THIS
});

// CREATE BOOKMARK-TAG RELATIONSHIPS (existing code)
// ...

// Schedule embedding generation check (ADD THIS)
await ctx.scheduler.runAfter(0, api.embeddings.generateEmbeddingForBookmark, {
  bookmarkId
});

return bookmarkId;
```

#### In `convex/bookmarks.ts` - After metadata extraction

**In the `updateMetadataStatus` mutation (around line 320):**
```typescript
await ctx.db.patch(args.id, {
  metadataStatus: args.status,
  // ... other fields
});

// ADD THIS: Trigger embedding generation when metadata is complete
if (args.status === "completed") {
  await ctx.scheduler.runAfter(0, api.embeddings.generateEmbeddingForBookmark, {
    bookmarkId: args.id
  });
}
```

#### In `convex/transcripts.ts` - After transcription completion

**In the `updateStatus` mutation:**
```typescript
await ctx.db.patch(args.id, {
  status: args.status,
  updatedAt: Date.now(),
});

// ADD THIS: Trigger embedding generation when transcript is complete
if (args.status === "completed") {
  const transcript = await ctx.db.get(args.id);
  if (transcript) {
    await ctx.scheduler.runAfter(0, api.embeddings.generateEmbeddingForBookmark, {
      bookmarkId: transcript.bookmarkId
    });
  }
}
```

---

### 2.6 Create Batch Processing Endpoint (`convex/http.ts` - NEW FILE)

**Purpose:** Allow external cron jobs to process pending embeddings in batches.

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/process-embeddings",
  method: "POST",
  handler: httpAction(async (ctx) => {
    // Query bookmarks where:
    // - embeddingStatus = "pending" OR "failed"
    // - metadataStatus = "completed"

    const bookmarks = await ctx.runQuery(api.bookmarks.list, {});

    const pendingBookmarks = bookmarks.filter((b: any) =>
      (b.embeddingStatus === "pending" || b.embeddingStatus === "failed") &&
      b.metadataStatus === "completed" &&
      (!b.isVideo || (b.transcriptId && b.transcriptStatus === "completed"))
    );

    // Process up to 10 at a time
    const toProcess = pendingBookmarks.slice(0, 10);

    const results = await Promise.all(
      toProcess.map((bookmark: any) =>
        ctx.runAction(api.embeddings.generateEmbeddingForBookmark, {
          bookmarkId: bookmark._id
        })
      )
    );

    return new Response(JSON.stringify({
      processed: toProcess.length,
      total: pendingBookmarks.length,
      results
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }),
});

export default http;
```

**Usage:** Can be triggered by GitHub Actions, Vercel Cron, or any external scheduler:
```bash
curl -X POST https://your-convex-url.convex.site/process-embeddings
```

---

## Testing

### Manual Testing
1. Create a new bookmark
2. Check that `embeddingStatus` is "pending"
3. After metadata extraction completes, verify embedding generation starts
4. Check that `embeddingStatus` becomes "completed"
5. Verify the chatbot can find the bookmark

### Video Bookmark Testing
1. Create a video bookmark
2. Generate transcript
3. Verify embedding waits for transcript completion
4. Verify embedding includes transcript text

### Failed Embedding Testing
1. Temporarily break OpenAI API key
2. Create bookmark
3. Verify `embeddingStatus` becomes "failed"
4. Fix API key
5. Call batch processing endpoint
6. Verify failed embeddings are retried

---

## Success Criteria

- ✅ All new bookmarks automatically get embeddings within 30 seconds
- ✅ Embeddings include transcript text for videos
- ✅ Failed embeddings can be retried via batch endpoint
- ✅ Chatbot can find newly created bookmarks

---

## Files Modified

### New Files
- `convex/embeddings.ts` - Orchestration logic
- `convex/http.ts` - Batch processing endpoint

### Modified Files
- `convex/schema.ts` - Add `embeddingStatus` field
- `convex/bookmarks.ts` - Add triggers and updateEmbeddingStatus mutation
- `convex/ragBookmarks.ts` - Include transcripts in embeddings
- `convex/transcripts.ts` - Add trigger on completion, add get query

---

## Cost Impact

**Embedding generation:** ~$0.0001 per bookmark
- 1000 bookmarks = $0.10
- Negligible cost impact

---

## Next Steps

After this feature is complete:
1. Test with real bookmarks
2. Verify chatbot works with embedded bookmarks
3. Move to Feature 1 (Video Transcription) to enable transcript-enhanced embeddings
