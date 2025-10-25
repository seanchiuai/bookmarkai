# Frontend Development Guidelines

**Bookmark AI** - Frontend standards and best practices

**Version**: 1.0
**Last Updated**: October 24, 2025
**Status**: Ready for Development

---

## Table of Contents

1. [Component Architecture](#component-architecture)
2. [File Naming Conventions](#file-naming-conventions)
3. [State Management](#state-management)
4. [Styling Approach](#styling-approach)
5. [Code Formatting and Linting](#code-formatting-and-linting)
6. [Accessibility Standards](#accessibility-standards)
7. [Performance Best Practices](#performance-best-practices)

---

## Component Architecture

### App Router Structure

**Note**: The template uses Next.js 15 App Router (not Pages Router). All routes are file-based in the `/app` directory.

```
/app
  ├── (auth)                    # Route group (doesn't affect URL)
  │   ├── sign-in
  │   │   └── [[...sign-in]]
  │   │       └── page.tsx      # /sign-in (Clerk hosted)
  │   └── sign-up
  │       └── [[...sign-up]]
  │           └── page.tsx      # /sign-up (Clerk hosted)
  ├── dashboard
  │   ├── layout.tsx            # Dashboard-specific layout
  │   ├── page.tsx              # /dashboard (main app)
  │   ├── loading.tsx           # Suspense loading state
  │   └── error.tsx             # Error boundary
  ├── api
  │   └── webhooks
  │       └── clerk
  │           └── route.ts      # POST /api/webhooks/clerk
  ├── layout.tsx                # Root layout (Clerk provider)
  ├── page.tsx                  # / (landing page)
  ├── globals.css               # Global styles + Tailwind
  └── middleware.ts             # Clerk auth middleware
```

### Component Directory Structure

```
/components
  ├── ui                        # shadcn/ui primitives (don't edit)
  │   ├── button.tsx
  │   ├── dialog.tsx
  │   ├── input.tsx
  │   └── ...
  ├── bookmarks                 # Feature-specific components
  │   ├── bookmark-card.tsx
  │   ├── bookmark-grid.tsx
  │   ├── bookmark-list.tsx
  │   ├── add-bookmark-dialog.tsx
  │   └── edit-bookmark-dialog.tsx
  ├── collections               # Collection components
  │   ├── collection-list.tsx
  │   ├── collection-item.tsx
  │   └── create-collection-dialog.tsx
  ├── chat                      # AI chat components
  │   ├── ai-chat-panel.tsx
  │   ├── chat-messages.tsx
  │   ├── chat-input.tsx
  │   └── chat-message.tsx
  ├── layout                    # Layout components
  │   ├── sidebar.tsx
  │   ├── header.tsx
  │   └── footer.tsx
  └── shared                    # Shared utility components
      ├── search-bar.tsx
      ├── tag-input.tsx
      └── loading-spinner.tsx
```

### Component Composition Pattern

**Principle**: Break down complex UIs into small, reusable components.

**Example: BookmarkCard**

```typescript
// components/bookmarks/bookmark-card.tsx
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Doc } from '@/convex/_generated/dataModel';

interface BookmarkCardProps {
  bookmark: Doc<'bookmarks'>;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function BookmarkCard({ bookmark, onEdit, onDelete }: BookmarkCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-shadow">
      {/* Preview Image */}
      <BookmarkImage src={bookmark.imageUrl} alt={bookmark.title} />

      {/* Content */}
      <CardHeader>
        <CardTitle className="line-clamp-2">{bookmark.title}</CardTitle>
        <CardDescription className="line-clamp-3">
          {bookmark.description}
        </CardDescription>
      </CardHeader>

      {/* Tags */}
      <BookmarkTags tags={bookmark.tags} />

      {/* Actions (visible on hover) */}
      <BookmarkActions
        bookmarkId={bookmark._id}
        onEdit={() => onEdit(bookmark._id)}
        onDelete={() => onDelete(bookmark._id)}
      />
    </Card>
  );
}

// Sub-components (in same file if simple)
function BookmarkImage({ src, alt }: { src?: string; alt: string }) {
  if (!src) return <BookmarkPlaceholder />;

  return (
    <div className="relative aspect-video overflow-hidden">
      <Image src={src} alt={alt} fill className="object-cover" />
    </div>
  );
}

function BookmarkTags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-4">
      {tags.map(tag => (
        <Badge key={tag} variant="secondary">{tag}</Badge>
      ))}
    </div>
  );
}
```

**Benefits**:
- Easy to test individual components
- Reusable across features
- Clear separation of concerns

### Server vs Client Components

**Rule**: Use Server Components by default, Client Components only when needed.

**When to use Server Components** (default):
```typescript
// app/dashboard/page.tsx
import { BookmarkGrid } from '@/components/bookmarks/bookmark-grid';

// This is a Server Component (no 'use client' directive)
export default async function DashboardPage() {
  // Can fetch data directly in component
  const initialData = await getBookmarks();

  return (
    <main>
      <h1>Your Bookmarks</h1>
      <BookmarkGrid initialData={initialData} />
    </main>
  );
}
```

**When to use Client Components**:
```typescript
'use client'; // Required for interactivity

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function AddBookmarkDialog() {
  const [open, setOpen] = useState(false); // Client state
  const addBookmark = useMutation(api.bookmarks.create); // Client hook

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Interactive form */}
    </Dialog>
  );
}
```

**Client Component triggers**:
- `useState`, `useEffect`, `useContext`
- Event handlers (`onClick`, `onChange`)
- Convex hooks (`useQuery`, `useMutation`)
- Browser APIs (`localStorage`, `window`)

### Component Patterns

**Pattern 1: Container/Presenter Pattern**

```typescript
// Container (Client Component, handles logic)
'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { BookmarkList } from './bookmark-list';

export function BookmarkListContainer() {
  const bookmarks = useQuery(api.bookmarks.list);

  if (bookmarks === undefined) return <LoadingSpinner />;
  if (bookmarks.length === 0) return <EmptyState />;

  return <BookmarkList bookmarks={bookmarks} />;
}

// Presenter (Server Component, displays data)
import type { Doc } from '@/convex/_generated/dataModel';

interface BookmarkListProps {
  bookmarks: Doc<'bookmarks'>[];
}

export function BookmarkList({ bookmarks }: BookmarkListProps) {
  return (
    <ul>
      {bookmarks.map(bookmark => (
        <li key={bookmark._id}>
          <BookmarkCard bookmark={bookmark} />
        </li>
      ))}
    </ul>
  );
}
```

**Pattern 2: Compound Components**

```typescript
// components/ui/card.tsx
export function Card({ children, className }: CardProps) {
  return <div className={cn('rounded-lg border bg-card', className)}>{children}</div>;
}

export function CardHeader({ children }: CardHeaderProps) {
  return <div className="p-6">{children}</div>;
}

export function CardTitle({ children }: CardTitleProps) {
  return <h3 className="font-semibold">{children}</h3>;
}

// Usage
<Card>
  <CardHeader>
    <CardTitle>Bookmark Title</CardTitle>
  </CardHeader>
</Card>
```

---

## File Naming Conventions

### General Rules

1. **Use kebab-case for files**: `bookmark-card.tsx`, `ai-chat-panel.tsx`
2. **Component names match file names**: `BookmarkCard` in `bookmark-card.tsx`
3. **One component per file** (except small sub-components)
4. **Use `.tsx` for React components**, `.ts` for utilities

### Naming Examples

```
✅ GOOD:
/components/bookmarks/bookmark-card.tsx       → BookmarkCard
/components/chat/ai-chat-panel.tsx            → AIChatPanel
/lib/utils/format-date.ts                     → formatDate()
/hooks/use-debounced-value.ts                 → useDebouncedValue()

❌ BAD:
/components/BookmarkCard.tsx                  → Use kebab-case
/components/bookmarks/BookmarkCardComponent.tsx → Redundant "Component"
/lib/utils.ts                                 → Too generic
/hooks/useDebounce.tsx                        → Should be .ts (not a component)
```

### Component Naming Conventions

**Components** (PascalCase):
```typescript
export function BookmarkCard() { }
export function AIChatPanel() { }
export function CreateCollectionDialog() { }
```

**Props interfaces** (PascalCase + "Props"):
```typescript
interface BookmarkCardProps {
  bookmark: Doc<'bookmarks'>;
  onEdit: (id: string) => void;
}
```

**Variables** (camelCase):
```typescript
const bookmarkCount = 42;
const isLoading = false;
const handleSubmit = () => { };
```

**Constants** (SCREAMING_SNAKE_CASE):
```typescript
const MAX_BOOKMARKS_PER_PAGE = 20;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_THEME = 'dark';
```

### Hook Naming

**Custom hooks** (camelCase starting with "use"):
```typescript
// hooks/use-debounced-value.ts
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  // ...
  return debouncedValue;
}

// Usage
const debouncedSearch = useDebouncedValue(searchTerm, 300);
```

---

## State Management

### Convex for Server State

**Rule**: Use Convex hooks for ALL server data (no React Query, no SWR, no fetch).

**Reading data (useQuery)**:
```typescript
'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function BookmarkGrid() {
  const bookmarks = useQuery(api.bookmarks.list, { userId: 'user_123' });

  // bookmarks === undefined → Loading state
  // bookmarks === [] → Empty state
  // bookmarks === [Bookmark] → Data loaded

  if (bookmarks === undefined) return <LoadingSpinner />;

  return (
    <div>
      {bookmarks.map(bookmark => (
        <BookmarkCard key={bookmark._id} bookmark={bookmark} />
      ))}
    </div>
  );
}
```

**Writing data (useMutation)**:
```typescript
'use client';

import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function AddBookmarkButton() {
  const addBookmark = useMutation(api.bookmarks.create);

  const handleClick = async () => {
    try {
      await addBookmark({ url: 'https://example.com' });
      toast.success('Bookmark added!');
    } catch (error) {
      toast.error('Failed to add bookmark');
    }
  };

  return <Button onClick={handleClick}>Add Bookmark</Button>;
}
```

**Calling actions (useAction)**:
```typescript
'use client';

import { useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function AIChatInput() {
  const chat = useAction(api.ai.chat);

  const handleSend = async (message: string) => {
    const response = await chat({ message, userId: 'user_123' });
    // Handle response
  };

  return <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }}>...</form>;
}
```

### React State for UI State

**Rule**: Use `useState` for UI-only state (modals, forms, toggles).

**Examples of UI state**:
```typescript
const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility
const [selectedTags, setSelectedTags] = useState<string[]>([]); // Form state
const [searchTerm, setSearchTerm] = useState(''); // Input value
const [isHovered, setIsHovered] = useState(false); // Hover state
```

**Don't use React state for**:
```typescript
// ❌ BAD: Server data in React state (use Convex)
const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

// ✅ GOOD: Server data with Convex
const bookmarks = useQuery(api.bookmarks.list);
```

### Form State Management

**For simple forms** (use React state):
```typescript
export function AddBookmarkForm() {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(false);
  const addBookmark = useMutation(api.bookmarks.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addBookmark({ url });
    setUrl(''); // Reset form
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setIsValid(isValidUrl(e.target.value));
        }}
      />
      <Button type="submit" disabled={!isValid}>Add</Button>
    </form>
  );
}
```

**For complex forms** (use React Hook Form):
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1, 'Title required'),
  description: z.string().optional(),
  tags: z.array(z.string()),
});

type FormData = z.infer<typeof schema>;

export function EditBookmarkForm({ bookmark }: { bookmark: Doc<'bookmarks'> }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: bookmark.title,
      description: bookmark.description,
      tags: bookmark.tags,
    },
  });

  const updateBookmark = useMutation(api.bookmarks.update);

  const onSubmit = async (data: FormData) => {
    await updateBookmark({ bookmarkId: bookmark._id, ...data });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}
      <Button type="submit">Save</Button>
    </form>
  );
}
```

### URL State (for shareable filters)

**Use Next.js searchParams for filters**:
```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage({
  searchParams,
}: {
  searchParams: { collection?: string; tags?: string };
}) {
  const collectionId = searchParams.collection;
  const tags = searchParams.tags?.split(',') || [];

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <BookmarkGrid collectionId={collectionId} tags={tags} />
    </Suspense>
  );
}

// Usage: /dashboard?collection=abc123&tags=react,nextjs
```

**Update URL with filters**:
```typescript
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function FilterPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const addFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/dashboard?${params.toString()}`);
  };

  return (
    <button onClick={() => addFilter('collection', 'work-projects')}>
      Filter by Work Projects
    </button>
  );
}
```

---

## Styling Approach

### Tailwind CSS 4 + shadcn/ui

**Note**: The template uses Tailwind CSS 4 with a custom dark theme. All styles use utility classes.

**Tailwind configuration**:
```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... more colors
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### Styling Conventions

**Use Tailwind utility classes**:
```typescript
// ✅ GOOD: Tailwind utilities
<div className="flex items-center gap-4 p-6 rounded-lg bg-card">
  <h2 className="text-2xl font-semibold">Title</h2>
</div>

// ❌ BAD: Inline styles
<div style={{ display: 'flex', padding: '24px', backgroundColor: '#fff' }}>
  <h2 style={{ fontSize: '24px', fontWeight: 600 }}>Title</h2>
</div>
```

**Use cn() helper for conditional classes**:
```typescript
import { cn } from '@/lib/utils';

<Button
  className={cn(
    'px-4 py-2 rounded-md',
    isActive && 'bg-primary text-primary-foreground',
    disabled && 'opacity-50 cursor-not-allowed'
  )}
>
  Click me
</Button>
```

**Responsive design**:
```typescript
<div className="
  grid
  grid-cols-1     /* Mobile: 1 column */
  md:grid-cols-2  /* Tablet: 2 columns */
  lg:grid-cols-3  /* Desktop: 3 columns */
  gap-4
">
  {bookmarks.map(bookmark => <BookmarkCard key={bookmark._id} {...bookmark} />)}
</div>
```

### Dark Mode

**Theme is controlled via class on root element**:
```typescript
// app/layout.tsx
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

**Dark mode styles**:
```typescript
<div className="
  bg-white dark:bg-gray-900
  text-black dark:text-white
  border border-gray-200 dark:border-gray-800
">
  Content
</div>
```

### Component Variants (with CVA)

**For components with multiple styles**:
```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

// Usage
<Button variant="destructive" size="sm">Delete</Button>
```

---

## Code Formatting and Linting

### ESLint Configuration

**Note**: The template includes ESLint with Next.js recommended rules.

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "prettier"
  ],
  "rules": {
    "react/no-unescaped-entities": "off",
    "@next/next/no-img-element": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100
}
```

### TypeScript Best Practices

**Use strict mode**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

**Avoid `any`, use `unknown`**:
```typescript
// ❌ BAD: any
function parseJSON(data: any) {
  return data;
}

// ✅ GOOD: unknown
function parseJSON(data: unknown) {
  if (typeof data === 'string') {
    return JSON.parse(data);
  }
  throw new Error('Invalid data');
}
```

**Use Convex-generated types**:
```typescript
import type { Doc, Id } from '@/convex/_generated/dataModel';

// ✅ GOOD: Type-safe
interface BookmarkCardProps {
  bookmark: Doc<'bookmarks'>; // Auto-generated from Convex schema
  collectionId?: Id<'collections'>;
}

// ❌ BAD: Manual types
interface BookmarkCardProps {
  bookmark: {
    _id: string;
    title: string;
    // ... manual typing is error-prone
  };
}
```

---

## Accessibility Standards

### WCAG 2.1 AA Compliance

**Keyboard Navigation**:
```typescript
// All interactive elements must be keyboard-accessible
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</button>
```

**ARIA Labels**:
```typescript
// Provide labels for screen readers
<button aria-label="Delete bookmark" onClick={handleDelete}>
  <TrashIcon /> {/* Icon-only button */}
</button>

<input
  type="text"
  aria-label="Search bookmarks"
  placeholder="Search..."
/>
```

**Focus Management**:
```typescript
import { useEffect, useRef } from 'react';

export function AddBookmarkDialog({ open }: { open: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus(); // Auto-focus on open
    }
  }, [open]);

  return (
    <Dialog open={open}>
      <Input ref={inputRef} placeholder="Enter URL" />
    </Dialog>
  );
}
```

**Color Contrast**:
```typescript
// Use Tailwind colors that meet WCAG AA contrast ratio (4.5:1)
<p className="text-gray-900 dark:text-gray-100">
  High contrast text
</p>

// ❌ BAD: Low contrast
<p className="text-gray-400">Low contrast text</p>
```

### Semantic HTML

```typescript
// ✅ GOOD: Semantic elements
<nav>
  <ul>
    <li><a href="/dashboard">Dashboard</a></li>
  </ul>
</nav>

<main>
  <h1>Your Bookmarks</h1>
  <article>
    <h2>Bookmark Title</h2>
    <p>Description</p>
  </article>
</main>

// ❌ BAD: Divs everywhere
<div>
  <div>
    <div><a href="/dashboard">Dashboard</a></div>
  </div>
</div>
```

---

## Performance Best Practices

### 1. Image Optimization

```typescript
import Image from 'next/image';

// ✅ GOOD: Next.js Image component
<Image
  src={bookmark.imageUrl}
  alt={bookmark.title}
  width={400}
  height={200}
  loading="lazy" // Lazy load images below fold
  placeholder="blur"
  blurDataURL={bookmark.blurHash}
/>

// ❌ BAD: Regular img tag
<img src={bookmark.imageUrl} alt={bookmark.title} />
```

### 2. Code Splitting

```typescript
import dynamic from 'next/dynamic';

// Lazy load heavy components
const AIChatPanel = dynamic(() => import('@/components/chat/ai-chat-panel'), {
  loading: () => <ChatSkeleton />,
  ssr: false, // Don't render on server
});

export function Dashboard() {
  const [showChat, setShowChat] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChat(true)}>Open Chat</button>
      {showChat && <AIChatPanel />}
    </div>
  );
}
```

### 3. Memoization

```typescript
import { useMemo, useCallback } from 'react';

export function BookmarkGrid({ bookmarks }: { bookmarks: Doc<'bookmarks'>[] }) {
  // Memoize expensive calculations
  const sortedBookmarks = useMemo(() => {
    return [...bookmarks].sort((a, b) => b.createdAt - a.createdAt);
  }, [bookmarks]);

  // Memoize callback functions
  const handleDelete = useCallback((id: string) => {
    deleteBookmark({ bookmarkId: id });
  }, [deleteBookmark]);

  return (
    <div>
      {sortedBookmarks.map(bookmark => (
        <BookmarkCard key={bookmark._id} bookmark={bookmark} onDelete={handleDelete} />
      ))}
    </div>
  );
}
```

### 4. Virtualization (for long lists)

```typescript
import { FixedSizeList } from 'react-window';

export function VirtualizedBookmarkList({ bookmarks }: { bookmarks: Doc<'bookmarks'>[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={bookmarks.length}
      itemSize={150}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <BookmarkCard bookmark={bookmarks[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

---

## Summary

This frontend guidelines document covers:
- ✅ Component architecture (App Router, Server/Client components)
- ✅ File naming conventions (kebab-case, component naming)
- ✅ State management (Convex for server, React for UI)
- ✅ Styling approach (Tailwind CSS 4, dark mode, responsive)
- ✅ Code formatting (ESLint, Prettier, TypeScript)
- ✅ Accessibility standards (WCAG 2.1 AA, semantic HTML)
- ✅ Performance best practices (image optimization, code splitting)

**Key Principles**:
1. **Server Components by default** → Better performance
2. **Convex for all server data** → Real-time updates
3. **Tailwind for styling** → Consistent design
4. **TypeScript strict mode** → Type safety
5. **Accessibility-first** → Inclusive design

**Next Steps**: Follow these guidelines when building components for Bookmark AI.
