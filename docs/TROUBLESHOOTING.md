# Troubleshooting Guide

**Bookmark AI** - Common issues and solutions

**Version**: 1.0
**Last Updated**: October 24, 2025

---

## Table of Contents

1. [Convex Setup Issues](#convex-setup-issues)
2. [Clerk Integration Debugging](#clerk-integration-debugging)
3. [OpenAI API Errors](#openai-api-errors)
4. [Development Environment](#development-environment)
5. [Performance Issues](#performance-issues)
6. [Deployment Problems](#deployment-problems)
7. [FAQ](#faq)

---

## Convex Setup Issues

### Issue: "Convex deployment URL not found"

**Symptoms**:
```
Error: CONVEX_DEPLOYMENT_URL is not set
```

**Solution**:
```bash
# 1. Verify Convex CLI is installed
npx convex --version

# 2. Login to Convex
npx convex login

# 3. Initialize Convex (if not already done)
npx convex dev

# 4. Check .env.local file exists
cat .env.local

# 5. Ensure CONVEX_DEPLOYMENT_URL is set
# Should look like: https://your-project.convex.cloud
```

**Root cause**: Environment variable not configured or Convex not initialized.

---

### Issue: "Convex functions not updating"

**Symptoms**:
- Code changes in `convex/` directory don't reflect in app
- Old function behavior persists

**Solution**:
```bash
# 1. Check if Convex dev server is running
# Should see: "Convex functions ready"

# 2. Restart Convex dev server
# Ctrl+C to stop, then:
npx convex dev

# 3. Clear Convex cache
rm -rf .convex

# 4. Force redeploy
npx convex deploy --prod
```

**Prevention**:
- Always keep `npx convex dev` running during development
- Watch for build errors in Convex terminal

---

### Issue: "Database query returns undefined"

**Symptoms**:
```typescript
const bookmarks = useQuery(api.bookmarks.list);
console.log(bookmarks); // undefined (forever)
```

**Solution**:
```typescript
// 1. Check if query arguments are correct
const bookmarks = useQuery(api.bookmarks.list, {
  // Ensure arguments match function signature
});

// 2. Verify authentication
const identity = await ctx.auth.getUserIdentity();
if (!identity) {
  return []; // Return empty array instead of throwing
}

// 3. Check for errors in Convex dashboard
// Go to: https://dashboard.convex.dev → Logs

// 4. Add error handling in query
export const list = query(async ({ auth, db }) => {
  try {
    const identity = await auth.getUserIdentity();
    if (!identity) return [];

    return await db.query('bookmarks').collect();
  } catch (error) {
    console.error('[QUERY_ERROR]', error);
    return [];
  }
});
```

**Root cause**:
- Query is throwing an error (check Convex logs)
- Arguments don't match function signature
- Authentication issue

---

### Issue: "Vector search not working"

**Symptoms**:
- Vector search returns no results
- Error: "Vector index not found"

**Solution**:
```typescript
// 1. Verify vector index exists in schema
// convex/schema.ts
.vectorIndex('by_embedding', {
  vectorField: 'embedding',
  dimensions: 1536,
  filterFields: ['userId'],
})

// 2. Check embeddings are stored
const bookmark = await db.get(bookmarkId);
console.log('Embedding:', bookmark.embedding); // Should be array of 1536 numbers

// 3. Regenerate embeddings if missing
await generateEmbedding(bookmarkId);

// 4. Verify vector search query
const results = await db
  .query('bookmarks')
  .withSearchIndex('by_embedding', (q) =>
    q.similar('embedding', queryEmbedding, 5).eq('userId', userId)
  )
  .collect();
```

**Root cause**: Embeddings not generated or vector index misconfigured.

---

## Clerk Integration Debugging

### Issue: "Unauthorized" error on protected routes

**Symptoms**:
```
Error: Unauthorized
Redirecting to /sign-in
```

**Solution**:
```bash
# 1. Verify Clerk environment variables
cat .env.local | grep CLERK

# Should have:
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
# CLERK_SECRET_KEY=sk_test_...

# 2. Check Clerk middleware is configured
# app/middleware.ts should exist

# 3. Verify Clerk provider in root layout
# app/layout.tsx should wrap app with <ClerkProvider>

# 4. Test authentication manually
# Go to: http://localhost:3000/sign-in
# Sign in and check if redirected to /dashboard
```

**Debugging**:
```typescript
// Add to protected page
import { useAuth } from '@clerk/nextjs';

export default function DashboardPage() {
  const { isSignedIn, userId } = useAuth();

  console.log('Auth state:', { isSignedIn, userId });

  if (!isSignedIn) {
    return <div>Not signed in</div>;
  }

  return <div>Welcome, {userId}</div>;
}
```

---

### Issue: "Clerk webhook not receiving events"

**Symptoms**:
- User created in Clerk but not synced to Convex
- No webhook events in logs

**Solution**:
```bash
# 1. Verify webhook endpoint is public (not protected)
# Should be accessible without auth

# 2. Check webhook signature validation
# convex/http.ts
const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

# 3. Test webhook locally with ngrok
ngrok http 3000

# 4. Configure webhook in Clerk dashboard
# URL: https://your-ngrok-url.ngrok.io/api/webhooks/clerk
# Events: user.created, user.updated, user.deleted

# 5. Check Clerk dashboard for webhook delivery logs
# Go to: Clerk Dashboard → Webhooks → [Your webhook] → Recent deliveries
```

**Testing**:
```bash
# Test webhook manually
curl -X POST http://localhost:3000/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -d '{"type": "user.created", "data": {...}}'
```

---

### Issue: "Session expired" errors

**Symptoms**:
- User gets logged out frequently
- "Session expired" errors in console

**Solution**:
```typescript
// 1. Check session lifetime in Clerk dashboard
// Settings → Sessions → Session lifetime (default: 7 days)

// 2. Verify JWT refresh is working
// Clerk auto-refreshes tokens, no action needed

// 3. Check for clock skew issues
// Ensure server and client clocks are synchronized

// 4. Clear cookies and retry
// Browser DevTools → Application → Cookies → Clear all

// 5. Check HTTPS in production
// Clerk requires HTTPS for secure cookies
```

---

## OpenAI API Errors

### Issue: "Rate limit exceeded (429)"

**Symptoms**:
```
Error: 429 Rate limit exceeded
Please try again in X seconds
```

**Solution**:
```typescript
// 1. Check OpenAI usage tier
// Free tier: 3 RPM (requests per minute) - UNUSABLE
// Tier 1: 500 RPM (requires $5+ spend) - REQUIRED

// 2. Upgrade to Tier 1
// Add $5+ to OpenAI account balance

// 3. Implement exponential backoff
async function generateEmbeddingWithRetry(text: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
    } catch (error) {
      if (error.status === 429 && i < retries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// 4. Implement request queuing
// Queue bulk operations to avoid hitting rate limits
```

**Prevention**:
- Use caching aggressively (70%+ hit rate)
- Batch embedding generation
- Queue requests instead of parallel processing

---

### Issue: "Invalid API key"

**Symptoms**:
```
Error: 401 Unauthorized
Invalid API key provided
```

**Solution**:
```bash
# 1. Verify API key is set
echo $OPENAI_API_KEY

# 2. Check API key format
# Should start with: sk-proj-... or sk-...

# 3. Regenerate API key in OpenAI dashboard
# Go to: https://platform.openai.com/api-keys

# 4. Update environment variable
# .env.local
OPENAI_API_KEY=sk-proj-your-new-key

# 5. Restart dev server
npm run dev
```

---

### Issue: "Context length exceeded"

**Symptoms**:
```
Error: This model's maximum context length is 8192 tokens
You requested X tokens
```

**Solution**:
```typescript
// 1. Count tokens before sending
import { encoding_for_model } from 'tiktoken';

const enc = encoding_for_model('gpt-4o');
const tokens = enc.encode(text);
console.log('Token count:', tokens.length);

// 2. Truncate context if too long
function truncateContext(bookmarks: Bookmark[], maxTokens = 6000) {
  let context = '';
  let tokenCount = 0;

  for (const bookmark of bookmarks) {
    const bookmarkText = `${bookmark.title}\n${bookmark.description}`;
    const bookmarkTokens = enc.encode(bookmarkText).length;

    if (tokenCount + bookmarkTokens > maxTokens) break;

    context += bookmarkText + '\n\n';
    tokenCount += bookmarkTokens;
  }

  return context;
}

// 3. Use GPT-5 instead (200K context window)
// GPT-5 has much larger context window
```

---

### Issue: "Embedding dimensions mismatch"

**Symptoms**:
```
Error: Expected embedding dimension 1536, got 512
```

**Solution**:
```typescript
// 1. Verify model in code
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small', // ✅ 1536 dims
  // NOT: text-embedding-ada-002 (512 dims) ❌
  input: text,
});

// 2. Update schema if needed
// convex/schema.ts
.vectorIndex('by_embedding', {
  vectorField: 'embedding',
  dimensions: 1536, // Match model output
  filterFields: ['userId'],
})

// 3. Regenerate all embeddings
// Migration script:
const bookmarks = await db.query('bookmarks').collect();
for (const bookmark of bookmarks) {
  await regenerateEmbedding(bookmark._id);
}
```

---

## Development Environment

### Issue: "Port 3000 already in use"

**Symptoms**:
```
Error: Port 3000 is already in use
```

**Solution**:
```bash
# 1. Find process using port 3000
lsof -i :3000

# 2. Kill process
kill -9 [PID]

# 3. Or use different port
npm run dev -- -p 3001
```

---

### Issue: "Module not found" errors

**Symptoms**:
```
Error: Cannot find module '@/components/...'
```

**Solution**:
```bash
# 1. Verify tsconfig.json paths
cat tsconfig.json | grep "@"

# Should have:
# "paths": {
#   "@/*": ["./*"]
# }

# 2. Restart TypeScript server (VS Code)
# Cmd+Shift+P → "TypeScript: Restart TS Server"

# 3. Clear Next.js cache
rm -rf .next

# 4. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

### Issue: "TypeScript errors in IDE but builds succeed"

**Symptoms**:
- Red squiggly lines in VS Code
- Build works fine

**Solution**:
```bash
# 1. Restart TypeScript server (VS Code)
# Cmd+Shift+P → "TypeScript: Restart TS Server"

# 2. Update Convex types
npx convex codegen

# 3. Check TypeScript version
npx tsc --version

# 4. Ensure using workspace TypeScript
# VS Code: Bottom right → Select TypeScript version → "Use Workspace Version"
```

---

## Performance Issues

### Issue: "Slow query performance"

**Symptoms**:
- Queries take >500ms
- UI feels sluggish

**Solution**:
```typescript
// 1. Add indexes to schema
// convex/schema.ts
.index('by_userId', ['userId'])
.index('by_collectionId', ['collectionId'])

// 2. Use indexes in queries
// ❌ BAD: No index (full table scan)
await db.query('bookmarks').filter(q => q.eq(q.field('userId'), userId))

// ✅ GOOD: Uses index
await db.query('bookmarks').withIndex('by_userId', q => q.eq('userId', userId))

// 3. Limit results
await db.query('bookmarks')
  .withIndex('by_userId', q => q.eq('userId', userId))
  .take(100) // Limit to 100 results

// 4. Use pagination
const { results } = usePaginatedQuery(api.bookmarks.list, {}, { initialNumItems: 20 });
```

**Profiling**:
```bash
# Check query performance in Convex dashboard
# Go to: Convex Dashboard → Function Logs → Find slow queries
```

---

### Issue: "AI search is slow (>3 seconds)"

**Symptoms**:
- Vector search takes >1 second
- GPT response takes >5 seconds

**Solution**:
```typescript
// 1. Cache embeddings (never regenerate)
if (bookmark.embedding) {
  return bookmark.embedding; // Use cached
}

// 2. Optimize vector search
// Reduce number of results
const results = await db
  .query('bookmarks')
  .withSearchIndex('by_embedding', q =>
    q.similar('embedding', queryEmbedding, 5) // Top 5 (not 10+)
  );

// 3. Use GPT-4o-mini for internal operations
// Faster and cheaper than GPT-5
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini', // Fast
  messages: [...],
});

// 4. Enable streaming for GPT responses
const stream = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  stream: true, // Start rendering immediately
});
```

---

### Issue: "Large bundle size"

**Symptoms**:
- Slow initial page load
- Large JavaScript files

**Solution**:
```typescript
// 1. Use dynamic imports
const AIChatPanel = dynamic(() => import('@/components/ai-chat-panel'), {
  ssr: false,
  loading: () => <ChatSkeleton />,
});

// 2. Analyze bundle
npm run build
npm run analyze # If analyzer configured

// 3. Remove unused dependencies
npm prune

// 4. Use Server Components
// Convert Client Components to Server Components where possible
```

---

## Deployment Problems

### Issue: "Build fails on Vercel"

**Symptoms**:
```
Error: Build failed
npm run build exited with code 1
```

**Solution**:
```bash
# 1. Test build locally
npm run build

# 2. Check build logs on Vercel
# Go to: Vercel Dashboard → [Project] → Deployments → [Failed build] → Logs

# 3. Verify environment variables
# Vercel Dashboard → Settings → Environment Variables
# Ensure all required vars are set

# 4. Clear Vercel cache
# Vercel Dashboard → Settings → Clear Build Cache

# 5. Redeploy
git push origin main
```

---

### Issue: "Environment variables not working in production"

**Symptoms**:
- Works locally, fails in production
- `process.env.VAR_NAME` is undefined

**Solution**:
```bash
# 1. Verify variables are set in Vercel
# Vercel Dashboard → Settings → Environment Variables

# 2. Check variable names
# Must start with NEXT_PUBLIC_ for client-side access
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...  # ✅ Client-side
CLERK_SECRET_KEY=...                   # ✅ Server-side only

# 3. Redeploy after adding variables
# Vercel auto-redeploys when env vars change

# 4. Use correct syntax
# ✅ GOOD:
process.env.CONVEX_DEPLOYMENT_URL

# ❌ BAD:
process.env['CONVEX_DEPLOYMENT_URL']
```

---

### Issue: "Vercel deployment timeouts"

**Symptoms**:
```
Error: Build exceeded maximum time limit (10 minutes)
```

**Solution**:
```bash
# 1. Optimize build process
# Remove heavy dependencies
# Use caching

# 2. Reduce bundle size
# Use dynamic imports
# Remove unused code

# 3. Upgrade Vercel plan (if needed)
# Pro plan: 45-minute builds
```

---

## FAQ

### Q: How do I reset my development environment?

```bash
# Nuclear option (complete reset)
rm -rf node_modules .next .convex
npm install
npx convex dev
npm run dev
```

---

### Q: How do I debug Convex functions?

```typescript
// Add console.logs
export const myQuery = query(async (ctx) => {
  console.log('[DEBUG] Query started');

  const result = await ctx.db.query('bookmarks').collect();
  console.log('[DEBUG] Result count:', result.length);

  return result;
});

// Check logs in Convex dashboard
// Go to: https://dashboard.convex.dev → Logs
```

---

### Q: How do I test OpenAI integration without using API credits?

```typescript
// Mock OpenAI in development
const isDev = process.env.NODE_ENV === 'development';

if (isDev) {
  return {
    embedding: new Array(1536).fill(0.1), // Fake embedding
  };
}

// Production: Use real API
const response = await openai.embeddings.create({...});
```

---

### Q: How do I rollback a deployment?

```bash
# 1. Find previous deployment
vercel ls

# 2. Promote previous deployment to production
vercel promote [deployment-url]

# Or via Vercel dashboard:
# Deployments → [Previous deployment] → Promote to Production
```

---

### Q: How do I debug authentication issues?

```typescript
// Check auth state in component
import { useAuth } from '@clerk/nextjs';

export function DebugAuth() {
  const auth = useAuth();

  return (
    <pre>{JSON.stringify(auth, null, 2)}</pre>
  );
}

// Check JWT contents
// Go to: https://jwt.io
// Paste JWT from browser cookies
```

---

### Q: How do I clear cached data?

```bash
# Clear browser cache
# DevTools → Application → Storage → Clear site data

# Clear Convex cache
rm -rf .convex

# Clear Next.js cache
rm -rf .next

# Clear npm cache
npm cache clean --force
```

---

## Getting Help

### 1. Check Documentation
- [PRD.md](/Users/seanchiu/Desktop/project-starter/bookmark-ai/docs/PRD.md)
- [ARCHITECTURE.md](/Users/seanchiu/Desktop/project-starter/bookmark-ai/docs/ARCHITECTURE.md)
- [TECH_STACK.md](/Users/seanchiu/Desktop/project-starter/bookmark-ai/docs/TECH_STACK.md)

### 2. Search GitHub Issues
- Check if issue already reported
- Comment on existing issue if relevant

### 3. Check Service Status
- Convex: https://status.convex.dev
- Clerk: https://status.clerk.com
- OpenAI: https://status.openai.com
- Vercel: https://vercel-status.com

### 4. Ask for Help
- Open GitHub issue with:
  - Clear description of problem
  - Steps to reproduce
  - Expected vs actual behavior
  - Error messages (full stack trace)
  - Environment details (OS, Node version)

---

## Summary

This troubleshooting guide covers:
- ✅ Convex setup issues (deployment, queries, vector search)
- ✅ Clerk integration (auth, webhooks, sessions)
- ✅ OpenAI API errors (rate limits, context length)
- ✅ Development environment (ports, modules, TypeScript)
- ✅ Performance issues (slow queries, large bundles)
- ✅ Deployment problems (builds, env vars, timeouts)
- ✅ FAQ (common questions and solutions)

**Quick Debugging Checklist**:
1. ✅ Check service status pages
2. ✅ Verify environment variables
3. ✅ Check console for errors
4. ✅ Review Convex/Vercel logs
5. ✅ Test in incognito mode
6. ✅ Clear caches and restart

**Still stuck?** Open a GitHub issue with detailed information.
