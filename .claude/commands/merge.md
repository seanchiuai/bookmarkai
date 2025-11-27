---
description: Merges one or more branches into the current branch, preserving commit history.
allowed-tools: Bash, TodoWrite
argument-hint: [branch names or 'all' for all feature branches]
---

# Command: /merge

Merge branches into the current branch while preserving commit history.

## Behavior:

1. **If branch name(s) provided**: Merge specified branch(es) into current branch
2. **If 'all' provided**: Merge all feature branches (excluding main) into current branch
3. **If no argument**: Show available branches and ask which to merge

## Process:

1. Check current branch status (must be clean)
2. List branches to merge
3. Create todo list for each branch merge
4. Merge each branch with `git merge <branch> --no-edit`
5. If conflicts occur:
   - Stop and show conflicted files
   - Instruct user to resolve conflicts
   - Wait for user to run `git merge --continue`
6. After successful merge, mark todo as completed
7. Show merge summary

## Safety:

- Never force merge
- Always check for uncommitted changes first
- Preserve all commit history
- Stop on conflicts and wait for user resolution
