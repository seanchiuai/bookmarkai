# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Claude Code Instructions

### Custom Agents and Plans
In the `/.claude` folder, there is the agents and plans folder:
- **`.claude/agents`** - Contains custom agent definitions for specialized tasks
  - Before implementing features, check if a relevant agent exists in this directory
  - Invoke custom agents using the Task tool when their expertise matches the request
  - Each agent file defines its purpose, when to use it, and expected behavior
  - If no matching agent exists, proceed with the task normally
- **`.claude/plans`** - Contains initial implementation plans for version 1 project setup ONLY
  - These plans are used exclusively when executing the `/cook` command for first-time project initialization
  - **DO NOT modify, add, or remove files from this folder during normal development**
  - This folder is for bootstrapping the project structure only

**IMPORTANT**: Always check the `/agents` directory when starting a new feature or task - custom agents provide project-specific expertise and tested approaches. The `.claude/plans` folder is ONLY for initial project setup via `/cook` command and should not be modified during normal development.

### Project Documentation Reference
Before implementing features or making changes, consult the relevant documentation in `/docs`:
- **`docs/APP_FLOW.md`** - Application flow, user journeys, and navigation patterns
  - Refer to this when implementing navigation, routing, or understanding the user experience
- **`docs/ARCHITECTURE.md`** - System architecture, design patterns, and technical decisions
  - Consult when making architectural changes or understanding system organization
- **`docs/BACKEND_STRUCTURE.md`** - Backend structure, API patterns, and server-side organization
  - Reference when working with Convex functions, database queries, or backend logic
- **`docs/FRONTEND_GUIDELINES.md`** - Frontend coding standards, component patterns, and UI best practices
  - Follow when creating new components, pages, or UI features
- **`docs/TECH_STACK.md`** - Technology stack details, versions, and integration patterns
  - Check when adding new dependencies or understanding technology choices
- **`docs/FEATURES.md`** - Feature specifications and implementation details
  - Review when implementing or modifying features
- **`docs/PRD.md`** - Product requirements and business logic
  - Understand business goals and requirements before implementing features
- **`docs/TESTING.md`** - Testing strategy, patterns, and best practices
  - Follow when writing tests or implementing testable code
- **`docs/TROUBLESHOOTING.md`** - Common issues, solutions, and debugging tips
  - Check first when encountering errors or unexpected behavior
- **`docs/CHANGELOG.md`** - Project history and changes over time
  - Review to understand recent changes and evolution
- **`docs/CONTRIBUTING.md`** - Contribution guidelines and development workflows
  - Follow when making contributions or understanding the development process

**IMPORTANT**: Always check these documentation files when starting work. They contain project-specific context, decisions, and patterns that should guide your implementation.

### Logging and Documentation
When implementing features or making changes, log your work in the appropriate location:
- **`docs/CHANGELOG.md`** - Log all significant changes, features, bug fixes, and updates
  - Add entries with date, change type (Added/Changed/Fixed/Removed), and brief description
  - Keep the most recent changes at the top
- **Feature Documentation** - Document new features and complex implementations
  - Add feature specifications to `docs/FEATURES.md`
  - Include purpose, implementation details, and usage examples
  - **DO NOT create files in `.claude/plans`** - that folder is for initial project setup only
- **Troubleshooting Solutions** - When you solve a complex issue or error
  - Add the solution to `docs/TROUBLESHOOTING.md` with clear problem description and fix
  - Help future developers encountering the same issue
- **Architecture Decisions** - When making significant architectural changes
  - Document the decision, rationale, and alternatives considered in `docs/ARCHITECTURE.md`
- **API/Function Documentation** - When creating new backend functions
  - Add inline JSDoc comments in the code itself
  - Document complex patterns in `docs/BACKEND_STRUCTURE.md`

**IMPORTANT**: 
- Always update `docs/CHANGELOG.md` after completing feature implementations or bug fixes. This maintains a clear project history.
- **NEVER create random markdown files in the project root directory**. All documentation must go in the appropriate `/docs` folder.
- **NEVER create, modify, or delete files in `.claude/plans`** - this folder is exclusively for initial project setup via `/cook` command.
- Do not create temporary log files, notes, or implementation summaries in the root. Use the existing documentation structure.
- If you need to document something, add it to the relevant existing file in `/docs` or create a new file in the appropriate `/docs` subfolder.

## Commands

### Custom Claude Commands
- `/cook` - Execute all plans in the `.claude/plans` folder for VERSION 1 project initialization ONLY
  - This command is for bootstrapping the initial project structure from predefined plans
  - Plans are named `feature-[feature-name]-plan.md`
  - Uses agents from `.claude/agents` folder for implementation
  - **Only use this command for first-time project setup, not for ongoing development**
- `/organize` - Organize markdown files that log or describe implementation plans created anywhere other than the `/docs` folder
  - Will NOT touch files named `CLAUDE.md`, `SETUP.md`, `README.md`, or files in the `.claude` folder
  - Moves documentation files to appropriate locations and identifies hidden/duplicate routes
- `/setup` - Set up the project for first-time use by following setup instructions
- `/push` - Pull latest from GitHub and push all relevant changes

### Development
- `npm run dev` - Runs both Next.js frontend and Convex backend in parallel
  - Frontend: http://localhost:3000
  - Convex dashboard opens automatically
- `npm run dev:frontend` - Run only Next.js frontend with Turbopack
- `npm run dev:backend` - Run only Convex backend

### Build & Production
- `npm run build` - Build Next.js for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Convex
- `npx convex dev` - Start Convex development server (auto-started with `npm run dev`)
- `npx convex deploy` - Deploy Convex functions to production

## Architecture

This is a full-stack TypeScript application using:

### Frontend
- **Next.js 15** with App Router - React framework with file-based routing in `/app`
- **Tailwind CSS 4** - Utility-first styling with custom dark theme variables
- **shadcn/ui** - Pre-configured component library
- **Clerk** - Authentication provider integrated via `ClerkProvider` in app/layout.tsx

### Backend
- **Convex** - Real-time backend with:
  - Database schema defined in `convex/schema.ts`
  - Server functions in `convex/` directory (myFunctions.ts, todos.ts)
  - Auth config in `convex/auth.config.ts` (requires Clerk JWT configuration)

### Key Integration Points
- **ConvexClientProvider** (components/ConvexClientProvider.tsx) wraps the app with `ConvexProviderWithClerk` to integrate Convex with Clerk auth
- **Middleware** (middleware.ts) protects `/server` routes using Clerk
- Path aliases configured: `@/*` maps to root directory

## Setup Requirements

### Environment Variables
```env
NEXT_PUBLIC_CONVEX_URL=<your-convex-deployment-url>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<clerk-publishable-key>
CLERK_SECRET_KEY=<clerk-secret-key>
```

### Clerk JWT Configuration
1. Create a JWT template named "convex" in Clerk dashboard
2. Set issuer domain in the template
3. Add `CLERK_JWT_ISSUER_DOMAIN` environment variable in Convex dashboard

## Project Structure
- `/app` - Next.js pages and layouts (App Router)
  - `/app/(auth)` - Authentication pages if needed
  - `/app/(protected)` - Protected routes requiring authentication
- `/components` - React components including sidebar and UI components
- `/convex` - Backend functions, schema, and auth configuration
  - `schema.ts` - Database schema definition
  - `auth.config.ts` - Clerk authentication configuration
- `/docs` - Project documentation (use this for all documentation needs)
- `/public` - Static assets including custom fonts
- `/.claude/agents` - Custom Claude Code agent definitions for specialized tasks
- `/.claude/plans` - Initial project setup plans (DO NOT MODIFY - for `/cook` command only)
- `middleware.ts` - Route protection configuration

## Key Architecture Patterns
- Uses TypeScript with strict mode enabled
- Path aliases configured with `@/*` mapping to root directory
- Components follow React patterns with Tailwind CSS for styling
- Real-time data synchronization with Convex
- JWT-based authentication with Clerk
- Custom hooks for framework integration
- ESLint configuration for code quality

## Authentication & Security
- Protected routes using Clerk's authentication in middleware.ts
- User-specific data filtering at the database level in Convex
- JWT tokens with Convex integration
- ClerkProvider wraps the app in app/layout.tsx
- ConvexClientProvider integrates Convex with Clerk auth

## Backend Integration
- Convex provides real-time database with TypeScript support
- All mutations and queries are type-safe
- Automatic optimistic updates and real-time sync
- Row-level security ensures users only see their own data
- Use `useQuery`, `useMutation`, and `useAction` hooks in Next.js components

## Styling Approach
- Tailwind CSS 4 with custom dark theme variables
- shadcn/ui component library for pre-built components
- Responsive design with mobile-first approach
- Consistent design system across the application

## API Key Management
When implementing features that require API keys:
1. Ask the user to provide the API key
2. Add the key to `.env.local` file yourself (create the file if it doesn't exist)
3. Update `.env.example` with a placeholder entry for documentation
4. Never ask the user to manually edit environment files - handle it for them

## Convex Backend Development
**IMPORTANT**: When implementing any features or changes that involve Convex:
- ALWAYS refer to and follow the guidelines in `convexGuidelines.md`
- This file contains critical best practices for:
  - Function syntax (queries, mutations, actions, internal functions)
  - Validators and type safety
  - Schema definitions and index usage
  - File storage patterns
  - Scheduling and cron jobs
  - Database queries and performance optimization
- Following these guidelines ensures type safety, proper security, and optimal performance
- Never deviate from these patterns without explicit user approval

## Modular Code Best Practice
**IMPORTANT**: Write modular, reusable code to optimize token usage and maintainability:
- Break down large pages into smaller, focused components
- Extract reusable UI elements into separate component files
- Keep pages concise by delegating logic to components and hooks
- Avoid pages that are thousands of lines long - this saves tokens and improves code quality

## UI-First Implementation Approach
**IMPORTANT**: When implementing new features or screens:
1. **Build the UI first** - Create the complete visual interface with all elements, styling, and layout
2. **Match existing design** - New designs should closely match the existing UI screens, pages, and components, unless otherwise stated by the user
3. **Then add functionality** - After the UI is in place, implement the business logic, state management, and backend integration
4. This approach ensures a clear separation of concerns and makes it easier to iterate on both design and functionality independently

## Debugging Best Practices
**IMPORTANT**: When encountering errors or issues:

### Research First
- Use codebase_search (context7 MCP) to find similar errors, stack traces, or problems in the codebase
- Use web search to consult official API documentation (Next.js, Convex, Clerk, library docs)
- Check if a `TROUBLESHOOTING.md` file exists in the project root or docs folder
- Search the existing codebase for how similar functionality is implemented

### When User Reports Code Doesn't Work
If code appears correct but user says it doesn't work or doesn't exist:
1. **Use `read_file` to verify** - Don't assume, check what's actually in the file
2. **Check paths and imports** - Verify file location, import paths, and exports are correct
3. **Clear cache** - Suggest `rm -rf .next` and restart dev server; ensure `npx convex dev` is running
4. **Verify environment** - Check `.env.local` exists with correct values
5. **Check runtime** - Ask for browser console errors, check middleware/auth aren't blocking access
6. **Test incrementally** - Add logging, isolate the problem, verify each layer separately

**Never assume the code is correct** - If the user reports an issue, there IS an issue. Investigate thoroughly rather than defending the implementation.