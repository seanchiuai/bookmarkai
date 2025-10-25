---
description: Organize markdown files that log or describe implementation plans created anywhere other than the /docs folder
allowed-tools: Bash, Edit
argument-hint: []
---

# Command: /organize

Purpose: Organize markdown files that log or describe implementation plans created anywhere other than the `/docs` folder.

**Protected Files**: This command will NOT touch files named `CLAUDE.md`, `SETUP.md`, `README.md`, or files in the `.claude` folder.

Actions
1) Documentation Files
   - Look for markdown files describing implementations, plans, or logs that are misplaced (not in `/docs` folder)
   - Move implementation plan files to `/docs/logs`
   - Merge duplicate files that describe the same features so there is only one file for each feature under `/docs/logs`
   - Rename log files that don't match this format: `log-[TITLE].md`
   - Delete any logs that are not needed anymore and update based on the status of the current app
   - Make sure the logs document what has been done and what hasn't

2) App Routes
   - Live routes: `app/<segment>` with `page.tsx` or `layout.tsx` (exclude `app/_archive`); these map to URL directories
   - Visible routes: links/buttons found in `app/page.tsx` and nav components (`components/nav-main.tsx`, `components/app-sidebar.tsx`, `components/site-header.tsx`, `components/AppShell.tsx`)
   - Report hidden routes (live but not linked), suggesting insertion points
   - Detect duplicate or similar features across URL directories (by route path and page content); when applying, perform safe, non-conflicting merges of overlapping URL routes. Never auto-edit navigation

Report
- Summary of moved, renamed, or merged markdown files, hidden routes, and URL-level duplicates or similarities