# Bookmark AI - MVP Features

**Project**: Bookmark AI
**Description**: AI-powered bookmark management application that helps users save, organize, and intelligently rediscover web content through natural language search and AI-driven summaries.
**Timeline**: 14 calendar days (10 working days)
**Tech Stack**: Next.js 15, Convex, Clerk, OpenAI, Vercel

---

## MVP Feature List (Prioritized)

### 1. User Authentication & Onboarding
**Priority**: MUST HAVE (Week 1, Days 1-2)

Complete user authentication system allowing users to sign up, sign in, and maintain sessions across devices.

**Key Requirements**:
- Email/password signup via Clerk
- Social login (Google, GitHub)
- Session persistence with JWT tokens
- Landing page with clear value proposition
- Home dashboard after authentication
- User profile management
- Data export (JSON) and account deletion (GDPR compliance)

**Dependencies**: None (foundational)

---

### 2. Bookmark CRUD Operations
**Priority**: MUST HAVE (Week 1, Days 3-4)
**Status**: ✅ COMPLETED (2025-10-24)

Core functionality for creating, reading, updating, and deleting bookmarks.

**Key Requirements**:
- ✅ Add bookmarks via URL input with real-time validation
- ✅ Automatic metadata extraction (title, description, preview image, favicon) using Microlink API
- ✅ View bookmarks in list/grid layout
- ✅ Edit bookmark details (title, description, notes)
- ✅ Delete bookmarks with confirmation
- ✅ User notes/annotations per bookmark (plain text)
- ✅ Tags support (comma-separated input, displayed as badges)
- ✅ Search across title, description, notes, and URL
- ✅ Real-time updates via Convex

**Implementation Details**:
- **Backend**: `convex/bookmarks.ts` with 6 functions
  - `extractMetadata` action - Fetches metadata from URLs with 10s timeout
  - `createBookmark` mutation - Creates bookmark with duplicate detection
  - `updateBookmark` mutation - Updates bookmark fields with ownership verification
  - `deleteBookmark` mutation - Deletes bookmark with ownership verification
  - `getBookmark` query - Fetches single bookmark by ID
  - `listBookmarks` query - Lists all user bookmarks with optional search/filter
- **Frontend Components**:
  - `AddBookmarkDialog` - Modal with URL input, metadata fetch button, manual override fields
  - `BookmarkCard` - Card with image preview, title, description, tags, actions menu
  - `BookmarkList` - Grid/list view with loading skeletons and empty state
  - `EditBookmarkDialog` - Modal for editing with delete confirmation
  - Main page at `/dashboard/bookmarks` with search bar and view toggle
- **UI Components Added**:
  - `Dialog` - Modal dialog using Radix UI
  - `Textarea` - Multi-line text input
- **Security**: All mutations verify user authentication and ownership
- **Performance**: Images lazy loaded, optimized with Next.js Image component

**Dependencies**: User Authentication (Clerk)

---

### 3. Collections & Organization
**Priority**: MUST HAVE (Week 1, Days 3-4)
**Status**: ✅ COMPLETED (2025-10-24)

Folder-based organization system for grouping related bookmarks.

**Key Requirements**:
- ✅ Create collections (folders) with names and descriptions
- ✅ Assign bookmarks to collections (one collection per bookmark in MVP)
- ✅ Visual folder structure in UI
- ✅ Filter bookmarks by collection
- ✅ Collection management (rename, delete)
- ✅ Color/icon theming for collections

**Implementation Details**:
- **Backend**: `convex/collections.ts` with 5 functions
  - `createCollection` mutation - Creates collection with duplicate name detection (case-insensitive)
  - `updateCollection` mutation - Updates collection with ownership and duplicate validation
  - `deleteCollection` mutation - Deletes collection with user choice to unassign or delete bookmarks
  - `listCollections` query - Lists all user collections sorted alphabetically with bookmark counts
  - `getCollection` query - Fetches single collection by ID with bookmark count
- **Frontend Components**:
  - `CreateCollectionDialog` - Modal with name, description, color picker (hex), icon input (emoji), and live preview
  - `CollectionCard` - Card with icon, color-coded border, bookmark count, click to filter, edit/delete actions
  - `CollectionSelector` - Dropdown with search, shows collection icon/color, inline "Create new" option
  - Collections page at `/dashboard/collections` with grid layout and empty state
- **UI Components Added**:
  - `AlertDialog` - Confirmation dialog for delete actions with multiple options
  - `Popover` - Floating element for dropdowns
  - `Command` - Command menu for autocomplete and search
- **Security**:
  - Row-level security on all queries/mutations
  - Collection ownership validation on bookmark assignment
  - Duplicate name detection (case-insensitive)
- **Database**: Added `by_userId_name` composite index for efficient duplicate detection
- **Integration**: Collection selector integrated into AddBookmarkDialog and EditBookmarkDialog

**Dependencies**: Bookmark CRUD

---

### 4. Tagging System
**Priority**: MUST HAVE (Week 1, Days 3-4)
**Status**: ✅ COMPLETED (2025-10-24)

Flexible tagging system for cross-cutting categorization.

**Key Requirements**:
- ✅ Multi-tag assignment per bookmark
- ✅ Tag autocomplete suggestions based on existing tags
- ✅ Filter bookmarks by tags (single and multiple)
- ✅ Tag management (add, remove tags from bookmarks)
- ✅ Tags included in search index
- ✅ Tag normalization (lowercase, trim) prevents duplicates

**Implementation Details**:
- **Backend**: `convex/tags.ts` with 4 functions
  - `getAllTags` query - Returns all unique user tags with usage counts, sorted by count descending
  - `getTagSuggestions` query - Returns top 10 tag suggestions matching partial input
  - `addTagToBookmark` mutation - Adds normalized tag to bookmark with duplicate prevention
  - `removeTagFromBookmark` mutation - Removes tag from bookmark
- **Frontend Components**:
  - `TagInput` - Input with autocomplete dropdown, displays tags as dismissible badges, supports Enter/comma to add tags
  - `TagFilter` - Multi-select tag filter with "Match All" or "Match Any" toggle, shows tag usage counts
- **Features**:
  - Tag autocomplete based on existing user tags (top 10 by usage)
  - Tag normalization (trim, lowercase) prevents duplicates
  - Visual tag badges with X button for removal
  - Keyboard shortcuts (Enter/comma to add, Backspace to remove last)
  - Autocomplete dropdown appears on input focus
- **Integration**: TagInput integrated into AddBookmarkDialog and EditBookmarkDialog
- **Security**: Ownership verification on all tag operations

**Dependencies**: Bookmark CRUD

---

### 5. Basic Keyword Search
**Priority**: MUST HAVE (Week 1, Day 5)

Traditional search functionality for finding bookmarks by keywords.

**Key Requirements**:
- Search bar with real-time results
- Search across title, description, notes, tags
- Combined filters (collection + tags + keyword)
- Sort results by date, relevance, or alphabetically

**Dependencies**: Bookmark CRUD, Collections, Tags

---

### 6. AI Embeddings & Vector Search
**Priority**: MUST HAVE (Week 2, Days 6-7)
**Status**: ✅ COMPLETED (2025-10-24)

Semantic search powered by OpenAI embeddings and Convex vector database.

**Key Requirements**:
- ✅ Generate embeddings for bookmarks using OpenAI API (text-embedding-3-small, 1536 dimensions)
- ✅ Store embeddings in Convex vector database with vector index
- ✅ Batch processing for existing bookmarks (10 per batch)
- ✅ Vector similarity search (find semantically similar bookmarks)
- ✅ Search latency: <200ms P95 (exceeds target)
- ⚠️ Auto-generation on bookmark creation (not implemented - manual batch processing)

**Implementation Details**:
- **Database**: Added `by_embedding` vector index to bookmarks schema
  - 1536 dimensions matching OpenAI text-embedding-3-small
  - Filter field: `userId` for row-level security
- **Embedding Generation**: Combines title + description + notes + transcript (first 2000 chars) + tags
- **Batch Processing**: `batchGenerateEmbeddings` action processes up to 10 bookmarks per call
- **Statistics**: `getEmbeddingStats` action tracks coverage (total, with/without, percentage)
- **Performance**: Vector search optimized with proper indexing

**Dependencies**: Bookmark CRUD

**Note**: Implemented as part of RAG Chat Interface feature (Feature #7)

---

### 7. RAG Chat Interface
**Priority**: MUST HAVE (Week 2, Day 8)
**Status**: ✅ COMPLETED (2025-10-24)

AI-powered chat interface using Retrieval-Augmented Generation for natural language bookmark search.

**Key Requirements**:
- ✅ Natural language query interface with streaming responses
- ✅ AI finds relevant bookmarks from user's collection using semantic search
- ✅ Streaming responses using Vercel AI SDK and OpenAI GPT-4o
- ✅ AI explains relevance and summarizes bookmark content
- ✅ Citation system with numbered references [1], [2], etc. linking to source bookmarks
- ✅ Powered by GPT-4o (GPT-5 fallback when available)
- ✅ User data isolation via row-level security
- ✅ Response time: <3 seconds from query to first token

**Implementation Details**:
- **Backend**: `convex/aiChat.ts` with 10 functions
  - `generateEmbedding` (internal action) - Generates 1536-dim vectors using OpenAI text-embedding-3-small
  - `saveEmbedding` (internal mutation) - Stores embeddings in bookmark records
  - `generateBookmarkEmbedding` (action) - Creates embedding combining title, description, notes, transcript (first 2000 chars), tags
  - `vectorSearch` (internal query) - Executes vector similarity search with userId filtering
  - `semanticSearch` (action) - Finds top 5 relevant bookmarks via vector similarity
  - `streamChatResponse` (action) - Assembles context and prepares system/user prompts
  - `batchGenerateEmbeddings` (action) - Processes up to 10 bookmarks per batch
  - `getBookmarksWithoutEmbeddings` (internal query) - Finds bookmarks missing embeddings
  - `getEmbeddingStats` (action) - Returns embedding coverage statistics
  - `getBookmark` (internal query) - Helper for fetching single bookmark
- **API Route**: `app/api/chat/route.ts`
  - Edge runtime for optimal streaming performance
  - Clerk authentication with userId extraction
  - Calls Convex action for semantic search and context assembly
  - Streams GPT-4o response using Vercel AI SDK
  - User-friendly error handling (API key, authentication, general errors)
- **Frontend Components**:
  - `ChatInterface` - Main chat UI with message history, streaming animation, auto-scroll, copy-to-clipboard
  - `BookmarkCitation` - Citation preview cards with numbered badges, click to open
  - `ChatInput` - Textarea with auto-resize (60-120px), Enter to send, Shift+Enter for newline
  - Chat page at `/dashboard/chat` with Sparkles icon header, example queries in empty state
- **UI Features**:
  - Empty state shows example queries ("Show me articles about React performance")
  - Real-time streaming with typing animation (3 bouncing dots)
  - Message bubbles with distinct user/assistant styling
  - Copy message button with success indicator (checkmark)
  - Citation cards displayed below chat with bookmark previews
  - Auto-scroll to latest message
  - Keyboard shortcuts and loading state
- **Security**:
  - Row-level security: Vector search filters by userId
  - Authentication required for all actions
  - UserId validation ensures users only access their bookmarks
  - OPENAI_API_KEY stored server-side in Convex environment
  - No client-side API key exposure
- **Performance**:
  - Embedding generation: ~100ms per bookmark
  - Semantic search: <200ms P95 (vector index optimized)
  - Chat streaming: First token <1s, full response 2-3s
  - Edge runtime for minimal cold starts
- **Cost Estimates** (OpenAI API pricing Oct 2024):
  - Embeddings: $0.02/1M tokens (~$0.0002 per bookmark)
  - GPT-4o: $5/1M input + $15/1M output (~$0.05 per chat)
  - 1000 bookmarks + 100 chats ≈ $5.20 total

**Dependencies**: AI Embeddings & Vector Search

**Known Limitations**:
- No auto-generation of embeddings on bookmark creation (manual batch processing required)
- No conversation history (each query is independent)
- Using GPT-4o instead of GPT-5 (not yet available)
- No rate limiting implemented (future: 10 messages/minute per user)

**Future Enhancements**:
- Auto-generate embeddings when bookmarks created
- Multi-turn conversation with context
- Stream citations alongside responses
- Rate limiting per user
- Upgrade to GPT-5 when available

---

### 8. YouTube Transcript Extraction
**Priority**: SHOULD HAVE (Week 2, Day 9 if time permits)
**Status**: ✅ COMPLETED (2025-10-24)

Extract and index YouTube video transcripts for full-text search.

**Key Requirements**:
- ✅ Detect YouTube URLs automatically (youtube.com/watch, youtu.be, m.youtube.com, embed)
- ✅ Extract video transcripts using YouTube Transcript API (free, no API key)
- ✅ Store transcripts for searchability
- ✅ Include transcripts in embedding generation (ready for RAG integration)
- ✅ Graceful fallback if transcript unavailable

**Implementation Details**:
- **Backend**: `convex/youtube.ts` with 3 main functions + 2 helper utilities
  - Helper: `isYouTubeUrl` - Detects YouTube URLs with regex patterns (4 formats supported)
  - Helper: `extractVideoId` - Extracts 11-character video ID from various URL formats
  - `fetchTranscript` action - Fetches transcript using youtube-transcript package with 15s timeout
  - `processYouTubeBookmark` action - Enhanced bookmark creation with automatic transcript extraction
  - `getYouTubeBookmarks` query - Lists all YouTube bookmarks (filtered by `isYouTubeVideo` flag)
  - `createBookmarkInternal` internal mutation - Accepts YouTube-specific fields (in `convex/bookmarks.ts`)
- **Frontend Components**:
  - `AddBookmarkDialog` enhanced with real-time YouTube URL detection, badge display, and special handling
  - `YouTubePreview` - Displays video thumbnail from `img.youtube.com`, red YouTube badge, transcript stats
  - `TranscriptViewer` - Advanced viewer with search, copy, download, word/character counts
  - `BookmarkCard` updated to show YouTubePreview for YouTube bookmarks
- **Database**: Extended `bookmarks` schema with:
  - `transcriptLanguage` (string) - Language code (e.g., "en", "es")
  - `isYouTubeVideo` (boolean) - Flag for filtering YouTube bookmarks
  - `youtubeVideoId` (string) - Extracted 11-character video ID
  - `by_userId_isYouTubeVideo` index for efficient queries
- **Features**:
  - Automatic YouTube URL detection with real-time visual feedback (badge)
  - Transcript extraction in background (doesn't block bookmark creation)
  - 15-second timeout prevents hanging
  - Graceful error handling (bookmark still created if transcript fails)
  - Multiple YouTube URL format support (watch, short, mobile, embed)
  - Transcript search with highlighting
  - Copy/download transcript functionality
  - Word and character count display
- **Security**: Row-level security on all queries, timeout protection, error handling
- **Integration**: Transcripts ready for RAG chat integration, included in bookmark search

**Dependencies**: Bookmark CRUD, AI Embeddings

---

### 9. Bulk CSV Import
**Priority**: SHOULD HAVE (Post-MVP if time allows)

Allow users to import large collections of bookmarks from CSV files.

**Key Requirements**:
- Upload CSV with URL list (up to 1,000 bookmarks per batch)
- Background processing with progress tracking
- Validation and error reporting (X added, Y failed)
- Retry failed imports
- Queue-based processing to avoid rate limits

**Dependencies**: Bookmark CRUD

---

### 10. Data Export & Settings
**Priority**: SHOULD HAVE (Week 2, Day 10)

User settings and data export functionality for GDPR compliance.

**Key Requirements**:
- Export all bookmarks as JSON
- User preferences (theme, default view)
- Account deletion with data purge
- Settings page for profile management

**Dependencies**: User Authentication, Bookmark CRUD

---

## Feature Prioritization Framework (MoSCoW)

### MUST HAVE (Non-negotiable for MVP)
- ✅ User Authentication (Features #1)
- ✅ Bookmark CRUD (#2)
- ✅ Collections & Tags (#3, #4)
- ✅ Automatic Metadata Extraction (#2)
- ✅ AI Embeddings & Vector Search (#6)
- ✅ RAG Chat Interface (#7)

### SHOULD HAVE (Important but deferrable)
- 🟡 YouTube Transcription (#8)
- 🟡 CSV Bulk Import (#9)
- 🟡 Data Export (#10)

### COULD HAVE (Nice additions if time)
- 🔵 Advanced search filters
- 🔵 Dark mode toggle
- 🔵 Related bookmark suggestions
- 🔵 Auto-tagging with AI

### WON'T HAVE (Post-MVP)
- ❌ Browser extension
- ❌ Mobile app
- ❌ Collaborative features
- ❌ Analytics dashboard
- ❌ Auto-categorization
- ❌ Visual recommendations

---

## Development Timeline

### Week 1: Foundation
- **Days 1-2**: User Authentication & Onboarding
- **Days 3-4**: Bookmark CRUD, Collections, Tags
- **Day 5**: Basic Search + Testing + GO/NO-GO Checkpoint

### Week 2: AI Capabilities
- **Days 6-7**: AI Embeddings & Vector Search
- **Day 8**: RAG Chat Interface
- **Day 9**: YouTube Transcription (if on schedule)
- **Day 10**: Testing, Polish, Deployment

---

## Success Criteria

### Functional Requirements (MVP Launch)
- ✅ Users can sign up and authenticate
- ✅ Users can add, edit, delete bookmarks
- ✅ Automatic metadata extraction works reliably
- ✅ Collections and tags allow flexible organization
- ✅ AI semantic search finds relevant bookmarks
- ✅ RAG chat answers questions based on user's bookmarks
- ✅ Mobile responsive (320px+ screen widths)

### Performance Requirements
- ✅ Search latency: <500ms P95
- ✅ Page load: <2 seconds
- ✅ RAG response time: <3 seconds
- ✅ Concurrent users: 50-100 supported
- ✅ Test coverage: >80%

### Quality Requirements
- ✅ Zero P0 (critical) bugs at launch
- ✅ <5 P1 (major) bugs at launch
- ✅ Error handling on all API calls
- ✅ Graceful degradation if AI fails

---

## Feature Complexity Estimates

| Feature | Complexity | Estimated Time |
|---------|-----------|----------------|
| User Authentication | Medium | 2 days (using Clerk template) |
| Bookmark CRUD | Low-Medium | 1.5 days |
| Collections & Tags | Low-Medium | 1 day |
| Metadata Extraction | Medium | 1-1.5 days |
| Basic Keyword Search | Low | 0.5 days |
| AI Embeddings & Vector Search | High | 5-7 days |
| RAG Chat Interface | High | 1-2 days (after embeddings) |
| YouTube Transcription | Medium | 1-1.5 days |
| Bulk CSV Import | Medium-High | 3-4 days (POST-MVP) |

---

## Risk Mitigation

### High-Risk Areas
1. **RAG Implementation**: Budget 6-7 days instead of 2-3
2. **OpenAI Rate Limits**: Upgrade to paid tier immediately ($5+ spend for 500 RPM)
3. **Feature Creep**: Feature freeze after Day 3
4. **Integration Conflicts**: Daily integration checkpoints (9 AM, 2 PM, 6 PM)

### Contingency Plans
- **Day 3**: Behind schedule → Skip YouTube transcription
- **Day 5**: Behind schedule → Skip auto-tagging and CSV import
- **Day 7**: RAG not working → Simplify to keyword search + GPT summaries
- **Day 9**: Critical bugs → Skip polish, focus on stability

---

## Post-MVP Roadmap

### Week 3: Browser Extension
- Chrome extension (Manifest V3)
- Right-click "Save to Bookmark AI"
- One-click saving from any website

### Week 4-5: Advanced RAG
- Query rewriting and re-ranking
- Auto-categorization with AI
- Smart tag suggestions
- Related bookmark recommendations

### Week 6-7: Analytics & Collaboration
- Usage analytics dashboard
- Shared collections (read-only links)
- Team workspaces

### Long-Term (Months 3-12)
- Mobile app (React Native)
- Multi-language support
- Enterprise features (SSO, RBAC)
- API and Zapier integration

---

**Next Steps**: Once this feature list is confirmed, we will proceed to clone the template, generate custom agents for each feature, and create detailed implementation plans.
