# BookmarkAI Backend Structure Document

This document outlines the backend architecture, database setup, APIs, hosting, infrastructure, security, and monitoring for BookmarkAI. It is written in everyday language so that anyone can understand how the backend is built and operates.

## 1. Backend Architecture

### Overall Design
- Serverless-first approach using Convex as both the database and serverless function platform
- Next.js Server Actions for specialized server-side tasks (metadata extraction, video transcription placeholders)
- TypeScript across all layers for consistency and early error detection

### Design Patterns & Frameworks
- Event-driven, real-time subscriptions via Convex `useQuery` and `useMutation` hooks
- Separation of concerns:
  • **Convex functions** handle data storage and real-time logic
  • **Server Actions** handle external calls (e.g., fetching metadata)
  • **React components** handle UI and invoke server actions or Convex functions
- Middleware layer (Clerk) to enforce authentication on every request

### Scalability, Maintainability & Performance
- **Scalability**: Convex and Next.js auto-scale on demand; no manual server provisioning
- **Maintainability**: Shared TypeScript types prevent mismatches; modular directory structure groups related code together
- **Performance**: Real-time updates remove full-page reloads; serverless functions spin up quickly; edge network delivers assets globally

## 2. Database Management

### Database Technology
- Convex (a serverless, NoSQL-like real-time database)
- Managed by the Convex platform—no separate database servers to maintain

### Data Storage & Access
- Data organized into “tables” (collections, tags, bookmarks, transcripts)
- Convex automatically handles indexes and real-time subscriptions
- Access through Convex queries (reads) and mutations (writes)
- All data calls happen over a secure API exposed by Convex

### Data Practices
- Normalize data into small tables (one for bookmarks, one for tags, etc.)
- Store user IDs on every record to isolate each user’s data
- Use array fields (e.g., list of tag IDs) for many-to-many relationships
- Define security rules in Convex to prevent unauthorized access

## 3. Database Schema (Human-Readable)

This is a non-SQL (Convex) schema. Each “table” lists its fields and their purpose.

• **collections**
  - `id`: Unique string assigned by Convex
  - `name`: Text name of the collection (e.g., “Work”, “Recipes”)
  - `userId`: ID of the user who owns this collection
  - `createdAt`: Timestamp when this collection was created

• **tags**
  - `id`: Unique string
  - `name`: Text label (e.g., “video”, “article”)
  - `userId`: ID of the user who owns this tag
  - `createdAt`: Timestamp of tag creation

• **bookmarks**
  - `id`: Unique string
  - `url`: The bookmarked link
  - `title`: Page title extracted from the URL
  - `description`: Meta description from the page
  - `image`: URL of the main image or thumbnail
  - `favicon`: URL of the site’s favicon
  - `userId`: ID of the user who saved this bookmark
  - `collectionId` (optional): ID of the collection it belongs to
  - `tagIds`: Array of tag IDs applied to this bookmark
  - `createdAt`: Timestamp when the bookmark was created
  - `order`: Numeric value to sort bookmarks within a collection

• **transcripts**
  - `id`: Unique string
  - `bookmarkId`: ID of the bookmark this transcript belongs to
  - `text`: Full transcript text of a video
  - `createdAt`: Timestamp when the transcript was generated

## 4. API Design and Endpoints

### How the API Works
- No traditional REST or GraphQL server. Convex functions serve as our API.
- Frontend calls Convex using typed hooks:
  • `useQuery('bookmarks.list')` to fetch bookmarks
  • `useMutation('bookmarks.create')` to add a bookmark
- Next.js Server Actions provide additional endpoints for:
  • `extractUrlMetadata` (fetch metadata from any URL)
  • `transcribeVideoAction` (placeholder to call a transcription service)

### Key Operations

• **Bookmarks** via `convex/bookmarks.ts`:
  - `list`: Get current user’s bookmarks in real time
  - `create`: Save a new bookmark with metadata
  - `update`: Edit bookmark fields (title, description, etc.)
  - `delete`: Remove a bookmark
  - `moveToCollection`: Change its collection
  - `reorder`: Adjust its position in a list

• **Collections** via `convex/collections.ts`:
  - `list`, `create`, `update`, `delete` for user collections

• **Tags** via `convex/tags.ts`:
  - Same set of operations for user tags

• **Transcripts** via `convex/transcripts.ts`:
  - `create`: Save a transcript
  - `get`: Retrieve an existing transcript

• **Server Actions**:
  - `extractUrlMetadata`: Fetches URL HTML, parses metadata
  - `transcribeVideoAction`: Calls an external transcription API (planned)

## 5. Hosting Solutions

• **Next.js Frontend** hosted on Vercel
  - Benefits: Global edge network, automatic SSL, zero-configuration deployments

• **Convex Backend** fully managed by Convex
  - Benefits: Automatic scaling, high availability, built-in real-time features

• **Clerk Authentication** hosted by Clerk
  - Benefits: Secure user management, hosted sign-in pages, email delivery

## 6. Infrastructure Components

• **Content Delivery Network (CDN)**
  - Vercel’s global CDN for static assets (JS, CSS, images)

• **Load Balancing & Scaling**
  - Next.js and Convex automatically distribute traffic across instances

• **Caching**
  - HTTP caching headers on static assets
  - Convex real-time data caching in client SDKs

• **Serverless Functions**
  - Convex functions for data logic
  - Next.js Server Actions for on-demand processing

## 7. Security Measures

• **Authentication & Authorization**
  - Clerk provides sign-in, access tokens, and user sessions
  - Convex security rules ensure users can only read/write their own data

• **Data Encryption**
  - All traffic over HTTPS/TLS
  - Convex and Vercel store data on encrypted disks

• **Secret Management**
  - API keys and secrets (e.g., transcription API) stored in Vercel/Convex environment variables

• **Middleware Protection**
  - Next.js `middleware.ts` blocks unauthenticated access to protected routes

## 8. Monitoring and Maintenance

• **Logging & Metrics**
  - Vercel dashboard for deployment metrics and logs
  - Convex dashboard shows function usage, errors, and performance

• **Error Tracking** (optional)
  - Can integrate Sentry or LogRocket for runtime errors in both frontend and backend

• **Maintenance Practices**
  - Regular dependency updates using automated tools (e.g., Dependabot)
  - Periodic review of Convex security rules and indexes
  - Unit tests for utility functions and Convex queries/mutations
  - End-to-end tests (e.g., Playwright) for critical user flows

## 9. Conclusion and Overall Backend Summary

BookmarkAI’s backend is built on a modern, serverless stack that prioritizes real-time updates, developer productivity, and global performance. By using Convex for data storage and logic, Next.js Server Actions for specialized tasks, and Clerk for secure user management, the system remains:

- **Scalable**: Auto-scaling platforms handle growth seamlessly
- **Maintainable**: Shared TypeScript types and modular code reduce bugs and speed development
- **Secure**: Industry-standard authentication, encryption, and access controls protect user data
- **Performant**: Global CDNs and real-time subscriptions deliver instant updates

This setup aligns perfectly with BookmarkAI’s goal of making bookmark management fast, reliable, and easy to use, while leaving room to add features like full video transcription and browser extensions in the future.