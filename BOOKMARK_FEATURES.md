# Bookmark AI - Feature Documentation

## Overview
Bookmark AI is a comprehensive bookmark management system with AI-powered features for organizing and transcribing video content.

## Implemented Features

### 1. Core Bookmark Management
- **Quick Save**: Paste any URL to automatically extract metadata (title, description, images, favicon)
- **Smart Detection**: Automatically identifies YouTube and Instagram Reel videos
- **Metadata Extraction**: Uses Open Graph and HTML meta tags to pull rich preview data
- **Card/Grid View**: Beautiful card-based display of bookmarks with preview images

### 2. Organization System

- **Collections**: Create folders to group related bookmarks
  - Custom icons and colors
  - Nested collections support
  - Drag and reorder
- **Tags**: Label bookmarks with multiple tags
  - Custom colors for each tag
  - Quick filtering by tag

### 3. Filtering & Browsing
- Browse all bookmarks
- Filter by collection
- Filter by tag
- Sidebar navigation for easy access
- No search needed - organize visually

### 4. Video Transcription (Placeholder)
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
- **collections**: Folder organization
- **tags**: Tag definitions
- **bookmarkTags**: Many-to-many relationship between bookmarks and tags
- **transcripts**: Video transcription data with time-stamped segments

## File Structure

### Backend (Convex)

```text
convex/
├── schema.ts              # Database schema
├── bookmarks.ts           # Bookmark CRUD operations
├── collections.ts         # Collection management
├── tags.ts                # Tag management
├── transcripts.ts         # Transcript management
└── todos.ts               # Legacy todos (kept for compatibility)
```

### Frontend Components

```text
components/
├── BookmarkDashboard.tsx   # Main dashboard with filtering
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

### Adding a Bookmark

1. Navigate to `/bookmarks`
2. Paste a URL in the input field
3. Optionally select collection and tags (click "Show advanced options")
4. Click "Save"
5. Metadata is automatically extracted and displayed

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

## Future Enhancements

### Priority

1. **Real Video Transcription**: Integrate with Whisper API or AssemblyAI
2. **Browser Extension**: Quick-save clipper for browsers
3. **Preview Snapshots**: Capture visual previews of web pages
4. **Video Player Integration**: Embed YouTube/Instagram players with sync

### Nice to Have

- Bookmark import/export
- Sharing collections
- Collaborative bookmarks
- Full-text search across bookmarks and transcripts
- Archive.org integration for dead links
- Automatic tagging with AI
- Duplicate detection
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

# Backend (Convex Dashboard)
CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
```

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
