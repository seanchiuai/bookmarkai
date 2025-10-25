# Contributing Guidelines

**Bookmark AI** - GitHub Contribution Standards

**Version:** 1.1  
**Last Updated:** October 24, 2025

---

## Table of Contents

1. [Git Workflow](#git-workflow)  
2. [Branching Rules](#branching-rules)  
3. [Commit Conventions](#commit-conventions)  
4. [Pull Request Process](#pull-request-process)  
5. [Automated PR Checks](#automated-pr-checks)  
6. [Code Review](#code-review)  
7. [Branch Protection](#branch-protection)

---

## Git Workflow

We use **GitHub Flow** — a simple and clean process that ensures all work is reviewed and tested before it’s merged.

**Rules:**
1. `main` branch is always deployable. No direct commits allowed.  
2. All work happens in **feature branches**.  
3. Each change requires a **pull request (PR)**.  
4. CI checks must pass before merging.  
5. Squash and merge only — to keep history clean.

### Example Flow
```bash
git checkout main
git pull origin main
git checkout -b feature/add-bookmark-crud
# ... make changes ...
git add .
git commit -m "feat(bookmarks): add CRUD operations"
git push origin feature/add-bookmark-crud
gh pr create --title "feat(bookmarks): add CRUD operations" --body "Implements core CRUD functionality."
```

---

## Branching Rules

| Type | Prefix | Example |
|------|---------|---------|
| Feature | `feature/` | `feature/bookmark-import` |
| Fix | `fix/` | `fix/metadata-timeout` |
| Docs | `docs/` | `docs/update-readme` |
| Refactor | `refactor/` | `refactor/api-schema` |
| Chore | `chore/` | `chore/dependency-updates` |

**Naming rules:**
- Lowercase only, words separated by hyphens.  
- Keep under 50 characters.  
- Reference issue number if applicable.  

---

## Commit Conventions

We follow the **Conventional Commits** standard.

**Format:**
```
<type>(<scope>): <subject>
```

**Examples:**
```
feat(auth): add Clerk sign-in
fix(api): handle Convex query timeout
docs(readme): update setup instructions
```

**Allowed types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`.

---

## Pull Request Process

1. **Ensure branch is up to date:**
   ```bash
   git checkout main
   git pull origin main
   git checkout feature/my-feature
   git merge main
   ```

2. **Run local checks:**
   ```bash
   npm run lint
   npm run type-check
   npm test
   npm run build
   ```

3. **Push and open PR:**
   ```bash
   git push origin feature/my-feature
   gh pr create --title "feat: add bookmark CRUD" --body "Implements CRUD functionality for bookmarks."
   ```

4. **PR Requirements:**
   - ✅ All automated checks must pass.  
   - ✅ At least one approval required.  
   - ✅ PR title follows Conventional Commit format.  
   - ✅ No console errors or broken builds.  
   - ✅ Vercel preview link generated.

5. **Merge:**
   - Use **Squash and merge** only.  
   - Delete branch after merge.  
   - CI/CD deploys automatically.

---

## Automated PR Checks

Every PR triggers a GitHub Actions workflow that must pass before merging.

**Checks include:**
- **Type Check:** ensures TypeScript safety.
- **Lint Check:** ensures consistent code style.  
- **Unit Tests:** must pass with ≥80% coverage.  
- **E2E Smoke Tests:** verify core user flow (login → CRUD → result).  
- **Contract Tests:** confirm API & schema alignment.  
- **Build Check:** ensures app builds successfully.  
- **Secret Scan:** detects exposed API keys or `.env` leaks.  
- **Preview Deploy:** auto-deploys PR to Vercel and comments the live link.

**If any check fails, the PR cannot merge.**

---

## Code Review

- At least one reviewer approval required.  
- Reviewers verify:
  - Code readability and maintainability.  
  - Proper typing, no hardcoded values.  
  - All CI checks pass.  
  - Tests exist for new functionality.  
- Review feedback must be resolved before merging.

**Example of constructive feedback:**
> Consider extracting this logic into a separate hook for reusability.

---

## Branch Protection

The following protections are enforced on `main`:
- ✅ Require pull request before merging.  
- ✅ Require all checks to pass.  
- ✅ Require at least one approval.  
- ✅ Enforce linear history (squash merges).  
- ✅ Prevent force pushes and deletions.

---

**Summary:**
- Pull requests are mandatory for all code changes.  
- CI ensures build, tests, and security checks pass automatically.  
- Branch protection rules keep `main` stable.  
- Reviews ensure human or agent accountability.

**Thank you for contributing to Bookmark AI!**

