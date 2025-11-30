# Project Requirements Document (PRD)

## 1. Project Overview

BookmarkAI is a full-stack web application designed to help users effortlessly save, organize, and retrieve web bookmarks enriched with contextual metadata. When a user adds a URL, the system automatically fetches the page’s title, description, images, and favicon so that each bookmark becomes an information-rich entry rather than just a link. The goal is to replace chaotic browser bookmark folders with a searchable, tag-driven repository that adapts to individual workflows.

Beyond basic bookmarking, BookmarkAI aims to transcribe video content (e.g., YouTube, Instagram Reels) and attach full transcripts to relevant bookmarks, turning multimedia resources into searchable text. Although this feature is a placeholder in the first release, the core objective remains: deliver a responsive, secure, real-time platform where users can categorize links by custom collections, apply tags, and instantly find what they need. Success will be measured by fast metadata extraction (< 2 s per URL), sub-second search results, and a clean, intuitive interface that encourages daily use.

## 2. In-Scope vs. Out-of-Scope

**In-Scope (v1.0)**
- User registration, login, and session management via Clerk.
- Bookmark creation with automatic metadata extraction (title, description, images, favicon).
- Organizing bookmarks into named collections (folders).
- Applying and managing custom tags for each bookmark.
- Real-time dashboard showing additions, edits, and deletions without page reloads (Convex).
- Full-text search and filtering by tags or collections.
- Dark-mode-ready UI using Tailwind CSS and shadcn/ui.
- Placeholder support for video transcript attachment (UI component only).

**Out-of-Scope (v1.0)**
- Actual integration with a third-party video transcription service (e.g., OpenAI Whisper, AssemblyAI).
- Browser extension or mobile app.
- Bulk operations (move/delete multiple bookmarks at once).
- Social sharing or collaboration on collections.
- Visual webpage snapshots or thumbnails.

## 3. User Flow

A new user lands on the Welcome page and registers via email using Clerk. After verifying their email, they’re redirected to the main dashboard. On the left, a collapsible sidebar lists “All Bookmarks,” “Collections,” and “Tags.” The main panel is empty on first use, with a prominent “Add Bookmark” button.

Clicking “Add Bookmark” opens a modal where the user pastes a URL and hits “Save.” The system invokes a Next.js Server Action to fetch and parse the page’s HTML, then a Convex mutation persists the bookmark with its metadata. Instantly, the dashboard refreshes to show the new entry. From there, the user can click on the bookmark card to edit its title, assign tags, or move it into a collection. At any point, they can search via the top bar or filter by tag/collection. Logging out returns them to the Welcome page.

## 4. Core Features

- **Authentication & Authorization**
  - Email/password signup, login, and session handling with Clerk.
- **Bookmark Creation & Metadata Extraction**
  - Input URL → Server Action fetches HTML → `metadata-extractor` parses title, description, images, favicon → Convex mutation stores data.
- **Collections Management**
  - Create, rename, delete collections; assign bookmarks to collections.
- **Tags Management**
  - Create, rename, delete tags; apply multiple tags to a single bookmark.
- **Dashboard & Real-Time Sync**
  - List all bookmarks; auto-update on data changes using Convex real-time queries.
- **Search & Filtering**
  - Full-text search across bookmark titles and descriptions; filter by tag(s) and/or collection.
- **Video Transcript Placeholder**
  - UI component `TranscriptViewer` ready to display transcripts once integrated.
- **Theming & UI Components**
  - Dark/light mode; reusable components from shadcn/ui and custom Tailwind styles.

## 5. Tech Stack & Tools

- **Frontend**
  - Next.js 15 (App Router) with React and TypeScript.
  - Tailwind CSS 4 for utility-first styling; shadcn/ui for prebuilt components.
  - Clerk.js for authentication UI and middleware.
- **Backend & Database**
  - Convex serverless platform for real-time database and functions (queries & mutations).
  - TypeScript for all serverless functions and shared types.
- **Server Actions**
  - Next.js Server Actions for metadata extraction and future transcription tasks.
- **Utilities & Services**
  - `metadata-extractor.ts` for HTML parsing.
  - `video-transcriber.ts` (placeholder) for future transcription integration.
- **Development Environment**
  - VSCode with TypeScript, ESLint, Prettier, Tailwind CSS IntelliSense.
  - Git for version control; GitHub for repository hosting.

## 6. Non-Functional Requirements

- **Performance**
  - Metadata extraction ≤ 2 s per URL.
  - Dashboard render & search results ≤ 200 ms for up to 500 bookmarks.
- **Scalability**
  - Convex real-time subscriptions should handle 1,000 concurrent users without degradation.
- **Security**
  - HTTPS-only connections; secure cookies for sessions.
  - Input validation at server actions and Convex mutations.
  - Role-based access rules in Convex to prevent unauthorized data reads/writes.
- **Usability & Accessibility**
  - Responsive design for desktop and tablet (mobile optional).
  - WCAG 2.1 AA compliance for keyboard navigation and screen readers.
- **Reliability**
  - 99.9% uptime goal; monitoring for function errors and page failures.

## 7. Constraints & Assumptions

- The project relies on Convex’s availability and pricing model for data storage and real-time functions.
- Clerk’s hosted authentication service must support required regional compliance (e.g., GDPR).
- A stable third-party transcription API will be chosen in v2; until then, video transcription remains a UI placeholder.
- Hosting environment supports Next.js 15 Server Actions and Convex client.
- Users have modern browsers with JavaScript enabled.

## 8. Known Issues & Potential Pitfalls

- **Video Transcription Delays**: Long-running transcription tasks may exceed HTTP timeouts. Mitigation: offload to background Convex function or serverless queue.
- **Metadata Extraction Failures**: Pages with heavy JavaScript or bot protection may fail. Mitigation: implement retry logic, timeouts, and user feedback on failures.
- **API Rate Limits**: Third-party services (e.g., future transcription API) may throttle requests. Mitigation: add exponential backoff, caching of transcripts.
- **Real-Time Sync Overhead**: Subscribing to large data sets can impact performance. Mitigation: implement pagination or limit scope per collection/tag.
- **Security Misconfiguration**: Missing Convex `.can` rules could expose data. Mitigation: audit all functions against least-privilege principles and test unauthorized access.

---

This PRD serves as the definitive guide for BookmarkAI’s v1.0 implementation. It clarifies the product scope, user journey, features, tech choices, and key considerations so that subsequent technical documents (Tech Stack, Frontend Guidelines, Backend Structure, etc.) can be produced without gaps or ambiguities.