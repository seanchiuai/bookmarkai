---
description: Update docs/ by analyzing code with parallel agents
---

# Command: Update Docs

## Current Docs
@docs/api-routes-guide.md
@docs/CHANGELOG.md
@docs/component-patterns.md
@docs/convex-patterns.md
@docs/frontend-architecture.md
@docs/icon-usage.md
@docs/state-management.md
@docs/styling-guide.md
@docs/type-definitions.md

## Task

Use **agent-status-reporter** to analyze project areas **in parallel**:

1. **Components**: `components/` - patterns, props, working/broken
2. **Routes**: `app/` - pages, APIs, features status
3. **Convex**: `convex/` - queries, mutations, schemas
4. **Styles**: CSS/Tailwind patterns and conventions
5. **Config**: Dependencies, build setup, tooling

Each agent:
- Check git history (`git log`, `git diff`) for their area
- Categorize: ✅ Working | ⚠️ Errors | 🚧 Incomplete | 🗑️ Deprecated
- Report findings

Update only the listed documents. For each affected doc:
- Add or revise sections to reflect code changes, new patterns, or fixes.
- Include minimal real code snippets as examples.
- Use status indicators (✅, ⚠️, 🚧, 🗑️) as needed.
- Clearly note any deprecations or removals.
Summarize substantive changes in `docs/CHANGELOG.md`.