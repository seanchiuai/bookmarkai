# Application Flow Document

**Bookmark AI** - User journey maps and navigation flows

**Version**: 1.0
**Last Updated**: October 24, 2025
**Status**: Ready for Development

---

## Table of Contents

1. [Overview](#overview)
2. [First-Time User Onboarding](#first-time-user-onboarding)
3. [Adding a Bookmark Workflow](#adding-a-bookmark-workflow)
4. [Using AI Chat to Search Bookmarks](#using-ai-chat-to-search-bookmarks)
5. [Creating Collections and Organizing with Tags](#creating-collections-and-organizing-with-tags)
6. [Error States and Edge Cases](#error-states-and-edge-cases)
7. [State Transitions](#state-transitions)

---

## Overview

This document describes the complete user journey through Bookmark AI, from initial onboarding to advanced AI-powered search. Each flow includes:
- Screen-by-screen interactions
- State transitions and conditional logic
- Error handling and edge cases
- Expected user behavior and system responses

**Tech Context**: The application is built on Next.js 15 (App Router) with Convex backend and Clerk authentication, which are already configured and operational. All flows assume these services are running.

---

## First-Time User Onboarding

### Entry Point: Landing Page
**Route**: `/`

**User sees**:
- Hero section with value proposition: "AI-powered bookmark management"
- Key benefits: "Save, organize, and rediscover web content with AI"
- Two CTAs: "Sign Up" (primary) and "Sign In" (secondary)
- Simple, functional design (not flashy)

**User actions**:
```
User clicks "Sign Up"
    ↓
```

### Screen 1: Clerk Sign Up
**Route**: `/sign-up` (Clerk hosted)

**User sees**:
- Email/password input fields
- OR social login options (Google, GitHub)
- "Already have an account? Sign in" link

**User actions - Social Login (Recommended)**:
```
User clicks "Continue with Google"
    ↓
Redirect to Google OAuth consent screen
    ↓
User approves permissions
    ↓
Redirect back to app with JWT token
    ↓
```

**User actions - Email/Password**:
```
User enters email and password
    ↓
User clicks "Create Account"
    ↓
Email verification sent (Clerk handles this)
    ↓
User verifies email via link
    ↓
Redirect back to app with JWT token
    ↓
```

**State transitions**:
- `unauthenticated` → `authenticated`
- JWT stored in HTTP-only cookie
- Convex receives user identity via Clerk integration

### Screen 2: Home Dashboard (First Visit)
**Route**: `/dashboard`

**User sees**:
- Welcome message: "Welcome to Bookmark AI!"
- Empty state illustration
- Prominent "Add Your First Bookmark" button
- Optional onboarding tutorial tooltip (dismissible)
- Sidebar with Collections (empty) and Tags (empty)
- Search bar and AI chat icon (both active but empty)

**User actions**:
```
User clicks "Add Your First Bookmark"
    ↓
```

### Screen 3: Add Bookmark Modal
**Component**: `<AddBookmarkDialog />`

**User sees**:
- URL input field (autofocused)
- Real-time validation indicator
- "Save" button (disabled until valid URL)
- "Cancel" button

**User actions**:
```
User pastes URL: "https://nextjs.org/docs"
    ↓
URL validation passes (green checkmark appears)
    ↓
"Save" button becomes enabled
    ↓
User clicks "Save"
    ↓
Loading state: "Fetching metadata..."
    ↓
```

**System actions**:
```
Convex mutation: addBookmark(url)
    ↓
Convex action: fetchMetadata(url) via Microlink API
    ↓
Extract: title, description, imageUrl, faviconUrl
    ↓
Store bookmark in database with userId
    ↓
Queue embedding generation (async)
    ↓
Real-time update pushes to client
    ↓
Modal closes automatically
    ↓
Success toast: "Bookmark added successfully!"
    ↓
```

### Screen 4: Dashboard with First Bookmark
**Route**: `/dashboard`

**User sees**:
- Bookmark card with:
  - Preview image (if available)
  - Title: "Next.js Documentation"
  - Description: "Learn about Next.js features and API"
  - Favicon from nextjs.org
  - Date added: "Just now"
  - Action buttons: Edit, Delete, Add to Collection
- Suggestion tooltip: "Try asking the AI about your bookmark!"

**User actions**:
```
User clicks AI chat icon in header
    ↓
```

### Screen 5: First AI Chat Interaction
**Component**: `<AIChatPanel />`

**User sees**:
- Chat panel slides in from right
- Welcome message: "Ask me anything about your bookmarks!"
- Example queries:
  - "What did I just save?"
  - "Find articles about Next.js"
- Text input field (autofocused)

**User actions**:
```
User types: "what did I just save?"
    ↓
User presses Enter (or clicks Send)
    ↓
```

**System actions**:
```
Display user message in chat
    ↓
Show AI typing indicator
    ↓
Convex action: aiChat(message, userId, history)
    ↓
Generate query embedding (OpenAI)
    ↓
Vector search: Find top 5 similar bookmarks
    ↓
Assemble context: bookmarks + user question
    ↓
Stream GPT-5 response via Vercel AI SDK
    ↓
```

**User sees (streaming)**:
```
AI: "I found 1 bookmark that matches your query:

1. **Next.js Documentation** [1]
   You just saved the official Next.js documentation. This is a comprehensive resource for learning about Next.js features, including the App Router, Server Components, and API routes.

[1] https://nextjs.org/docs"
    ↓
```

**User actions**:
```
User clicks citation [1]
    ↓
Scroll to bookmark in main view
    ↓
Bookmark card highlights briefly
    ↓
```

**Onboarding complete!** User understands:
- How to add bookmarks
- How to use AI chat to find bookmarks
- Basic navigation

---

## Adding a Bookmark Workflow

### Workflow 1: Single URL via Quick Add

**Entry point**: From any page with "Add Bookmark" button

**User actions**:
```
1. User clicks "Add Bookmark" button (header or FAB)
   ↓
2. Modal opens with URL input focused
   ↓
3. User pastes URL: "https://www.youtube.com/watch?v=abc123"
   ↓
4. Real-time validation:
   - ✅ Valid URL format
   - 🔍 Detecting YouTube video...
   ↓
5. User clicks "Save"
   ↓
6. Loading state (1-2 seconds):
   - "Fetching metadata..."
   - "Extracting transcript..." (YouTube only)
   ↓
```

**System actions for YouTube**:
```
Detect YouTube URL → Extract video ID
    ↓
Fetch metadata:
    - Title from YouTube API or Open Graph
    - Thumbnail URL
    - Duration
    ↓
Fetch transcript via YouTube Transcript API
    ↓
Store bookmark with transcript in database
    ↓
Generate embedding from title + description + transcript
    ↓
Return bookmark object to client
    ↓
```

**User sees**:
```
7. Modal closes
   ↓
8. Success toast: "Bookmark added!"
   ↓
9. Bookmark appears in list view immediately (real-time)
   - YouTube thumbnail as preview
   - Video title
   - Duration badge
   - "Transcript available" indicator
   ↓
```

**Alternative: Metadata fetch fails**:
```
If metadata extraction fails:
    ↓
User sees warning toast: "Couldn't fetch metadata. Please add manually."
    ↓
Modal remains open with manual fields:
    - Title (required)
    - Description (optional)
    - Notes (optional)
    ↓
User fills in title and clicks "Save"
    ↓
Bookmark saved with manual metadata
    ↓
```

### Workflow 2: Bulk Import via CSV

**Entry point**: Settings or Dashboard → "Import" button

**User actions**:
```
1. User clicks "Import Bookmarks"
   ↓
2. Import modal opens:
   - "Upload CSV file (max 1,000 bookmarks)"
   - Drag-and-drop zone
   - "Download sample CSV" link
   - "Select File" button
   ↓
3. User drags bookmarks.csv file into zone
   ↓
4. CSV validation:
   - Check file size (<10 MB)
   - Parse CSV headers (must include "url" column)
   - Count rows (max 1,000)
   ↓
5. Validation passes → Show preview:
   - "Found 150 bookmarks"
   - First 5 rows displayed
   - "Start Import" button
   ↓
6. User clicks "Start Import"
   ↓
```

**System actions**:
```
Queue 150 bookmark processing jobs
    ↓
Process in batches of 10 (to avoid rate limits)
    ↓
For each URL:
    - Validate URL format
    - Fetch metadata
    - Generate embedding
    - Store bookmark
    ↓
Real-time progress updates to client
    ↓
```

**User sees (during import)**:
```
7. Progress bar: "Processing 15/150 (10%)"
   ↓
   Progress updates every 5 seconds
   ↓
   "Processing 75/150 (50%)"
   ↓
   "Processing 145/150 (97%)"
   ↓
8. Import complete modal:
   - ✅ "145 bookmarks added successfully"
   - ⚠️ "5 bookmarks failed"
   - Show failed URLs with reasons:
     - "invalid-url.com" → Invalid URL format
     - "https://dead-link.com" → Failed to fetch (404)
   - "Download Error Report" button
   - "Retry Failed" button
   - "Close" button
   ↓
9. User clicks "Close"
   ↓
10. Dashboard updates with 145 new bookmarks
    ↓
```

**Edge case: Import interrupted**:
```
If user closes modal during import:
    ↓
Show confirmation dialog: "Import in progress. Cancel?"
    ↓
If user confirms:
    - Cancel remaining jobs
    - Keep already-imported bookmarks
    - Show partial results
    ↓
```

### Workflow 3: Edit Bookmark

**Entry point**: Bookmark card → "Edit" button

**User actions**:
```
1. User clicks "Edit" icon on bookmark
   ↓
2. Edit modal opens with pre-filled fields:
   - Title
   - Description
   - Notes (user's personal notes)
   - Collection dropdown (current selection)
   - Tags (chip input with autocomplete)
   ↓
3. User edits title: "Next.js 15 Documentation"
   ↓
4. User adds note: "Check this for App Router best practices"
   ↓
5. User adds tags: "nextjs", "documentation", "reference"
   ↓
6. User clicks "Save Changes"
   ↓
```

**System actions**:
```
Convex mutation: updateBookmark(bookmarkId, updates)
    ↓
Update database record
    ↓
Re-generate embedding if title/description/notes changed
    ↓
Real-time update to all connected clients
    ↓
```

**User sees**:
```
7. Modal closes
   ↓
8. Success toast: "Bookmark updated!"
   ↓
9. Bookmark card updates immediately:
   - New title displayed
   - Tags visible as chips
   - "Updated just now" timestamp
   ↓
```

---

## Using AI Chat to Search Bookmarks

### Workflow 1: Simple Semantic Search

**Entry point**: Dashboard → AI Chat icon (header or sidebar)

**User actions**:
```
1. User clicks AI chat icon
   ↓
2. Chat panel slides in from right (or opens in modal on mobile)
   ↓
3. User types: "show me all resources about React performance"
   ↓
4. User presses Enter
   ↓
```

**System actions**:
```
User message appears in chat
    ↓
AI typing indicator appears
    ↓
Generate query embedding (OpenAI text-embedding-3-small)
    ↓
Convex vector search:
    - Search user's bookmarks only (filtered by userId)
    - Find top 5 most similar bookmarks
    - Return with similarity scores
    ↓
Assemble context:
    - User question
    - Retrieved bookmarks (title, description, url, notes)
    ↓
Call GPT-5 with streaming:
    - System prompt: "You are a helpful assistant. Answer based on the user's bookmarks only. Include citations."
    - Context: [bookmark1, bookmark2, bookmark3]
    - User question
    ↓
Stream response chunk by chunk
    ↓
```

**User sees (streaming response)**:
```
5. AI response streams in:

"I found 3 bookmarks related to React performance:

1. **React Performance Optimization Guide** [1]
   This article covers memoization techniques using React.memo, useMemo, and useCallback to prevent unnecessary re-renders.

2. **Web.dev: Optimize React Performance** [2]
   Google's guide on profiling React apps with Chrome DevTools and optimizing component render cycles.

3. **React Documentation: Optimizing Performance** [3]
   Official React docs covering production builds, virtualization for long lists, and code splitting strategies.

Would you like me to explain any specific optimization technique?"

Citations:
[1] https://example.com/react-perf-guide
[2] https://web.dev/react-performance
[3] https://react.dev/learn/optimizing-performance
    ↓
```

**User interactions with response**:
```
6. User clicks citation [2]
   ↓
7. System scrolls to bookmark in main view
   ↓
8. Bookmark card highlights with blue border (1 second)
   ↓
9. User clicks bookmark card → Opens URL in new tab
   ↓
```

**User continues conversation**:
```
10. User types: "explain memoization"
    ↓
11. AI responds (using context from bookmark [1]):

"Based on your saved article [1], memoization in React prevents unnecessary re-renders by caching results:

- **React.memo**: Wraps components to prevent re-rendering when props haven't changed
- **useMemo**: Caches expensive computation results
- **useCallback**: Caches function references to prevent child re-renders

The article you saved recommends using React DevTools Profiler to identify components that re-render frequently, then applying memoization strategically."
    ↓
```

**Chat session state**:
- Previous messages preserved (scrollable history)
- Context carries across conversation
- User can clear chat and start fresh

### Workflow 2: AI Chat with Filters

**User actions**:
```
1. User opens AI chat
   ↓
2. User toggles "Filter by Collection" dropdown
   ↓
3. User selects "Work Projects" collection
   ↓
4. User types: "what did I save about authentication?"
   ↓
```

**System actions**:
```
Vector search with filter:
    - Search only bookmarks in "Work Projects" collection
    - Find top 5 similar to "authentication"
    ↓
Generate response using filtered results
    ↓
```

**User sees**:
```
AI: "I found 2 bookmarks about authentication in your 'Work Projects' collection:

1. **Clerk Documentation: Setup Guide** [1]
   Your notes say: 'Use this for integrating Clerk with Next.js App Router'

2. **JWT Best Practices** [2]
   Covers secure token storage and refresh strategies.
   ..."
    ↓
```

### Workflow 3: No Results Found

**User actions**:
```
1. User types: "find resources about Rust programming"
   ↓
```

**System actions**:
```
Vector search returns no bookmarks with similarity > 0.6 threshold
    ↓
```

**User sees**:
```
AI: "I didn't find any bookmarks related to Rust programming in your collection.

Would you like me to help you find and save resources about Rust? Or try a different search term?"
    ↓
```

**User options**:
- Refine search query
- Add new bookmarks about Rust
- Clear chat and try different topic

---

## Creating Collections and Organizing with Tags

### Workflow 1: Create Collection

**Entry point**: Sidebar → "Collections" section → "+ New Collection"

**User actions**:
```
1. User clicks "+ New Collection"
   ↓
2. Create Collection modal opens:
   - Name (required, autofocused)
   - Description (optional)
   - Color picker (8 preset colors)
   - Icon picker (emoji selector)
   ↓
3. User enters name: "Design Inspiration"
   ↓
4. User selects purple color
   ↓
5. User selects 🎨 emoji
   ↓
6. User clicks "Create"
   ↓
```

**System actions**:
```
Convex mutation: createCollection(name, description, color, icon)
    ↓
Insert into collections table with userId
    ↓
Real-time update to sidebar
    ↓
```

**User sees**:
```
7. Modal closes
   ↓
8. Success toast: "Collection created!"
   ↓
9. "Design Inspiration" appears in sidebar:
   - 🎨 icon
   - Purple color indicator
   - (0) bookmark count
   ↓
```

### Workflow 2: Assign Bookmark to Collection

**Entry point**: Bookmark card → "Add to Collection" button

**User actions**:
```
1. User hovers over bookmark card
   ↓
2. Quick actions appear:
   - Edit
   - Delete
   - Add to Collection (folder icon)
   ↓
3. User clicks "Add to Collection"
   ↓
4. Collection picker dropdown appears:
   - Search/filter collections
   - List of all collections
   - "Design Inspiration" (0)
   - "Work Projects" (12)
   - "Learning Resources" (45)
   - "+ Create New Collection"
   ↓
5. User clicks "Design Inspiration"
   ↓
```

**System actions**:
```
Convex mutation: updateBookmark(bookmarkId, { collectionId })
    ↓
Update bookmark record
    ↓
Real-time update to UI
    ↓
```

**User sees**:
```
6. Dropdown closes
   ↓
7. Success toast: "Added to Design Inspiration"
   ↓
8. Bookmark card shows collection badge: 🎨 Design Inspiration
   ↓
9. Sidebar updates: "Design Inspiration (1)"
   ↓
```

### Workflow 3: Bulk Organize with Tags

**Entry point**: Dashboard → Select multiple bookmarks → "Add Tags"

**User actions**:
```
1. User enables selection mode (checkbox icon in header)
   ↓
2. Checkboxes appear on all bookmark cards
   ↓
3. User selects 5 bookmarks about Next.js
   ↓
4. User clicks "Add Tags" in bulk action toolbar
   ↓
5. Tag input modal opens:
   - "Add tags to 5 bookmarks"
   - Tag input with autocomplete
   - Existing tags: "nextjs", "react", "javascript", "documentation"
   ↓
6. User types "nex" → Autocomplete suggests "nextjs"
   ↓
7. User selects "nextjs"
   ↓
8. User types "framework" → No match → Creates new tag
   ↓
9. User presses Enter
   ↓
10. Tags to add: ["nextjs", "framework"]
    ↓
11. User clicks "Apply to 5 bookmarks"
    ↓
```

**System actions**:
```
For each selected bookmark:
    Convex mutation: addTagsToBookmark(bookmarkId, ["nextjs", "framework"])
    ↓
    Append tags to existing tags array
    ↓
Real-time updates
    ↓
```

**User sees**:
```
12. Modal closes
    ↓
13. Success toast: "Tags added to 5 bookmarks"
    ↓
14. All 5 bookmark cards update:
    - Tag chips visible: nextjs, framework
    ↓
15. Sidebar "Tags" section updates:
    - nextjs (42) ← count increased by 5
    - framework (5) ← new tag
    ↓
16. Selection mode exits automatically
    ↓
```

### Workflow 4: Filter by Collection and Tags

**Entry point**: Sidebar → Click collection + select tags

**User actions**:
```
1. User clicks "Work Projects" collection in sidebar
   ↓
2. Main view filters to show only "Work Projects" bookmarks
   ↓
3. URL updates: /dashboard?collection=work-projects
   ↓
4. User sees filter chip: "Collection: Work Projects" (removable)
   ↓
5. User clicks tag "authentication" in sidebar
   ↓
6. Additional filter applied
   ↓
7. URL updates: /dashboard?collection=work-projects&tags=authentication
   ↓
8. User sees filter chips:
   - "Collection: Work Projects" ✕
   - "Tag: authentication" ✕
   ↓
9. Main view shows only bookmarks matching BOTH filters
   ↓
10. User clicks ✕ on "Collection: Work Projects"
    ↓
11. Filter removed → Now showing all bookmarks with "authentication" tag
    ↓
```

**State management**:
- Filters stored in URL query params (shareable, bookmarkable)
- Real-time updates as filters change
- Clear All Filters button appears when filters active

---

## Error States and Edge Cases

### 1. Authentication Errors

**Scenario: Session Expired**

```
User navigates to /dashboard
    ↓
Clerk JWT expired
    ↓
Clerk middleware redirects to /sign-in
    ↓
User sees: "Your session expired. Please sign in again."
    ↓
User signs in → Redirected back to /dashboard
    ↓
```

**Scenario: Authentication Failed**

```
User enters wrong password
    ↓
Clerk returns error
    ↓
Error message: "Incorrect email or password"
    ↓
Input field highlights in red
    ↓
User corrects password → Tries again
    ↓
```

### 2. Bookmark Creation Errors

**Scenario: Invalid URL**

```
User enters: "not-a-valid-url"
    ↓
Real-time validation fails
    ↓
Error message below input: "Please enter a valid URL"
    ↓
Save button remains disabled
    ↓
```

**Scenario: Metadata Fetch Fails (404)**

```
User adds URL: "https://example.com/dead-link"
    ↓
Metadata fetch returns 404
    ↓
Modal shows: "URL is valid but couldn't fetch metadata"
    ↓
Fallback form appears:
    - Title: [manual input]
    - Description: [manual input]
    - Or: "Save anyway with URL as title"
    ↓
User clicks "Save anyway"
    ↓
Bookmark created with:
    - Title: "https://example.com/dead-link"
    - Description: null
    ↓
```

**Scenario: Duplicate Bookmark**

```
User tries to add URL already in their collection
    ↓
System checks for existing URL before saving
    ↓
Warning modal: "You already saved this bookmark on [date]"
    ↓
Options:
    - "View Existing" → Navigate to bookmark
    - "Save Anyway" → Create duplicate (different user preferences)
    - "Cancel"
    ↓
```

### 3. AI Search Errors

**Scenario: OpenAI API Rate Limit**

```
User sends AI chat message
    ↓
OpenAI API returns 429 (rate limit exceeded)
    ↓
System implements exponential backoff
    ↓
Retry after 2 seconds → Still rate limited
    ↓
Error message in chat: "AI is temporarily busy. Please try again in a moment."
    ↓
User waits 10 seconds → Tries again → Success
    ↓
```

**Scenario: OpenAI API Down**

```
User sends AI chat message
    ↓
OpenAI API returns 500 (server error)
    ↓
Graceful degradation:
    ↓
Error message: "AI search is temporarily unavailable. Try basic keyword search instead."
    ↓
Show fallback search box
    ↓
User uses keyword search to find bookmarks
    ↓
```

**Scenario: Embedding Generation Fails**

```
New bookmark added
    ↓
Metadata extraction succeeds
    ↓
Embedding generation fails (OpenAI error)
    ↓
Bookmark saved WITHOUT embedding
    ↓
Background job retries embedding generation every 5 minutes
    ↓
Success on 3rd retry
    ↓
Bookmark now searchable via AI
    ↓
User never sees error (transparent retry)
    ↓
```

### 4. Network Errors

**Scenario: User Offline**

```
User loses internet connection
    ↓
User tries to add bookmark
    ↓
Convex client detects offline state
    ↓
Error toast: "You're offline. Changes will sync when reconnected."
    ↓
User regains connection
    ↓
Convex auto-reconnects via WebSocket
    ↓
Success toast: "You're back online!"
    ↓
```

**Scenario: Convex Connection Lost**

```
Convex WebSocket disconnects (network issue)
    ↓
UI shows connection indicator: "Reconnecting..."
    ↓
Convex client auto-retries connection
    ↓
Connection restored → UI updates: "Connected"
    ↓
Real-time sync resumes
    ↓
```

### 5. Import Errors

**Scenario: CSV Format Invalid**

```
User uploads CSV file
    ↓
CSV parser detects missing "url" column
    ↓
Error modal: "Invalid CSV format. Expected 'url' column."
    ↓
"Download Sample CSV" button highlighted
    ↓
User downloads sample → Reformats CSV → Tries again
    ↓
```

**Scenario: CSV Too Large**

```
User uploads 50 MB CSV file
    ↓
File size validation fails
    ↓
Error modal: "File too large (max 10 MB). Please split into smaller files."
    ↓
User splits CSV → Uploads in 2 batches
    ↓
```

### 6. Edge Cases

**Scenario: Very Long Title**

```
Metadata returns title with 500 characters
    ↓
System truncates to 200 characters for display
    ↓
Full title shown on hover tooltip
    ↓
Full title stored in database (no data loss)
    ↓
```

**Scenario: No Preview Image**

```
URL has no Open Graph image
    ↓
System uses favicon as fallback
    ↓
If no favicon: Show domain name as colored avatar
    ↓
Example: "N" for nextjs.org (blue background)
    ↓
```

**Scenario: Special Characters in URL**

```
User adds URL with unicode: "https://example.com/文章"
    ↓
URL properly encoded before storage
    ↓
Display decoded version in UI
    ↓
Clicking bookmark opens with correct encoding
    ↓
```

---

## State Transitions

### Authentication State Machine

```
[Unauthenticated]
    ↓ User signs up/in via Clerk
[Authenticated]
    ↓ JWT stored in cookie
[Active Session]
    ↓ User interacts with app
[Session Active] ←→ [Session Refreshed] (auto-refresh every 5 min)
    ↓ User signs out OR session expires
[Unauthenticated]
```

### Bookmark State Machine

```
[Non-existent]
    ↓ User submits URL
[Creating] (loading state)
    ↓ Metadata fetched successfully
[Metadata Retrieved]
    ↓ Embedding generation starts
[Embedding Pending]
    ↓ Embedding generated
[Fully Indexed] ←→ [Being Updated] (when user edits)
    ↓ User deletes
[Soft Deleted] (30-day retention)
    ↓ After 30 days
[Permanently Deleted]
```

### AI Chat State Machine

```
[Idle]
    ↓ User types message
[User Input]
    ↓ User sends message
[Generating Embedding]
    ↓ Embedding created
[Searching Bookmarks]
    ↓ Top K results retrieved
[Assembling Context]
    ↓ Context sent to GPT-5
[Streaming Response]
    ↓ Stream complete
[Response Complete]
    ↓ User sends another message → Back to [User Input]
    ↓ User clears chat → Back to [Idle]
```

### Collection Filter State

```
[All Bookmarks View]
    ↓ User clicks collection
[Filtered by Collection]
    ↓ User adds tag filter
[Filtered by Collection + Tags]
    ↓ User adds keyword search
[Filtered by Collection + Tags + Keyword]
    ↓ User clears all filters
[All Bookmarks View]
```

### Import Process State

```
[No Import]
    ↓ User uploads CSV
[Validating CSV]
    ↓ Validation passes
[Preview Import]
    ↓ User confirms
[Processing Batch 1]
    ↓ Batch completes
[Processing Batch 2]
    ...
[Processing Batch N]
    ↓ All batches complete
[Import Complete]
    ↓ User closes modal
[No Import]
```

---

## Conditional Logic

### When to Show Onboarding Tutorial

```javascript
if (user.bookmarkCount === 0 && user.createdAt > Date.now() - 5 minutes) {
  showOnboardingTooltip();
} else {
  hideOnboardingTooltip();
}
```

### When to Generate Embeddings

```javascript
if (bookmark.hasEmbedding === false) {
  queueEmbeddingGeneration(bookmark);
}

if (bookmark.updatedFields.includes('title', 'description', 'notes')) {
  regenerateEmbedding(bookmark);
}
```

### When to Use Fallback Metadata

```javascript
try {
  metadata = await fetchFromMicrolink(url);
} catch (error) {
  metadata = await fetchWithCheerio(url); // Self-hosted fallback
}

if (!metadata.title) {
  metadata.title = new URL(url).hostname; // Last resort fallback
}
```

### When to Cache AI Responses

```javascript
const cacheKey = generateHash(query + JSON.stringify(filters));

if (cache.has(cacheKey) && cache.age(cacheKey) < 1 hour) {
  return cache.get(cacheKey); // Return cached response
} else {
  const response = await generateAIResponse(query, bookmarks);
  cache.set(cacheKey, response, ttl: 1 hour);
  return response;
}
```

---

## Mobile-Specific Flows

### Mobile Bookmark Addition

**Differences from desktop**:
- Modal becomes full-screen on mobile (<640px)
- Larger touch targets (48px minimum)
- Swipe down to close modal
- Virtual keyboard auto-opens on input focus

**Mobile navigation**:
```
Bottom Tab Bar (visible on all screens):
    [Home] [Collections] [Add] [AI Chat] [Profile]
    ↓ User taps [Add]
    ↓ Full-screen add bookmark sheet slides up
    ↓ User adds URL → Sheet slides down
    ↓ Returns to previous tab
```

### Mobile AI Chat

**Layout differences**:
- Chat opens as full-screen modal (not sidebar)
- Sticky header with "Back" button
- Sticky input bar at bottom
- Scrollable chat history in middle
- Citations open in bottom sheet (not new tab)

---

## Summary

This application flow document covers:
- ✅ First-time user onboarding (5 screens)
- ✅ Adding bookmarks (3 workflows: single, bulk, edit)
- ✅ AI chat search (3 workflows: simple, filtered, no results)
- ✅ Collections and tags (4 workflows: create, assign, bulk organize, filter)
- ✅ Error states (6 categories: auth, creation, AI, network, import, edge cases)
- ✅ State transitions (5 state machines)
- ✅ Conditional logic (4 scenarios)
- ✅ Mobile-specific considerations

**Key Principles**:
1. **Immediate feedback**: Real-time validation, optimistic updates
2. **Graceful degradation**: Fallbacks for every API failure
3. **Transparent background work**: Embedding generation happens async
4. **Progressive disclosure**: Advanced features revealed as needed
5. **Consistent patterns**: Same interaction patterns across features

---

**Next Steps**: Implement these flows using Next.js 15 App Router, Convex real-time subscriptions, and Clerk authentication (already configured in template).
