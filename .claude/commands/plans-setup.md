---
description: Creates implementation plans for your project based on features that are missing or things that need to be fixed
argument-hint: [CHANGELOG.md, PRD.json, specific featues you want implemented/fixed/changed]
---

# Command: Plans Setup

Create plan files for each specific feature under .claude/plans/ based on the current state of the project and the user's request

Notes:
- Plans are created with kebab-case naming: `agent-feature-name.md`
- Do not assume the app's status. Understand the current state of the app with `CHANGELOG.md`, directly reading codefiles, and 
- Use skill `feature-research` to create plans
- Use agents to obtain information about a specific technology used