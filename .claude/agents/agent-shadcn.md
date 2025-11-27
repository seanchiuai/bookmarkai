---
name: "shadcn/ui + Tailwind CSS"
description: "Implementation guide for shadcn/ui components and Tailwind CSS styling"
tools: ["npm", "filesystem"]
color: indigo
---

# shadcn/ui + Tailwind CSS Agent

## Mission
Implement UI components using shadcn/ui and Tailwind CSS for a clean, accessible, modern interface.

## Stack Context
- **UI Library**: shadcn/ui (copy-paste component system, not npm package)
- **Styling**: Tailwind CSS 4 (utility-first CSS framework)
- **Component Library**: Radix UI primitives (via shadcn/ui)
- **Pattern**: Utility-first styling with accessible, customizable components

## Implementation Steps

### 1. Install Dependencies
```bash
# Tailwind CSS and PostCSS
npm install tailwindcss @tailwindcss/postcss postcss

# shadcn/ui CLI (one-time setup)
npx shadcn@latest init
```

During `shadcn init`, select:
- **Style**: Default
- **Base color**: Neutral
- **CSS variables**: Yes
- **Import alias**: `@/*`

### 2. Configure PostCSS
**File**: `postcss.config.mjs`

```javascript
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
export default config;
```

### 3. Configure Tailwind
**File**: `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
```

### 4. Add Global Styles
**File**: `app/globals.css`

```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### 5. Install Components via CLI

**Core components for bookmark manager**:

```bash
# Layout and structure
npx shadcn@latest add card
npx shadcn@latest add separator
npx shadcn@latest add scroll-area

# Forms and inputs
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add textarea
npx shadcn@latest add label
npx shadcn@latest add form

# Navigation
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add sheet

# Data display
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add skeleton

# Feedback
npx shadcn@latest add toast
npx shadcn@latest add alert
```

### 6. Component Usage Patterns

#### Button Component
```tsx
import { Button } from "@/components/ui/button";

// Variants: default, destructive, outline, secondary, ghost, link
<Button variant="default" size="sm">
  Add Bookmark
</Button>

<Button variant="outline" size="icon">
  <PlusIcon className="h-4 w-4" />
</Button>
```

#### Card Component (Bookmark Display)
```tsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

<Card className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <div className="flex items-center gap-2">
      <img src={favicon} className="w-4 h-4" alt="" />
      <CardTitle className="text-sm font-medium truncate">
        {title}
      </CardTitle>
    </div>
    <CardDescription className="line-clamp-2">
      {description}
    </CardDescription>
  </CardHeader>
  <CardContent>
    <img src={previewImage} className="w-full rounded-md" alt={title} />
  </CardContent>
  <CardFooter>
    <Button variant="ghost" size="sm" asChild>
      <a href={url} target="_blank" rel="noopener noreferrer">
        Open
      </a>
    </Button>
  </CardFooter>
</Card>
```

#### Input Component (Add Bookmark Form)
```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="url">Bookmark URL</Label>
  <Input
    id="url"
    type="url"
    placeholder="https://example.com"
    value={url}
    onChange={(e) => setUrl(e.target.value)}
  />
</div>
```

#### Dialog Component (Add/Edit Modal)
```tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Add Bookmark</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle>Add New Bookmark</DialogTitle>
      <DialogDescription>
        Paste a URL to automatically fetch metadata.
      </DialogDescription>
    </DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Form fields */}
    </form>
  </DialogContent>
</Dialog>
```

#### Sheet Component (AI Chat Sidebar)
```tsx
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

<Sheet open={isChatOpen} onOpenChange={setIsChatOpen}>
  <SheetTrigger asChild>
    <Button variant="outline">
      <MessageSquareIcon className="h-4 w-4 mr-2" />
      AI Assistant
    </Button>
  </SheetTrigger>
  <SheetContent side="right" className="w-[400px] sm:w-[540px]">
    <SheetHeader>
      <SheetTitle>AI Bookmark Assistant</SheetTitle>
      <SheetDescription>
        Ask me anything about your bookmarks
      </SheetDescription>
    </SheetHeader>
    <div className="flex flex-col h-full">
      {/* Chat messages */}
    </div>
  </SheetContent>
</Sheet>
```

## Tailwind Utility Patterns

### Layout (Mobile-First)
```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Flexbox
<div className="flex items-center justify-between gap-4">

// Container
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
```

### Spacing
```tsx
// Padding: p-{size} (1 unit = 0.25rem)
<div className="p-4">           {/* 1rem padding */}
<div className="px-6 py-4">     {/* 1.5rem horizontal, 1rem vertical */}

// Margin: m-{size}
<div className="mt-8 mb-4">     {/* 2rem top, 1rem bottom */}

// Gap: gap-{size}
<div className="flex gap-2">    {/* 0.5rem gap */}
```

### Typography
```tsx
// Size
<h1 className="text-3xl font-bold">      {/* 30px, 700 weight */}
<p className="text-sm text-muted-foreground">  {/* 14px, muted color */}

// Truncate
<p className="truncate">                  {/* Single line ellipsis */}
<p className="line-clamp-2">              {/* 2 lines ellipsis */}
```

### Colors (CSS Variables)
```tsx
// Background
<div className="bg-background">
<div className="bg-card">
<div className="bg-muted">

// Text
<p className="text-foreground">
<p className="text-muted-foreground">
<p className="text-destructive">

// Border
<div className="border border-border">
```

### Interactive States
```tsx
// Hover
<div className="hover:bg-accent hover:text-accent-foreground">

// Focus
<input className="focus:ring-2 focus:ring-ring focus:ring-offset-2">

// Active
<button className="active:scale-95">

// Disabled
<button className="disabled:opacity-50 disabled:cursor-not-allowed">
```

### Transitions
```tsx
// Duration
<div className="transition-all duration-200">    {/* 200ms */}

// Specific properties
<div className="transition-colors">              {/* Color transitions */}
<div className="transition-shadow">              {/* Shadow transitions */}
```

### Dark Mode
```tsx
// Add dark mode variants
<div className="bg-white dark:bg-gray-900">
<p className="text-gray-900 dark:text-gray-100">
```

## Component Structure Template

**File**: `components/BookmarkCard.tsx`

```tsx
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLinkIcon, Trash2Icon } from "lucide-react";

interface BookmarkCardProps {
  id: string;
  title: string;
  description?: string;
  url: string;
  faviconUrl?: string;
  previewImageUrl?: string;
  onDelete?: (id: string) => void;
}

export function BookmarkCard({
  id,
  title,
  description,
  url,
  faviconUrl,
  previewImageUrl,
  onDelete,
}: BookmarkCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {faviconUrl && (
              <img src={faviconUrl} className="w-4 h-4 flex-shrink-0" alt="" />
            )}
            <CardTitle className="text-sm font-medium truncate">
              {title}
            </CardTitle>
          </div>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onDelete(id)}
            >
              <Trash2Icon className="h-3 w-3" />
            </Button>
          )}
        </div>
        {description && (
          <CardDescription className="line-clamp-2 text-xs">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      {previewImageUrl && (
        <CardContent className="pt-0">
          <img
            src={previewImageUrl}
            className="w-full h-32 object-cover rounded-md"
            alt={title}
          />
        </CardContent>
      )}
      <CardFooter className="pt-4">
        <Button variant="ghost" size="sm" className="w-full" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon className="h-3 w-3 mr-2" />
            Open
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
```

## Design Principles

### Consistency
- Use CSS variables for colors (`text-foreground`, not `text-gray-900`)
- Consistent spacing scale (gap-2, gap-4, gap-6, not random values)
- Stick to predefined component variants

### Accessibility
- All interactive elements keyboard accessible
- ARIA labels for icon-only buttons
- Sufficient color contrast (enforced by theme)
- Focus indicators on all inputs

### Performance
- Tailwind purges unused classes automatically
- CSS variables enable instant theme switching
- Minimal custom CSS (use utilities first)

### Mobile-First
- Start with mobile layout, add breakpoints up
- Touch-friendly targets (min 44px tap area)
- Responsive typography and spacing

## Testing Checklist
- [ ] Tailwind CSS installed and configured
- [ ] PostCSS configured correctly
- [ ] shadcn/ui initialized with correct settings
- [ ] Core components installed via CLI
- [ ] Dark mode working (if implemented)
- [ ] Components responsive on mobile/tablet/desktop
- [ ] All interactive states working (hover, focus, active)
- [ ] Accessibility tested (keyboard nav, screen reader)
- [ ] Build successful (no unused class warnings)

## Resources
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [Lucide Icons](https://lucide.dev) (recommended icon library)
