# Feature 4: Advanced RAG Management UI

## Priority: MEDIUM
Provides visibility and control over embeddings, search, and debugging.

## Overview
Create comprehensive UI for managing embeddings, testing search, and debugging RAG functionality.

## Components to Build

### 4.1 Embeddings Management Page (`app/embeddings/page.tsx` - NEW)

**Purpose:** Central dashboard for viewing and managing all bookmark embeddings.

**Features:**
- Table view of all bookmarks
- Status indicators (pending, processing, completed, failed)
- Bulk actions
- Statistics dashboard

**Implementation:**

```typescript
"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export default function EmbeddingsPage() {
  const bookmarks = useQuery(api.bookmarks.list, {}) as any[];
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const generateEmbedding = useAction(api.embeddings.generateEmbeddingForBookmark);

  const stats = {
    total: bookmarks?.length || 0,
    completed: bookmarks?.filter(b => b.embeddingStatus === "completed").length || 0,
    pending: bookmarks?.filter(b => b.embeddingStatus === "pending").length || 0,
    failed: bookmarks?.filter(b => b.embeddingStatus === "failed").length || 0,
    processing: bookmarks?.filter(b => b.embeddingStatus === "processing").length || 0,
  };

  const handleRegenerateSelected = async () => {
    for (const id of selectedIds) {
      await generateEmbedding({ bookmarkId: id as any });
    }
    setSelectedIds([]);
  };

  const handleRegenerateFailed = async () => {
    const failedIds = bookmarks
      ?.filter(b => b.embeddingStatus === "failed")
      .map(b => b._id);

    for (const id of failedIds) {
      await generateEmbedding({ bookmarkId: id });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Embeddings Management</h1>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} color="blue" />
        <StatCard label="Completed" value={stats.completed} color="green" />
        <StatCard label="Pending" value={stats.pending} color="yellow" />
        <StatCard label="Processing" value={stats.processing} color="purple" />
        <StatCard label="Failed" value={stats.failed} color="red" />
      </div>

      {/* Bulk Actions */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleRegenerateSelected}
          disabled={selectedIds.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          Regenerate Selected ({selectedIds.length})
        </button>
        <button
          onClick={handleRegenerateFailed}
          disabled={stats.failed === 0}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
        >
          Regenerate All Failed ({stats.failed})
        </button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(bookmarks?.map(b => b._id) || []);
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
              </th>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Metadata</th>
              <th className="p-3 text-left">Embedding</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookmarks?.map((bookmark) => (
              <BookmarkRow
                key={bookmark._id}
                bookmark={bookmark}
                isSelected={selectedIds.includes(bookmark._id)}
                onSelect={(selected) => {
                  if (selected) {
                    setSelectedIds([...selectedIds, bookmark._id]);
                  } else {
                    setSelectedIds(selectedIds.filter(id => id !== bookmark._id));
                  }
                }}
                onRegenerate={() => generateEmbedding({ bookmarkId: bookmark._id })}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: any) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className={`p-4 border rounded-lg ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm">{label}</div>
    </div>
  );
}

function BookmarkRow({ bookmark, isSelected, onSelect, onRegenerate }: any) {
  return (
    <tr className="border-t hover:bg-muted/50">
      <td className="p-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
        />
      </td>
      <td className="p-3">
        <div className="font-medium truncate max-w-xs">{bookmark.title || "Untitled"}</div>
        <div className="text-sm text-muted-foreground truncate max-w-xs">{bookmark.url}</div>
      </td>
      <td className="p-3">
        <span className="px-2 py-1 text-xs rounded bg-muted">
          {bookmark.isVideo ? "Video" : "Page"}
        </span>
      </td>
      <td className="p-3">
        <StatusBadge status={bookmark.metadataStatus} />
      </td>
      <td className="p-3">
        <StatusBadge status={bookmark.embeddingStatus} />
      </td>
      <td className="p-3">
        <button
          onClick={onRegenerate}
          className="text-sm text-blue-600 hover:underline"
        >
          Regenerate
        </button>
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    completed: "bg-green-100 text-green-800",
    pending: "bg-gray-100 text-gray-800",
    processing: "bg-blue-100 text-blue-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <span className={`px-2 py-1 text-xs rounded ${colors[status] || colors.pending}`}>
      {status}
    </span>
  );
}
```

---

### 4.2 Search Testing Interface (`app/search/page.tsx` - NEW)

**Purpose:** Test RAG search and compare with chatbot results.

```typescript
"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function SearchTestPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any>(null);
  const [chatResponse, setChatResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const searchBookmarks = useAction(api.ragBookmarks.searchBookmarks);
  const chatWithBookmarks = useAction(api.ragBookmarks.chatWithBookmarks);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Get raw search results
      const search = await searchBookmarks({ query, maxResults: 10 });
      setSearchResults(search);

      // Get AI chat response
      const chat = await chatWithBookmarks({ message: query });
      setChatResponse(chat);
    } catch (error) {
      console.error('Search failed:', error);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Search Testing Interface</h1>

      {/* Search Input */}
      <div className="flex gap-4 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Enter search query..."
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Raw Search Results */}
        <div>
          <h2 className="text-xl font-semibold mb-4">RAG Search Results</h2>
          <div className="space-y-4">
            {searchResults?.map((result: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="font-medium">{result.bookmark.title}</div>
                <div className="text-sm text-muted-foreground">{result.bookmark.url}</div>
                {result.transcript && (
                  <div className="mt-2 text-sm text-blue-600">
                    Has transcript ({result.transcript.fullText.length} chars)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Chat Response */}
        <div>
          <h2 className="text-xl font-semibold mb-4">AI Chat Response</h2>
          <div className="border rounded-lg p-4">
            <div className="whitespace-pre-wrap">{chatResponse?.response}</div>
            {chatResponse?.bookmarks && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium mb-2">Referenced Bookmarks:</div>
                {chatResponse.bookmarks.map((b: any, i: number) => (
                  <div key={i} className="text-sm text-muted-foreground">
                    [{i + 1}] {b.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 4.3 Update BookmarkCard with Status Indicators

Add status badges to `components/BookmarkCard.tsx`:

```typescript
// Add to imports
import { Tooltip } from "@/components/ui/tooltip";

// Add status indicator component
function StatusDot({ status, label }: { status: string; label: string }) {
  const colors = {
    completed: "bg-green-500",
    pending: "bg-gray-400",
    processing: "bg-blue-500 animate-pulse",
    failed: "bg-red-500",
  };

  return (
    <Tooltip content={`${label}: ${status}`}>
      <div className={`w-2 h-2 rounded-full ${colors[status] || colors.pending}`} />
    </Tooltip>
  );
}

// Add to BookmarkCard component (in the header area)
<div className="flex gap-1">
  <StatusDot status={bookmark.metadataStatus} label="Metadata" />
  <StatusDot status={bookmark.embeddingStatus} label="Embedding" />
  {bookmark.isVideo && bookmark.transcriptId && (
    <StatusDot status={transcriptStatus} label="Transcript" />
  )}
</div>
```

---

### 4.4 Add Embedding Status Filter to Dashboard

Update `components/BookmarkDashboard.tsx`:

```typescript
// Add filter state
const [embeddingFilter, setEmbeddingFilter] = useState<string>("all");

// Filter bookmarks
const filteredBookmarks = bookmarks?.filter(b => {
  if (embeddingFilter === "all") return true;
  return b.embeddingStatus === embeddingFilter;
});

// Add filter chips in UI
<div className="flex gap-2 mb-4">
  <FilterChip
    label="All"
    active={embeddingFilter === "all"}
    onClick={() => setEmbeddingFilter("all")}
  />
  <FilterChip
    label="Completed"
    active={embeddingFilter === "completed"}
    onClick={() => setEmbeddingFilter("completed")}
    count={bookmarks?.filter(b => b.embeddingStatus === "completed").length}
  />
  <FilterChip
    label="Pending"
    active={embeddingFilter === "pending"}
    onClick={() => setEmbeddingFilter("pending")}
    count={bookmarks?.filter(b => b.embeddingStatus === "pending").length}
  />
  <FilterChip
    label="Failed"
    active={embeddingFilter === "failed"}
    onClick={() => setEmbeddingFilter("failed")}
    count={bookmarks?.filter(b => b.embeddingStatus === "failed").length}
  />
</div>
```

---

## Navigation Updates

Add new routes to navigation (`components/app-sidebar.tsx` or similar):

```typescript
const routes = [
  { name: "Bookmarks", path: "/bookmarks", icon: BookmarkIcon },
  { name: "Organize", path: "/organize", icon: FolderIcon },
  { name: "Embeddings", path: "/embeddings", icon: DatabaseIcon },
  { name: "Search Test", path: "/search", icon: SearchIcon },
];
```

---

## Testing

1. **Embeddings Management Page**
   - View all bookmarks with status
   - Select and regenerate specific bookmarks
   - Regenerate all failed embeddings
   - Verify statistics update in real-time

2. **Search Testing Interface**
   - Enter various queries
   - Compare raw results with AI responses
   - Verify relevant bookmarks are found
   - Check that transcript content is searchable

3. **Status Indicators**
   - Verify status dots appear on bookmark cards
   - Check tooltips show correct information
   - Verify processing status animates

---

## Success Criteria

- ✅ Management UI shows real-time status for all bookmarks
- ✅ Search testing interface validates RAG functionality
- ✅ Status indicators provide at-a-glance information
- ✅ Bulk operations work smoothly for 100+ bookmarks
- ✅ Users can debug embedding issues easily

---

## Files Created

### New Pages
- `app/embeddings/page.tsx` - Embeddings management dashboard
- `app/search/page.tsx` - Search testing interface

### Modified Files
- `components/BookmarkCard.tsx` - Add status indicators
- `components/BookmarkDashboard.tsx` - Add embedding filter
- `components/app-sidebar.tsx` - Add navigation links

---

## Future Enhancements

After basic UI is complete, consider adding:

1. **Debug Page** (`app/debug/page.tsx`)
   - API logs viewer
   - Cost tracking
   - Embedding inspector
   - Metadata extraction preview

2. **Bookmark Details Panel**
   - Expandable detail view
   - API error logs
   - Manual trigger buttons

3. **Analytics Dashboard**
   - Search query analytics
   - Popular bookmarks
   - Embedding generation trends

---

## Next Steps

After this feature is complete:
1. Gather user feedback on UI
2. Add more debugging tools based on needs
3. Move to Feature 5 (Video Player Integration)
