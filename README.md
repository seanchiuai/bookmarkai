# Bookmark AI

> AI-powered bookmark management with semantic search and intelligent retrieval

**Bookmark AI** helps you save, organize, and rediscover web content through natural language search and AI-driven summaries. Using Retrieval-Augmented Generation (RAG), the app understands context and meaning, not just keywords.

## Features

- **Smart Bookmarking**: Automatic metadata extraction (title, description, preview images)
- **AI-Powered Search**: Ask questions in natural language, get relevant bookmarks with AI explanations
- **YouTube Transcripts**: Extract and search video content by spoken words
- **Flexible Organization**: Collections (folders) and tags for easy categorization
- **Real-time Sync**: Powered by Convex for instant updates across devices
- **Secure**: Clerk authentication with row-level data isolation

## Tech Stack

- **Frontend**: Next.js 15, React, shadcn/ui, Tailwind CSS 4
- **Backend**: Convex (real-time database + serverless functions)
- **Authentication**: Clerk
- **AI**: OpenAI (GPT-5 for chat, text-embedding-3-small for embeddings)
- **Deployment**: Vercel
- **Metadata**: Microlink API

## Project Structure

```
bookmark-ai/
├── app/                      # Next.js App Router pages
│   ├── dashboard/           # Main application pages
│   │   ├── bookmarks/       # Bookmark list/grid views
│   │   ├── chat/            # AI chat interface
│   │   └── collections/     # Collection management
│   └── api/                 # API routes (chat streaming)
├── components/               # React components
│   ├── ui/                  # shadcn/ui components
│   ├── bookmarks/           # Bookmark-specific components
│   ├── chat/                # Chat interface components
│   ├── collections/         # Collection components
│   └── tags/                # Tag management components
├── convex/                   # Convex backend
│   ├── schema.ts            # Database schema
│   ├── bookmarks.ts         # Bookmark CRUD functions
│   ├── aiChat.ts            # RAG chat + embedding generation
│   ├── collections.ts       # Collection functions
│   ├── tags.ts              # Tag functions
│   └── youtube.ts           # YouTube transcript extraction
├── lib/                      # Utility functions
├── .claude/                  # AI agents and implementation plans
│   ├── agents/              # Feature-specific agents
│   ├── commands/            # Slash commands (setup, cook, organize, push)
│   └── plans/               # Implementation roadmaps
└── docs/                     # Project documentation
    ├── PRD.md               # Product Requirements Document
    ├── FEATURES.md          # MVP feature list
    ├── TECH_STACK.md        # Technology decisions
    ├── ARCHITECTURE.md      # System architecture
    └── ...                  # Additional documentation
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Convex account (free tier available)
- Clerk account (free tier available)
- OpenAI API account with $5+ credit (for Tier 1 rate limits)

### Quick Start

1. **Clone and Install**
   ```bash
   cd bookmark-ai
   npm install
   ```

2. **Run Setup Command**
   ```bash
   # This walks you through environment setup
   /setup
   ```
   The setup command will guide you through:
   - Creating Convex project
   - Setting up Clerk authentication
   - Configuring OpenAI API
   - Setting environment variables

3. **Development**
   ```bash
   npm run dev
   ```
   Opens app at `http://localhost:3000`

### Environment Variables

Create `.env.local` file:

```bash
# Frontend
NEXT_PUBLIC_CONVEX_URL=<your-convex-deployment-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>

# Backend (set in Convex Dashboard → Settings → Environment Variables)
OPENAI_API_KEY=<your-openai-api-key>
CLERK_JWT_ISSUER_DOMAIN=<your-clerk-jwt-issuer>
```

## Available Commands

This project includes custom Claude Code slash commands:

- **`/setup`** - First-time setup wizard (Convex, Clerk, OpenAI configuration)
- **`/cook`** - Execute all implementation plans using AI agents
- **`/organize`** - Clean up markdown files and detect route issues
- **`/push`** - Git pull and push operations with conflict handling

## Development Workflow

### Phase 1: Foundation (Days 1-5)
- ✅ User authentication (Clerk)
- ✅ Bookmark CRUD operations
- ✅ Collections and tags
- ✅ Metadata extraction
- ✅ Basic keyword search

### Phase 2: AI Capabilities (Days 6-10)
- ✅ Embedding generation
- ✅ Vector search (Convex)
- ✅ RAG chat interface (GPT-5)
- ✅ YouTube transcript extraction
- ✅ Testing and deployment

## Key Features

### 1. Bookmark Management
- Add bookmarks via URL input
- Automatic metadata extraction
- Edit title, description, notes
- Delete with confirmation
- Real-time updates

### 2. Organization
- Create collections (folders) with custom colors and icons
- Multi-tag support with autocomplete
- Filter by collection and tags
- Search by keywords

### 3. AI-Powered Search
- Natural language queries
- Semantic understanding (not just keywords)
- GPT-5 responses with bookmark citations
- Streaming responses for better UX
- Context-aware explanations

### 4. YouTube Support
- Auto-detect YouTube URLs
- Extract video transcripts (free, no API key)
- Include transcripts in search
- Video metadata (thumbnail, duration)

## Performance Targets

- Search latency: <500ms P95
- Page load: <2 seconds
- RAG response time: <3 seconds
- Concurrent users: 50-100 supported
- Uptime: 95-97% (MVP)

## Cost Estimate

**Monthly Operating Cost**: $33-55 (well under $200 budget)

- Vercel Pro: $20-30
- Convex: $5-10 (free tier + overages)
- Clerk: $0 (free tier covers 10K MAU)
- OpenAI: $3-5 (embeddings + GPT-5 chat)
- Sentry: $0-10 (free tier)

## Testing

```bash
# Unit tests
npm run test

# End-to-end tests (Playwright)
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

## Deployment

Deploys automatically to Vercel on push to `main` branch.

**Manual deployment**:
```bash
vercel --prod
```

## Documentation

Comprehensive documentation available in `/docs`:

- **PRD.md** - Product requirements and specifications
- **FEATURES.md** - MVP feature list with priorities
- **TECH_STACK.md** - Technology decisions and rationale
- **ARCHITECTURE.md** - System design and data flow
- **FRONTEND_GUIDELINES.md** - Component architecture and styling
- **BACKEND_STRUCTURE.md** - Convex patterns and best practices
- **TESTING.md** - Testing strategy and tools
- **TROUBLESHOOTING.md** - Common issues and solutions

## Implementation Plans

Feature-specific implementation roadmaps in `.claude/plans/`:

- `feature-rag-chat-plan.md` - AI chat implementation
- `feature-bookmark-crud-plan.md` - Core bookmark operations
- `feature-collections-tags-plan.md` - Organization system
- `feature-youtube-transcription-plan.md` - Video transcript extraction

## Contributing

See `CONTRIBUTING.md` for git workflow, PR process, and code review standards.

## License

MIT License - See LICENSE file for details

## Support

- Report issues: [GitHub Issues](https://github.com/yourusername/bookmark-ai/issues)
- Documentation: `/docs` folder
- Convex: https://docs.convex.dev
- Clerk: https://clerk.com/docs
- Next.js: https://nextjs.org/docs

---

**Built with**:
- [Next.js 15](https://nextjs.org)
- [Convex](https://convex.dev)
- [Clerk](https://clerk.com)
- [OpenAI](https://platform.openai.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Vercel](https://vercel.com)
