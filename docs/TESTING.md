# Testing Strategy

**Bookmark AI** - Comprehensive testing approach

**Version**: 1.0
**Last Updated**: October 24, 2025
**Status**: Ready for Development

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [End-to-End Testing](#end-to-end-testing)
5. [Code Coverage Requirements](#code-coverage-requirements)
6. [Mocking Patterns](#mocking-patterns)
7. [CI/CD Testing Integration](#cicd-testing-integration)

---

## Testing Philosophy

### Testing Pyramid

```
           ╱╲
          ╱  ╲         E2E Tests (10%)
         ╱────╲        - Critical user flows
        ╱      ╲       - Slow, expensive
       ╱────────╲
      ╱          ╲     Integration Tests (30%)
     ╱────────────╲    - API integrations
    ╱──────────────╲   - Auth flow
   ╱                ╲  - Data consistency
  ╱──────────────────╲
 ╱────────────────────╲ Unit Tests (60%)
╱──────────────────────╲ - Functions, components
────────────────────────
```

### Core Principles

1. **Test behavior, not implementation** → Focus on what users see
2. **Write tests alongside features** → TDD for critical logic
3. **Fast feedback loops** → Unit tests run in <5 seconds
4. **Deterministic tests** → No flaky tests allowed
5. **80% coverage minimum** → Track with coverage reports

### What to Test

**✅ Always test**:
- User-facing features (authentication, bookmark CRUD)
- Business logic (URL validation, duplicate detection)
- Data transformations (metadata extraction)
- Error handling (API failures, invalid inputs)
- Edge cases (empty states, max limits)

**❌ Don't test**:
- Third-party libraries (React, Convex)
- Auto-generated code (Convex types)
- Trivial getters/setters
- UI styling (use visual regression testing tools instead)

---

## Unit Testing

### Framework: Jest + React Testing Library

**Note**: The template includes Jest configuration for Next.js.

**Setup**:
```bash
# Install dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
```

**Jest config**:
```javascript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

### Testing Utility Functions

**Example: URL validation**

```typescript
// lib/validators.ts
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
```

**Test file**:
```typescript
// lib/validators.test.ts
import { isValidUrl, extractDomain } from './validators';

describe('isValidUrl', () => {
  it('should return true for valid HTTP URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
    expect(isValidUrl('https://example.com')).toBe(true);
  });

  it('should return true for URLs with paths and queries', () => {
    expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
  });

  it('should return false for invalid URLs', () => {
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });

  it('should return false for javascript: protocol', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });
});

describe('extractDomain', () => {
  it('should extract domain from valid URLs', () => {
    expect(extractDomain('https://example.com/path')).toBe('example.com');
    expect(extractDomain('https://www.example.com')).toBe('www.example.com');
  });

  it('should return empty string for invalid URLs', () => {
    expect(extractDomain('not-a-url')).toBe('');
  });
});
```

### Testing React Components

**Example: BookmarkCard component**

```typescript
// components/bookmarks/bookmark-card.tsx
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Doc } from '@/convex/_generated/dataModel';

interface BookmarkCardProps {
  bookmark: Doc<'bookmarks'>;
  onDelete: (id: string) => void;
}

export function BookmarkCard({ bookmark, onDelete }: BookmarkCardProps) {
  return (
    <Card data-testid="bookmark-card">
      <CardHeader>
        <CardTitle>{bookmark.title}</CardTitle>
      </CardHeader>
      <Button
        onClick={() => onDelete(bookmark._id)}
        data-testid="delete-button"
      >
        Delete
      </Button>
    </Card>
  );
}
```

**Test file**:
```typescript
// components/bookmarks/bookmark-card.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BookmarkCard } from './bookmark-card';

const mockBookmark = {
  _id: 'bookmark-123',
  _creationTime: Date.now(),
  userId: 'user-abc',
  url: 'https://example.com',
  title: 'Test Bookmark',
  description: 'Test description',
  tags: ['test'],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('BookmarkCard', () => {
  it('should render bookmark title', () => {
    render(<BookmarkCard bookmark={mockBookmark} onDelete={jest.fn()} />);
    expect(screen.getByText('Test Bookmark')).toBeInTheDocument();
  });

  it('should call onDelete when delete button clicked', async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();

    render(<BookmarkCard bookmark={mockBookmark} onDelete={onDelete} />);

    const deleteButton = screen.getByTestId('delete-button');
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith('bookmark-123');
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Custom Hooks

**Example: useDebouncedValue hook**

```typescript
// hooks/use-debounced-value.ts
import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

**Test file**:
```typescript
// hooks/use-debounced-value.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useDebouncedValue } from './use-debounced-value';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    // Change value
    rerender({ value: 'updated', delay: 300 });

    // Value should not update immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(result.current).toBe('updated');
    });
  });

  it('should cancel previous timer on rapid changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      { initialProps: { value: 'first', delay: 300 } }
    );

    rerender({ value: 'second', delay: 300 });
    jest.advanceTimersByTime(100);

    rerender({ value: 'third', delay: 300 });
    jest.advanceTimersByTime(100);

    // Should still be initial value
    expect(result.current).toBe('first');

    // Fast-forward full delay
    jest.advanceTimersByTime(200);

    await waitFor(() => {
      expect(result.current).toBe('third');
    });
  });
});
```

---

## Integration Testing

### Testing API Integrations

**Example: Microlink metadata fetching**

```typescript
// convex/bookmarks.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fetchMetadata } from './bookmarks';

// Mock fetch
global.fetch = vi.fn();

describe('fetchMetadata', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch metadata from Microlink API', async () => {
    const mockResponse = {
      data: {
        title: 'Example Site',
        description: 'Example description',
        image: { url: 'https://example.com/image.jpg' },
        logo: { url: 'https://example.com/favicon.ico' },
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchMetadata({ url: 'https://example.com' });

    expect(result).toEqual({
      title: 'Example Site',
      description: 'Example description',
      imageUrl: 'https://example.com/image.jpg',
      faviconUrl: 'https://example.com/favicon.ico',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.microlink.io')
    );
  });

  it('should throw error when API fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(
      fetchMetadata({ url: 'https://example.com' })
    ).rejects.toThrow('Failed to fetch metadata');
  });

  it('should fallback to self-hosted scraper on API failure', async () => {
    // First call fails (Microlink)
    (global.fetch as any).mockRejectedValueOnce(new Error('API down'));

    // Second call succeeds (self-hosted)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      text: async () => '<html><title>Example</title></html>',
    });

    const result = await fetchMetadata({ url: 'https://example.com' });

    expect(result.title).toBe('Example');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
```

### Testing Authentication Flow

**Example: Protected route access**

```typescript
// app/dashboard/page.test.tsx
import { render, screen } from '@testing-library/react';
import { useAuth } from '@clerk/nextjs';
import DashboardPage from './page';

// Mock Clerk
jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
}));

describe('DashboardPage', () => {
  it('should redirect to sign-in when unauthenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isSignedIn: false,
      userId: null,
    });

    render(<DashboardPage />);

    // Should not render dashboard content
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('should render dashboard when authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isSignedIn: true,
      userId: 'user-abc',
    });

    render(<DashboardPage />);

    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });
});
```

### Testing Convex Functions

**Convex Test Helpers**:
```typescript
// convex/testing/helpers.ts
import { Id } from '../_generated/dataModel';

export function createMockBookmark(overrides = {}) {
  return {
    _id: 'bookmark-123' as Id<'bookmarks'>,
    _creationTime: Date.now(),
    userId: 'user-abc',
    url: 'https://example.com',
    title: 'Example',
    description: 'Example description',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function createMockContext(userId = 'user-abc') {
  return {
    auth: {
      getUserIdentity: async () => ({
        subject: userId,
        email: 'user@example.com',
      }),
    },
    db: {
      query: jest.fn(),
      get: jest.fn(),
      insert: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    },
    scheduler: {
      runAfter: jest.fn(),
    },
  };
}
```

**Test Convex mutations**:
```typescript
// convex/bookmarks.test.ts
import { create } from './bookmarks';
import { createMockContext } from './testing/helpers';

describe('bookmarks.create', () => {
  it('should create bookmark with valid URL', async () => {
    const ctx = createMockContext();
    const insertSpy = jest.spyOn(ctx.db, 'insert').mockResolvedValue('bookmark-123');

    const result = await create.handler(ctx as any, {
      url: 'https://example.com',
    });

    expect(result).toBe('bookmark-123');
    expect(insertSpy).toHaveBeenCalledWith('bookmarks', expect.objectContaining({
      userId: 'user-abc',
      url: 'https://example.com',
    }));
  });

  it('should throw error for invalid URL', async () => {
    const ctx = createMockContext();

    await expect(
      create.handler(ctx as any, { url: 'not-a-url' })
    ).rejects.toThrow('Invalid URL format');
  });

  it('should throw error when unauthenticated', async () => {
    const ctx = createMockContext();
    ctx.auth.getUserIdentity = async () => null;

    await expect(
      create.handler(ctx as any, { url: 'https://example.com' })
    ).rejects.toThrow('Unauthorized');
  });
});
```

---

## End-to-End Testing

### Framework: Playwright

**Installation**:
```bash
npm install --save-dev @playwright/test
npx playwright install
```

**Playwright config**:
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Examples

**Test 1: User authentication flow**

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should sign up new user', async ({ page }) => {
    await page.goto('/');

    // Click sign up button
    await page.click('text=Sign Up');

    // Fill in sign up form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Your Bookmarks');
  });

  test('should sign in existing user', async ({ page }) => {
    await page.goto('/sign-in');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/sign-in');

    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('[role="alert"]')).toContainText('Incorrect email or password');
  });
});
```

**Test 2: Bookmark creation flow**

```typescript
// tests/e2e/bookmarks.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Bookmark Management', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in before each test
    await page.goto('/sign-in');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should add new bookmark', async ({ page }) => {
    // Click "Add Bookmark" button
    await page.click('text=Add Bookmark');

    // Fill in URL
    await page.fill('input[name="url"]', 'https://nextjs.org');

    // Wait for metadata to load
    await expect(page.locator('input[name="title"]')).toHaveValue('Next.js', {
      timeout: 5000,
    });

    // Submit form
    await page.click('button[type="submit"]');

    // Should see bookmark in grid
    await expect(page.locator('[data-testid="bookmark-card"]')).toContainText('Next.js');
  });

  test('should edit bookmark', async ({ page }) => {
    // Find bookmark and click edit
    await page.locator('[data-testid="bookmark-card"]').first().hover();
    await page.click('[data-testid="edit-button"]');

    // Update title
    await page.fill('input[name="title"]', 'Updated Title');
    await page.click('button[type="submit"]');

    // Should see updated title
    await expect(page.locator('[data-testid="bookmark-card"]')).toContainText('Updated Title');
  });

  test('should delete bookmark', async ({ page }) => {
    const bookmarkCount = await page.locator('[data-testid="bookmark-card"]').count();

    // Find bookmark and click delete
    await page.locator('[data-testid="bookmark-card"]').first().hover();
    await page.click('[data-testid="delete-button"]');

    // Confirm deletion
    await page.click('text=Confirm');

    // Should have one less bookmark
    await expect(page.locator('[data-testid="bookmark-card"]')).toHaveCount(bookmarkCount - 1);
  });
});
```

**Test 3: AI chat flow**

```typescript
// tests/e2e/ai-chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AI Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in and add test bookmarks
    await page.goto('/sign-in');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');

    // Add test bookmark
    await page.click('text=Add Bookmark');
    await page.fill('input[name="url"]', 'https://react.dev');
    await page.click('button[type="submit"]');
  });

  test('should answer questions about bookmarks', async ({ page }) => {
    // Open AI chat
    await page.click('[data-testid="ai-chat-toggle"]');

    // Type question
    await page.fill('[data-testid="chat-input"]', 'what did I save about React?');
    await page.press('[data-testid="chat-input"]', 'Enter');

    // Wait for AI response
    await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('React', {
      timeout: 10000,
    });

    // Should include citation
    await expect(page.locator('[data-testid="chat-message"]').last()).toContainText('[1]');
  });

  test('should handle no results', async ({ page }) => {
    await page.click('[data-testid="ai-chat-toggle"]');

    await page.fill('[data-testid="chat-input"]', 'find resources about Rust programming');
    await page.press('[data-testid="chat-input"]', 'Enter');

    await expect(page.locator('[data-testid="chat-message"]').last()).toContainText(
      "didn't find any bookmarks",
      { timeout: 10000 }
    );
  });
});
```

---

## Code Coverage Requirements

### Coverage Thresholds

```json
// jest.config.js
{
  "coverageThreshold": {
    "global": {
      "statements": 80,
      "branches": 80,
      "functions": 80,
      "lines": 80
    }
  }
}
```

### Running Coverage Reports

```bash
# Generate coverage report
npm test -- --coverage

# View HTML report
open coverage/lcov-report/index.html
```

### Coverage Enforcement

**Pre-commit hook** (Husky):
```bash
# .husky/pre-commit
npm test -- --coverage --passWithNoTests
```

**CI/CD pipeline**:
```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: npm test -- --coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
```

---

## Mocking Patterns

### Mocking Convex Hooks

```typescript
// tests/mocks/convex.ts
import { vi } from 'vitest';

export const mockUseQuery = vi.fn();
export const mockUseMutation = vi.fn();
export const mockUseAction = vi.fn();

vi.mock('convex/react', () => ({
  useQuery: mockUseQuery,
  useMutation: mockUseMutation,
  useAction: mockUseAction,
}));
```

**Usage in tests**:
```typescript
import { mockUseQuery, mockUseMutation } from '../mocks/convex';

describe('BookmarkGrid', () => {
  it('should display bookmarks', () => {
    mockUseQuery.mockReturnValue([
      { _id: 'bookmark-1', title: 'Bookmark 1' },
      { _id: 'bookmark-2', title: 'Bookmark 2' },
    ]);

    render(<BookmarkGrid />);

    expect(screen.getByText('Bookmark 1')).toBeInTheDocument();
    expect(screen.getByText('Bookmark 2')).toBeInTheDocument();
  });
});
```

### Mocking OpenAI API

```typescript
// tests/mocks/openai.ts
import { vi } from 'vitest';

export const mockCreateEmbedding = vi.fn().mockResolvedValue({
  data: [{ embedding: new Array(1536).fill(0.1) }],
});

export const mockCreateChatCompletion = vi.fn().mockResolvedValue({
  choices: [{ message: { content: 'AI response' } }],
});

vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: mockCreateEmbedding,
    },
    chat: {
      completions: {
        create: mockCreateChatCompletion,
      },
    },
  })),
}));
```

### Mocking Clerk

```typescript
// tests/mocks/clerk.ts
import { vi } from 'vitest';

export const mockUseAuth = vi.fn().mockReturnValue({
  isSignedIn: true,
  userId: 'user-abc',
});

vi.mock('@clerk/nextjs', () => ({
  useAuth: mockUseAuth,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));
```

---

## CI/CD Testing Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, dev]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Run Playwright tests
        run: npx playwright test

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

### Test Scripts

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:all": "npm test && npm run test:e2e"
  }
}
```

---

## Summary

This testing strategy document covers:
- ✅ Testing philosophy (pyramid, principles)
- ✅ Unit testing (Jest, React Testing Library, Convex functions)
- ✅ Integration testing (API integrations, auth flow)
- ✅ E2E testing (Playwright, critical user flows)
- ✅ Code coverage requirements (80% minimum)
- ✅ Mocking patterns (Convex, OpenAI, Clerk)
- ✅ CI/CD integration (GitHub Actions, automated testing)

**Key Principles**:
1. **60% unit, 30% integration, 10% E2E** → Test pyramid
2. **80% coverage minimum** → Enforce in CI/CD
3. **Fast feedback** → Unit tests <5s, E2E tests <2min
4. **Deterministic** → No flaky tests
5. **Test behavior** → Focus on user outcomes

**Next Steps**: Write tests alongside features for Bookmark AI following these patterns.
