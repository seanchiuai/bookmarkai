# BookmarkAI Frontend Guidelines

This document outlines the frontend architecture, design principles, and technologies powering BookmarkAI. It’s written in everyday language so anyone can understand how the frontend is set up, how it looks and feels, and how it stays fast, reliable, and easy to maintain.

---

## 1. Frontend Architecture

**Frameworks & Libraries**
- **Next.js 15 (App Router)**: Provides server-side rendering (SSR), file-based routing, layouts, and server actions out of the box.  
- **React (with Server & Client Components)**: Enables clean separation of data-fetching logic (server components) and interactive UI (client components).  
- **Tailwind CSS 4**: A utility-first CSS framework for rapid styling without leaving your HTML/JSX.  
- **shadcn/ui**: A collection of pre-built, accessible React components styled with Tailwind.  
- **Clerk**: Handles user sign-up, sign-in, and session management with pre-built UI components and middleware.  
- **Convex**: Real-time database and serverless functions platform. The frontend uses Convex’s `useQuery` and `useMutation` hooks to fetch and update data in real time.  
- **TypeScript**: Enforces types across the entire stack (frontend, backend functions, shared utilities) to catch errors early and improve developer experience.

**How It Supports Scalability, Maintainability, and Performance**
- **Modular Folder Structure**: Separates routes (`app/`), UI components (`components/`), utilities (`lib/`), and serverless logic (`convex/`), making it easy to locate and extend features.  
- **Server Components & Server Actions**: Offload data-intensive tasks—like fetching URL metadata or running video transcription logic—directly to the server, keeping the client bundle small and fast.  
- **Real-Time Updates**: Convex subscriptions automatically push data changes (e.g., new bookmarks) to the UI, eliminating manual refreshes and complex WebSocket setups.  
- **Type Safety End to End**: TypeScript ensures that data shapes match between Next.js, Convex functions, and React components, reducing runtime errors as the app grows.

---

## 2. Design Principles

1. **Usability**:  
   - Simple, focused screens (e.g., a one-screen dashboard for bookmarks).  
   - Clear calls to action (buttons, forms) using `shadcn/ui` styles.  
2. **Accessibility**:  
   - All interactive elements include proper ARIA labels and keyboard focus states.  
   - Color choices meet WCAG 2.1 AA contrast standards.  
   - `shadcn/ui` components come with built-in accessibility best practices.  
3. **Responsiveness**:  
   - Mobile-first design with Tailwind’s responsive utilities.  
   - Layouts adjust from narrow phone screens (single column) up to wide desktop views (sidebar + content).  
4. **Consistency**:  
   - A unified design language via Tailwind and a custom dark theme.  
   - Reusable components ensure the same UI patterns (modals, forms, cards) appear throughout.

**Applied in UI**
- Forms and lists resize gracefully.  
- Navigation remains reachable (hamburger menu on mobile, sidebar on desktop).  
- Error and success states use consistent colors and iconography.  

---

## 3. Styling and Theming

**Styling Approach**
- **Utility-First**: Tailwind CSS provides atomic classes (e.g., `p-4`, `bg-gray-900`, `text-white`) directly in JSX.  
- **Component Styling**: `shadcn/ui` components are customized via Tailwind config and class overrides.  
- **No BEM/SMACSS**: Utility classes replace the need for traditional CSS naming conventions.

**Theming**
- **Dark-Mode-First**: Base colors and surfaces are dark; light mode can be added if needed.  
- Defined in `tailwind.config.ts` under `theme.extend.colors`.

**Visual Style**
- Modern, flat design with subtle shadows and rounding.  
- Focus on clarity: minimal ornamentation, sharp typography, and consistent spacing.

**Color Palette**
- Background: `#121212`  
- Surface (cards, modals): `#1E1E1E`  
- Primary: `#3B82F6` (blue-500)  
- Secondary: `#EC4899` (pink-500)  
- Accent: `#10B981` (green-500)  
- Text Primary: `#E5E7EB` (gray-200)  
- Text Secondary: `#9CA3AF` (gray-400)  
- Error: `#F87171` (red-400)

**Font**
- **Primary**: Inter (or system UI sans-serif fallback).  
- **Fallback**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`.

---

## 4. Component Structure

**Folder Organization**
```
components/          # App-specific components
  ├─ BookmarkCard/   # Card showing a bookmark’s metadata
  ├─ BookmarkDashboard/  # Main page with search, filters, list
  ├─ AddBookmarkForm/    # URL input and submit button
  ├─ CollectionManager/  # Create/edit/delete collections UI
  ├─ TagManager/         # Create/edit/delete tags UI
  ├─ TranscriptViewer/   # Shows video transcripts (placeholder)
  ├─ AppSidebar/         # Navigation links
  └─ ConvexClientProvider/  # Wraps app to provide Convex client + Clerk context

components/ui/        # shadcn/ui overrides and extensions
```

**Reuse & Maintainability**
- Each component lives in its own folder with `index.tsx` and optional style/test files.  
- Props define data and event handlers; internal state is minimized.  
- Utility components (buttons, inputs) come from `components/ui` and are reused everywhere.

**Why Component-Based?**
- Encapsulation: Styles and logic scoped to each piece.  
- Reusability: Share the same button or form pattern in multiple places.  
- Testability: Isolated components are easier to write unit tests for.

---

## 5. State Management

- **Convex Hooks**:  
  - `useQuery('bookmarks.list')` to subscribe to bookmark lists in real time.  
  - `useMutation('bookmarks.create')`, `...update`, `...delete` for data changes.  
- **Local Component State**:  
  - `useState` for form inputs, modals open/closed, and transient UI flags (e.g., loading spinners).  
- **Context API**:  
  - `ConvexClientProvider` uses React Context to share the Convex client (authenticated via Clerk) across the tree.

This combination keeps global data in Convex (real time, shared) and UI-specific state local to components.

---

## 6. Routing and Navigation

- **Next.js App Router**:  
  - **File-based**: Folders under `app/` become routes:  
    - `app/bookmarks/` → `/bookmarks`  
    - `app/organize/` → `/organize`  
  - **Layouts**: `app/layout.tsx` defines the common page shell (sidebar, header).  
  - **Server Components**: Default page and layout files can fetch data on the server.  
- **Protected Routes**:  
  - Clerk middleware in `middleware.ts` guards any route that requires an authenticated user.  
- **Linking & Navigation**:  
  - Next.js `Link` component for client-side transitions.  
  - Sidebar with active-state highlighting.

Users move fluidly between the dashboard, organization pages, and settings without full page reloads.

---

## 7. Performance Optimization

1. **Server Components & Server Actions**  
   - Keep heavy logic (metadata extraction, transcription calls) off the main bundle.  
2. **Automatic Code Splitting**  
   - Next.js splits each page and dynamic import into its own chunk.  
3. **Lazy Loading**  
   - Dynamically import non-critical components (e.g., `TranscriptViewer` placeholder).  
4. **Asset Optimization**  
   - Next.js Image component for optimized, responsive images (favicons, preview images).  
   - Purge unused CSS via Tailwind’s built-in purge in production.  
5. **Real-Time Subscriptions**  
   - Only data needed by the current view is fetched and kept in sync, reducing over-fetching.

Together, these strategies keep initial page loads quick and sub-sequent interactions feel instantaneous.

---

## 8. Testing and Quality Assurance

**Linting & Formatting**
- **ESLint**: Enforces code style, catches common bugs, including Convex and Next.js best-practice rules.  
- **Prettier**: Automatic code formatting for consistent style.

**Unit & Integration Tests** (Recommended Setup)
- **Jest + React Testing Library**:  
  - Test component rendering, user interactions, and local state.  
  - Mock Convex hooks (`useQuery`, `useMutation`) to simulate data.  
- **Testing Utilities**: Create shared mocks for metadata extraction and Clerk auth state.

**End-to-End Tests**
- **Playwright** or **Cypress**:  
  - Automate key flows: sign-in, add a bookmark, edit tags, search, and filter.  
  - Run against a staging environment seeded with test data.

**Convex Function Tests**
- Write simple integration tests against a local Convex emulator (if available) or sandbox to verify queries/mutations behave as expected.

Regular code reviews, paired with automated CI checks (lint, build, test), ensure ongoing code quality.

---

## 9. Conclusion and Overall Frontend Summary

BookmarkAI’s frontend is built on modern, proven tools—Next.js, React, Tailwind CSS, shadcn/ui, Clerk, and Convex—glued together with TypeScript for type safety. This setup ensures:

- **Scalability**: Modular folders, server actions, and real-time subscriptions let the app grow feature by feature without becoming unwieldy.  
- **Maintainability**: Clear separation of concerns (routes vs. components vs. utilities) and reusable UI elements speed up development and reduce bugs.  
- **Performance**: SSR, code splitting, lazy loading, and optimized assets deliver fast load times and snappy interactions.  
- **Accessibility & Usability**: Built-in ARIA support, responsive layouts, and a dark-mode-first design make BookmarkAI friendly for all users.

Unique aspects—like real-time updates via Convex and Next.js Server Actions for metadata extraction—set BookmarkAI apart, giving it both developer agility and end-user responsiveness. These guidelines should help current and future contributors understand and extend the frontend with confidence.