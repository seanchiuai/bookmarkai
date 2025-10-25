# Technology Stack

**Bookmark AI** - Technology decisions and rationale

## Overview

The technology stack for Bookmark AI is optimized for:
- **Rapid development** (2-week MVP timeline)
- **Real-time capabilities** (instant bookmark updates)
- **AI/RAG integration** (semantic search and chat)
- **Cost efficiency** ($33-55/month operational cost)
- **Scalability** (50-100 concurrent users to 1000+ users)

---

## Frontend Stack

### Next.js 15 (App Router)
**Why**: Latest Next.js with React 19 support, Server Components, and improved performance

**Key Features**:
- App Router for modern routing patterns
- React Server Components reduce bundle size
- Server Actions eliminate API route boilerplate
- Streaming support for AI responses
- 96.3% faster Fast Refresh during development
- Turbopack for faster builds

**Alternatives Considered**:
- Vite + React: Faster dev server but lacks built-in SSR and server components
- Remix: Good for SSR but less mature AI SDK integration

**Decision**: Next.js 15 wins for Vercel AI SDK integration, React Server Components, and production readiness.

---

### React 19
**Why**: Latest React features including Server Components and improved hooks

**Key Features**:
- Server Components for zero-JS components
- Improved Suspense boundaries
- useOptimistic for optimistic updates
- Better TypeScript support

---

### Tailwind CSS 4
**Why**: Utility-first CSS with custom dark theme, fast development

**Key Features**:
- JIT compiler for minimal CSS bundle
- Custom color palette for dark mode
- Responsive design utilities
- Component-scoped styling

**Alternatives Considered**:
- CSS Modules: Too verbose for rapid development
- Styled Components: Runtime overhead, slower

**Decision**: Tailwind CSS 4 for speed and built-in dark mode support.

---

### shadcn/ui
**Why**: High-quality, accessible components that are copy-pastable and customizable

**Key Features**:
- Built on Radix UI primitives
- WCAG 2.1 AA accessible
- Fully customizable with Tailwind
- No package dependencies (copy to codebase)
- Dark mode support built-in

**Components Used**:
- Dialog, Button, Input, Label, Card, Badge, Combobox, Select, Textarea

**Alternatives Considered**:
- Material UI: Too heavy, opinionated styling
- Ant Design: Not tailored for Tailwind

**Decision**: shadcn/ui for flexibility and lightweight footprint.

---

## Backend Stack

### Convex
**Why**: All-in-one backend (database + serverless + vector search + real-time)

**Key Features**:
- **Real-time Database**: WebSocket subscriptions for instant updates
- **Vector Search**: Built-in 1536-dim vector index (no separate Pinecone needed)
- **Serverless Functions**: Queries, mutations, actions with TypeScript
- **Type Safety**: Auto-generated TypeScript types from schema
- **Transactions**: Serializable isolation prevents race conditions
- **Performance**: Sub-50ms query latency

**Convex vs Alternatives**:

| Feature | Convex | Supabase | Firebase |
|---------|--------|----------|----------|
| Real-time Sync | Native reactive queries | Postgres replication | Limited (200K concurrent) |
| TypeScript Safety | End-to-end type generation | Manual types | Weak typing |
| Vector Search | Built-in (1M+ vectors) | pgvector extension | Not available |
| Function Runtime | V8 isolates (<10ms cold start) | Deno Edge Functions | 1s+ cold start |
| Transaction Model | Serializable isolation | Read-committed | Limited support |

**Decision**: Convex wins for built-in vector search, real-time capabilities, and TypeScript-first DX.

**Cost**:
- Free tier: 0.5 GB storage, 1 GB/month bandwidth (dev only)
- Professional: $25/month base + $0.20/GB overage
- Expected: $5-10/month for MVP

---

## Authentication

### Clerk
**Why**: Enterprise-grade auth with Convex integration and 10K free MAU

**Key Features**:
- JWT-based sessions with automatic refresh
- Social login (Google, GitHub)
- Email/password authentication
- Multi-device session management
- SOC 2 Type 2, GDPR compliant
- Official Convex integration pattern

**Setup Time**: 2-4 hours with Convex template

**Clerk vs Alternatives**:

| Feature | Clerk | Auth0 | Supabase Auth |
|---------|-------|-------|---------------|
| Free Tier | 10K MAU | 7K MAU | Unlimited (self-hosted) |
| Social Logins | ✅ Multiple | ✅ Multiple | ✅ Limited |
| Convex Integration | Official docs | Manual setup | Manual setup |
| Session Management | Automatic JWT refresh | Manual refresh | Manual refresh |
| Cost at 1K users | $0 | $0 | $0 |
| Cost at 20K users | $25/mo | $240/mo | $0 |

**Decision**: Clerk for free tier coverage, official Convex integration, and developer experience.

---

## AI/RAG Stack

### OpenAI API
**Why**: Industry-leading models for embeddings and chat completions

**Models Used**:
1. **GPT-5** (User-facing chat)
   - Latest reasoning and context understanding
   - Streaming support via Vercel AI SDK
   - Cost: Variable (estimate $1-2/month for 1K queries)

2. **GPT-4o-mini** (Internal RAG operations)
   - Cost-efficient for query rewriting, internal tasks
   - 94% cheaper than GPT-4
   - Cost: $0.15/1M input tokens

3. **text-embedding-3-small** (Embeddings)
   - 1536-dimension vectors
   - Cost: $0.02/1M tokens (cheapest OpenAI embedding)
   - Performance: Suitable for <100K bookmarks

**Rate Limits**:
- Free tier: 3 RPM (unusable)
- Tier 1 ($5+ spend): 500 RPM (required for MVP)

**Cost Estimate**: $3-5/month for 100 users

**Alternatives Considered**:
- Claude API: No streaming support in 2-week timeline
- Llama 3 (self-hosted): Infrastructure overhead

**Decision**: OpenAI for fastest time-to-value and proven RAG performance.

---

### Vercel AI SDK
**Why**: Minimal boilerplate for streaming AI responses

**Key Features**:
- `streamText()` for GPT streaming
- `useChat()` React hook for message management
- React Server Components integration
- 10-20 lines of code for full chat interface

**Vercel AI SDK vs Alternatives**:

| Framework | Time to Production | Streaming | Learning Curve |
|-----------|-------------------|-----------|----------------|
| Vercel AI SDK | 2-5 days | ✅ Native | Low |
| LangChain | 7-14 days | ✅ Complex | High |
| Custom OpenAI | 3-7 days | Manual setup | Medium |

**Decision**: Vercel AI SDK for 2-week timeline and excellent Next.js integration.

**Why NOT LangChain**:
- Steep learning curve (7-14 days)
- Too complex for MVP scope
- Can migrate post-MVP if needed

---

## Supporting Services

### Microlink API (Metadata Extraction)
**Why**: Comprehensive Open Graph extraction with free tier

**Features**:
- Extract title, description, images, favicons
- CDN-backed for speed
- Free tier: 100 requests/day (3K/month)
- Fallback to self-hosted scraping

**Cost**: $0/month (free tier + self-hosted fallback)

---

### YouTube Transcript API
**Why**: Free transcript extraction without API key

**Features**:
- Extract auto-generated and manual captions
- Simple HTTP GET requests
- No rate limits (unofficial)
- Supports multiple languages

**Cost**: $0/month

---

## Deployment & Infrastructure

### Vercel Pro
**Why**: Seamless Next.js deployment with commercial use allowed

**Features**:
- Automatic HTTPS and custom domains
- Global CDN (edge functions)
- Preview deployments for PRs
- Zero-config CI/CD with GitHub
- Automatic scaling

**Cost**: $20-30/month (required for production)

**Hobby tier restrictions**: Non-commercial use only (not viable for MVP)

---

### Sentry (Monitoring)
**Why**: Native Vercel integration for error tracking

**Features**:
- Automatic source maps
- Error grouping and tracking
- Performance tracing
- Free tier: 5K errors/month

**Cost**: $0-10/month (free tier sufficient)

---

## Development Tools

### TypeScript
**Why**: Type safety across frontend and backend

**Benefits**:
- Convex auto-generates types from schema
- Catch errors at compile time
- Better IDE autocomplete

---

### ESLint + Prettier
**Why**: Code consistency and formatting

**Configuration**:
- Next.js recommended ESLint rules
- Prettier for automatic formatting

---

### Playwright (E2E Testing)
**Why**: Reliable end-to-end testing for critical flows

**Features**:
- Cross-browser testing
- Automatic waiting
- Screenshot/video on failure
- Parallel test execution

---

## Technology Stack Summary

| Layer | Technology | Monthly Cost | Justification |
|-------|------------|--------------|---------------|
| **Frontend** | Next.js 15 | $0 | Open source, React Server Components |
| **UI Components** | shadcn/ui | $0 | Copy-paste components, no runtime |
| **Styling** | Tailwind CSS 4 | $0 | Utility-first, JIT compiler |
| **Backend** | Convex | $5-10 | All-in-one (DB + functions + vector search) |
| **Auth** | Clerk | $0 | Free tier covers 10K MAU |
| **AI Chat** | OpenAI (GPT-5) | $1-2 | Latest model for user-facing chat |
| **AI Internal** | OpenAI (GPT-4o-mini) | $0.50 | Cost-efficient for RAG operations |
| **Embeddings** | OpenAI (text-embedding-3-small) | $2-3 | Cheapest vector embeddings |
| **AI Framework** | Vercel AI SDK | $0 | Open source streaming framework |
| **Metadata** | Microlink API | $0 | Free tier + self-hosted fallback |
| **Transcription** | YouTube Transcript API | $0 | Free, no API key required |
| **Hosting** | Vercel Pro | $20-30 | Required for commercial use |
| **Monitoring** | Sentry | $0-10 | Free tier sufficient |
| **TOTAL** | | **$33-55** | ✅ Under $200 budget |

---

## Scalability Plan

### At 100 Users (MVP)
- Convex Free Tier + small overages: $5-10
- OpenAI usage: $3-5
- Vercel Pro: $20-30
- **Total**: $33-55/month

### At 1,000 Users
- Convex Professional: $40/month
- Clerk: $25/month (exceeded free tier)
- OpenAI: $30/month
- Vercel Pro: $30/month
- Sentry: $26/month
- **Total**: $151/month (still under $200)

### At 5,000+ Users
- Consider Pinecone for vector search ($70-100/month)
- Upgrade Vercel to Team plan ($50/month)
- Implement aggressive caching strategies
- **Total**: $300+/month (introduce pricing tiers)

---

## Migration Paths

### Post-MVP Optimizations

1. **Vector Database**: Migrate to Pinecone if >100K bookmarks
2. **AI Framework**: Migrate to LangChain for advanced RAG features
3. **Caching**: Add Redis for API response caching
4. **CDN**: Use Cloudflare for static asset delivery
5. **Analytics**: Add PostHog or Mixpanel for user analytics

---

## Technology Decision Criteria

Every technology choice was evaluated on:
1. **Time to Value**: Can it be implemented in 2 weeks?
2. **Cost**: Does it fit the $200/month budget?
3. **Developer Experience**: Is documentation comprehensive?
4. **Scalability**: Can it handle 1K+ users?
5. **Integration**: Does it work with existing stack?

**Result**: Optimized for 2-week MVP delivery with clear post-MVP scaling path.
