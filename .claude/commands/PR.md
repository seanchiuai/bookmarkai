---
description: Creates a Pull Request on GitHub
argument-hint: [PR title and description (optional)]
---

# Command: PR

Create a Pull Request for the current branch. 

Steps:
1. Check git status and ensure changes are committed (if not, stage and commit them with an appropriate message)
2. Push the current branch to remote
3. Create a PR using GitHub CLI (gh pr create) with an informative title and description
4. If no title is provided by user, generate one based on the commit messages
5. Set appropriate base branch (usually main or master)

If there are conflicts or issues, explain what is going on and give me a few options including your recommended option. No need for user confirmation for simple operations.

If GitHub CLI is not installed, provide clear instructions on how to install it or alternative methods to create the PR.

