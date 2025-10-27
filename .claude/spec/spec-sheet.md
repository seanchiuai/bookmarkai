1. What This App Does
Bookmark AI is a web app that saves your links and automatically pulls titles, descriptions, and images. For YouTube and Instagram Reels, it also extracts audio and attaches a time-stamped transcript. There’s no search; you browse by collections and tags.

2. Core Features
- Quick Save: Paste a URL or use the clipper to fetch metadata (title, description, images) and a preview snapshot via a custom extractor. Next.js server actions write the bookmark to Convex and the UI confirms it’s added.
- Video Transcription: When saving YouTube or Instagram Reel links, a custom pipeline extracts audio, generates a time-stamped transcript, and attaches it to the bookmark for playback and reading. Jobs run via Next.js route handlers/server actions with results stored in Convex and scoped to the signed-in user via Clerk.
- Organize Collections: Create folders and tags, move and reorder bookmarks, and browse filtered views to keep related links grouped—no search needed. Convex persists structure, ordering, and filters; Clerk ensures user-specific data isolation.

3. Tech Stack
- Framework: Next.js 15 (App Router, Server Actions, Route Handlers)
- Database: Convex (document storage, real-time updates, background jobs)
- Auth: Clerk (user accounts, sessions, user-scoped data)
- Feature-specific (custom, self-hosted): Link metadata extractor (Open Graph/HTML parsing + preview snapshot), video/audio processing and transcription engine with timecodes, authenticated web clipper entry point

4. UI Design Style
Clean, minimal, content-first layout with card/grid previews and a prominent “Add URL” action; simple folder/tag browsing and an inline transcript panel for videos, optimized for clarity and speed without search clutter.