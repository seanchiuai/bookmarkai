# Bookmark AI - Feature Documentation

## Overview
Bookmark AI is a comprehensive bookmark management system with AI-powered features including RAG (Retrieval-Augmented Generation) for semantic search, an intelligent chatbot assistant, and video transcription capabilities.

## Implemented Features

### 1. AI-Powered Features (NEW)

#### **RAG Semantic Search**
- **Vector Embeddings**: Uses OpenAI's text-embedding-3-small model to generate 1536-dimensional embeddings
- **Semantic Search**: Find bookmarks by meaning, not just keywords
- **Vector Database**: Convex vector index for fast similarity search
- **Context-Aware**: Searches across bookmark titles, descriptions, URLs, and video transcripts

#### **AI Chatbot Assistant**
- **Conversational Interface**: Chat with your bookmarks in natural language
- **Contextual Responses**: GPT-4o-mini provides intelligent answers based on your saved content
- **Bookmark References**: AI responses include numbered references to relevant bookmarks
- **Transcript Integration**: Searches through video transcripts for comprehensive answers
- **Floating Widget**: Minimizable chat interface that doesn't interfere with browsing

**Example Queries:**
- "What are my bookmarks about machine learning?"
- "Find videos about React hooks"
- "Show me articles I saved about TypeScript"
- "What did that YouTube video say about performance?"

### 2. Core Bookmark Management
- **Quick Save**: Paste any URL to automatically extract metadata (title, description, images, favicon)
- **Smart Detection**: Automatically identifies YouTube and Instagram Reel videos
- **Metadata Extraction**: Uses Open Graph and HTML meta tags to pull rich preview data
- **Card/Grid View**: Beautiful card-based display of bookmarks with preview images

### 3. Organization System

- **Collections**: Create folders to group related bookmarks
  - Custom icons and colors
  - Nested collections support
  - Drag and reorder
- **Tags**: Label bookmarks with multiple tags
  - Custom colors for each tag
  - Quick filtering by tag
- **AI-Enhanced Organization**: Embeddings enable semantic clustering and discovery

### 4. Filtering & Browsing
- Browse all bookmarks
- Filter by collection
- Filter by tag
- Sidebar navigation for easy access
- No search needed - organize visually

### 5. Video Transcription (Placeholder)
- Transcript generation for YouTube videos
- Transcript generation for Instagram Reels
- Time-stamped segments
- Clickable timestamps for playback
- Full transcript view
- **Note**: Currently returns placeholder data. Integrate with:
  - OpenAI Whisper API
  - YouTube Caption API
  - AssemblyAI
  - Or similar transcription services

## Database Schema

### Tables
- **bookmarks**: Core bookmark data with metadata
  - **embedding** (new): Vector embeddings for RAG semantic search (1536 dimensions)
  - Vector index on `embedding` field filtered by `userId`
- **collections**: Folder organization
- **tags**: Tag definitions
- **bookmarkTags**: Many-to-many relationship between bookmarks and tags
- **transcripts**: Video transcription data with time-stamped segments (searchable via RAG)

## File Structure

### Backend (Convex)

```text
convex/
├── schema.ts              # Database schema with vector index
├── bookmarks.ts           # Bookmark CRUD operations
├── ragBookmarks.ts        # RAG search & AI chat actions (NEW)
├── collections.ts         # Collection management
├── tags.ts                # Tag management
├── transcripts.ts         # Transcript management
└── todos.ts               # Legacy todos (kept for compatibility)
```

### Frontend Components

```text
components/
├── BookmarkDashboard.tsx   # Main dashboard with filtering
├── Chatbot.tsx             # AI chatbot assistant (NEW)
├── AddBookmarkForm.tsx     # URL input and metadata extraction
├── BookmarkCard.tsx        # Individual bookmark display
├── CollectionManager.tsx   # Collection CRUD interface
├── TagManager.tsx          # Tag CRUD interface
└── TranscriptViewer.tsx    # Video transcript viewer
```

### Services & Actions

```text
lib/
├── metadata-extractor.ts   # URL metadata extraction service
└── video-transcriber.ts    # Video transcription pipeline (placeholder)

app/actions/
├── metadata.ts             # Server action for metadata
└── transcription.ts        # Server action for transcription
```

### Pages

```text
app/
├── bookmarks/page.tsx      # Main bookmarks page
├── organize/page.tsx       # Collections & tags management
└── tasks/page.tsx          # Legacy tasks page (kept)
```

## API Integration Points

### Metadata Extraction

The metadata extractor (`lib/metadata-extractor.ts`) fetches and parses:
- Open Graph meta tags (`og:title`, `og:description`, `og:image`)
- Twitter Card meta tags
- Standard HTML meta tags
- Favicon URLs

### Video Transcription (To Be Implemented)

Current placeholder in `lib/video-transcriber.ts` needs integration with:

**For YouTube:**
1. Try YouTube Caption/Subtitle API first
2. If no captions, download audio using yt-dlp
3. Transcribe with Whisper/AssemblyAI
4. Generate timestamps

**For Instagram Reels:**
1. Extract video/audio using instagram-scraper or similar
2. Transcribe with Whisper/AssemblyAI
3. Generate timestamps

**Recommended Services:**
- OpenAI Whisper API (best accuracy)
- AssemblyAI (good accuracy, built for this)
- Google Cloud Speech-to-Text
- AWS Transcribe

## Usage

### Using the AI Chatbot

1. Navigate to `/bookmarks`
2. Click the chat widget in the bottom-right corner
3. Ask natural language questions about your bookmarks:
   - "What are my bookmarks about React?"
   - "Find the video about TypeScript generics"
   - "Show me articles about database design"
4. The AI will:
   - Search your bookmarks semantically
   - Provide intelligent answers with context
   - Reference specific bookmarks with [1], [2] numbers
   - Include video transcripts in responses

### Adding a Bookmark

1. Navigate to `/bookmarks`
2. Paste a URL in the input field
3. Optionally select collection and tags (click "Show advanced options")
4. Click "Save"
5. Metadata is automatically extracted and displayed
6. **NEW**: Embeddings are automatically generated for semantic search

### Organizing with Collections

1. Navigate to `/organize`
2. Create collections with custom names, icons, and colors
3. Assign bookmarks to collections from the add form
4. Filter by collection in the sidebar

### Managing Tags

1. Navigate to `/organize`
2. Create tags with custom names and colors
3. Add multiple tags to bookmarks
4. Filter bookmarks by tag

### Video Transcription

1. Add a YouTube or Instagram Reel URL
2. Open the bookmark
3. Click "Generate Transcript"
4. View time-stamped segments
5. Click timestamps to seek in video (requires player integration)

## AI Features Technical Details

### RAG Implementation

**Embedding Generation:**
- Model: `text-embedding-3-small` (1536 dimensions)
- Content: Combines title + description + URL
- Triggers: Automatic on bookmark creation/update
- Storage: Vector field in bookmarks table

**Vector Search:**
- Index: `by_embedding` on bookmarks table
- Filter: User-scoped (only searches your bookmarks)
- Limit: Top 5-10 most relevant results
- Similarity: Cosine similarity (built into Convex)

**Chat Completion:**
- Model: `gpt-4o-mini` (cost-effective, fast)
- Context: Top 5 relevant bookmarks with transcripts
- Max Tokens: 500 per response
- Temperature: 0.7 (balanced creativity)

### API Costs (Approximate)

- Embedding generation: ~$0.0001 per bookmark
- Vector search: Free (Convex built-in)
- Chat completion: ~$0.001-0.003 per query
- Typical user: <$1/month for moderate usage

## Future Enhancements

### Priority

1. **Real Video Transcription**: Integrate with Whisper API or AssemblyAI
2. **Automatic Embedding Updates**: Background job to re-embed when content changes
3. **Browser Extension**: Quick-save clipper with instant embedding
4. **Advanced RAG**: Multi-query retrieval, re-ranking, hybrid search
5. **Chat History**: Persist conversations for context

### Nice to Have

- **AI-Powered Auto-Tagging**: Automatically suggest tags based on content
- **Smart Collections**: AI-generated collection suggestions
- **Bookmark Summarization**: Generate TL;DR for long articles
- **Semantic Duplicates**: Find similar bookmarks using embeddings
- Bookmark import/export with embeddings
- Sharing collections with RAG enabled
- Collaborative bookmarks
- Archive.org integration for dead links
- Bulk operations

## Technical Notes

### Performance

- All queries are scoped to the authenticated user
- Indexes on userId, collectionId, and tagId for fast filtering
- Lazy loading for large bookmark collections

### Security

- Row-level security via Clerk authentication
- All mutations verify user ownership
- Server-side metadata fetching prevents XSS

### Scalability

- Convex handles real-time updates automatically
- Metadata extraction can be moved to background jobs
- Transcription should be queued for large videos

## Development

### Environment Variables Needed

```bash
# Frontend (.env.local)
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Backend (Convex Dashboard - Settings → Environment Variables)
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
OPENAI_API_KEY=sk-...  # REQUIRED for RAG & AI features
```

**Important**: The `OPENAI_API_KEY` must be added in the Convex dashboard, not in `.env.local`, as it's used by server-side actions.

### Running Locally

```bash
npm install
npm run dev
```

This starts both Next.js frontend and Convex backend.

## Support

For issues or questions, refer to:
- [Convex Documentation](https://docs.convex.dev)
- [Clerk Documentation](https://clerk.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
