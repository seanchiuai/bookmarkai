---
name: "Vercel Deployment"
description: "Implementation guide for deploying Next.js app to Vercel"
tools: ["npm", "filesystem", "env"]
color: black
---

# Vercel Deployment Agent

## Mission
Deploy Next.js bookmark manager to Vercel with proper environment variables, preview deployments, and production configuration.

## Stack Context
- **Platform**: Vercel (optimized for Next.js)
- **Features**: Automatic deployments, preview URLs, edge functions
- **CLI**: `vercel` command-line tool
- **Integration**: GitHub (automatic deployments on push)

## Implementation Steps

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

Follow prompts to authenticate via email or GitHub.

### 3. Project Structure Check

Verify your project has these files:

**Required Files**:
- `package.json` - Dependencies and build scripts
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration
- `.gitignore` - Excludes `.env.local`, `node_modules`, `.vercel`

**Next.js Configuration**:
```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.convex.cloud",
      },
      {
        protocol: "https",
        hostname: "**.convex.site",
      },
      {
        protocol: "https",
        hostname: "www.google.com", // Google Favicons
      },
    ],
  },
  // Enable React strict mode for development
  reactStrictMode: true,
  // Disable x-powered-by header
  poweredByHeader: false,
};

export default nextConfig;
```

### 4. Configure Environment Variables

**Local Development** (`.env.local`):
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex Backend
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment

# OpenAI API
OPENAI_API_KEY=sk-proj-...

# Microlink API (Optional)
MICROLINK_API_KEY=your_api_key_here
```

**Vercel Environment Variables**:

Add these in Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Environment | Value |
|----------|-------------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production, Preview, Development | `pk_live_...` (prod) or `pk_test_...` (preview) |
| `CLERK_SECRET_KEY` | Production, Preview, Development | `sk_live_...` (prod) or `sk_test_...` (preview) |
| `NEXT_PUBLIC_CONVEX_URL` | Production, Preview, Development | `https://your-deployment.convex.cloud` |
| `CONVEX_DEPLOYMENT` | Production | `prod:your-deployment` |
| `OPENAI_API_KEY` | Production, Preview, Development | `sk-proj-...` |
| `MICROLINK_API_KEY` | Production, Preview | Your API key (optional) |

**Security Notes**:
- Never commit `.env.local` to git
- Use `NEXT_PUBLIC_` prefix ONLY for client-side variables
- Keep API keys private (no `NEXT_PUBLIC_` prefix)

### 5. Initial Deployment (CLI)

```bash
# From project root
vercel

# Follow prompts:
# - Set up and deploy? [Y/n] Y
# - Which scope? [your-username]
# - Link to existing project? [y/N] N
# - What's your project's name? bookmark-manager
# - In which directory is your code located? ./
# - Want to override the settings? [y/N] N
```

This creates:
- `.vercel` directory (add to `.gitignore`)
- Initial deployment with preview URL
- Project linked to Vercel account

### 6. Set Up GitHub Integration (Recommended)

**Connect GitHub Repository**:

1. Go to Vercel Dashboard → Add New Project
2. Import Git Repository → Select your repo
3. Configure Project:
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. Add Environment Variables (same as step 4)
5. Deploy

**Automatic Deployments**:
- `main` branch → Production deployment
- Other branches → Preview deployments
- Pull requests → Preview deployments with unique URLs

### 7. Production Deployment

**Via CLI**:
```bash
# Deploy to production
vercel --prod
```

**Via Git**:
```bash
# Merge to main branch
git checkout main
git merge feature-branch
git push origin main

# Vercel automatically deploys to production
```

### 8. Configure Build Settings (Optional)

**Vercel Dashboard → Project Settings → General**:

```
Build & Development Settings:
├── Framework Preset: Next.js
├── Root Directory: ./
├── Build Command: npm run build
├── Output Directory: .next
├── Install Command: npm install
└── Development Command: npm run dev
```

**Ignore Build Step (Optional)**:
Create `vercel.json` to customize:
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

### 9. Custom Domain (Optional)

**Add Domain**:
1. Vercel Dashboard → Project → Settings → Domains
2. Add Domain → Enter domain name (e.g., `bookmarks.example.com`)
3. Configure DNS:
   - Add CNAME record: `bookmarks` → `cname.vercel-dns.com`
   - Or A record: `@` → Vercel IP address

4. Wait for DNS propagation (~24 hours)

**SSL Certificate**:
- Automatically provisioned by Vercel
- Auto-renews before expiration

### 10. Environment-Specific Configurations

**Preview vs Production**:

```typescript
// lib/config.ts
export const config = {
  isProduction: process.env.VERCEL_ENV === "production",
  isPreview: process.env.VERCEL_ENV === "preview",
  isDevelopment: process.env.NODE_ENV === "development",

  // Use different Convex deployments
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL,

  // Enable debug logging in preview/dev
  enableDebugLogs: process.env.VERCEL_ENV !== "production",
};
```

**Convex Deployments**:
```bash
# Production deployment
CONVEX_DEPLOYMENT=prod:bookmark-manager

# Preview deployment (separate data)
CONVEX_DEPLOYMENT=dev:bookmark-manager-preview
```

## Deployment Commands

### CLI Commands

```bash
# Deploy to preview (default)
vercel

# Deploy to production
vercel --prod

# Pull environment variables to local
vercel env pull

# Add environment variable
vercel env add MY_KEY production

# List deployments
vercel list

# View logs
vercel logs [deployment-url]

# Remove deployment
vercel remove [deployment-id]
```

### Environment Management

```bash
# Pull all environment variables
vercel env pull .env.local

# Pull specific environment
vercel env pull --environment=production

# Add variable to specific environment
vercel env add OPENAI_API_KEY production

# List all environment variables
vercel env ls
```

## Deployment Workflow

### Development → Preview → Production

```bash
# 1. Develop locally
npm run dev

# 2. Create feature branch
git checkout -b feature/new-feature

# 3. Commit changes
git add .
git commit -m "Add new feature"

# 4. Push to GitHub
git push origin feature/new-feature

# 5. Vercel automatically creates preview deployment
# Preview URL: https://bookmark-manager-git-feature-new-feature-username.vercel.app

# 6. Test preview deployment
# Review changes, test functionality

# 7. Merge to main (via PR)
gh pr create --title "Add new feature" --body "Description"
gh pr merge

# 8. Vercel automatically deploys to production
# Production URL: https://bookmark-manager.vercel.app
```

## Performance Optimization

### Edge Functions

**Enable Edge Runtime** for faster response times:

```typescript
// app/api/route.ts
export const runtime = "edge"; // Enable edge runtime

export async function GET(request: Request) {
  // API logic runs on edge network
}
```

### Image Optimization

**Already configured in `next.config.ts`**:
- Automatic image optimization
- WebP format conversion
- Lazy loading
- Remote image domains allowed

### Caching Strategy

**Vercel automatically caches**:
- Static assets (CSS, JS, images)
- API responses (with proper headers)
- Next.js static pages

**Custom Cache Headers**:
```typescript
// app/api/route.ts
export async function GET(request: Request) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "s-maxage=60, stale-while-revalidate",
    },
  });
}
```

## Monitoring & Analytics

### Vercel Analytics

**Enable Analytics**:
1. Vercel Dashboard → Project → Analytics
2. Enable Web Analytics (free tier: 100k events/month)

**Add to Next.js**:
```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Vercel Speed Insights

**Enable Speed Insights**:
```bash
npm install @vercel/speed-insights
```

```typescript
// app/layout.tsx
import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## Troubleshooting

### Common Build Errors

**Error: Environment variable not found**
```
Solution:
1. Check Vercel Dashboard → Environment Variables
2. Ensure variable is added to correct environment
3. Redeploy with: vercel --prod
```

**Error: Module not found**
```
Solution:
1. Check package.json dependencies
2. Clear cache: vercel --force
3. Ensure all imports use @/* aliases
```

**Error: Build timeout (45 minutes)**
```
Solution:
1. Optimize build performance
2. Remove unused dependencies
3. Enable output caching in next.config.ts
```

### Deployment Issues

**Preview deployment not created**
```
Solution:
1. Check Vercel GitHub integration
2. Verify repository permissions
3. Re-connect repository in Vercel Dashboard
```

**Production deployment failed**
```
Solution:
1. Check build logs: vercel logs [deployment-url]
2. Test build locally: npm run build
3. Fix errors and redeploy
```

## Security Best Practices

### Environment Variables
- Never expose secrets in client-side code
- Use `NEXT_PUBLIC_` prefix only for public variables
- Rotate API keys regularly
- Use separate keys for production/preview

### Headers

**Add security headers** in `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
    ];
  },
};
```

## Testing Checklist
- [ ] Project builds successfully locally (`npm run build`)
- [ ] All environment variables configured in Vercel
- [ ] Preview deployment working
- [ ] Production deployment successful
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Analytics enabled
- [ ] Image optimization working
- [ ] API routes responding correctly
- [ ] Authentication working in production

## Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Environment Variables Guide](https://vercel.com/docs/projects/environment-variables)
- [Vercel Analytics](https://vercel.com/analytics)
