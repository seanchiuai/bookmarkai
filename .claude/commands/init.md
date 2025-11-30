---
description: Initializes the project with the PRD
argument-hint: [PRD.json]
---

# Command: Initialize Project

This command performs a complete project initialization based on the provided PRD (Product Requirements Document). It will:
1. Create agents for your tech stack
2. Create implementation plans for features
3. Update CLAUDE.md based on project structure
4. Update README.md to match the PRD

## Step 1: Create Agents for Tech Stack

If not already existing, create agents and plans under .claude/agents/ for each tool in the tech stack describes in the mentioned document.

Notes:
- Agents are created with kebab-case naming: `agent-feature-name.md`
- Agents should be specific to technologies used like APIs or frameworks rather than features.
- Use skill `agent-creating` to create agents
- Always use context7 for the latest information, documentation, and best practices. If context7 MCP is not available. STOP and ask the user to install it. Do not proceed without using the MCP.

## Step 2: Create Implementation Plans

Create plan files for each specific feature under .claude/plans/ based on the current state of the project and the user's request

Notes:
- Plans are created with kebab-case naming: `agent-feature-name.md`
- Do not assume the app's status. Understand the current state of the app with `CHANGELOG.md`, directly reading codefiles, and 
- Use skill `feature-research` to create plans
- Use agents to obtain information about a specific technology used

## Step 3: Update CLAUDE.md

### Current Claude.md State
@CLAUDE.md

### Your Task for CLAUDE.md

Based on the current CLAUDE.md content and the PRD file, create an updated CLAUDE.md file that:

#### 1. Preserves Important Existing Content
- Keep the core project template description and architecture
- Preserve key architectural decisions and patterns
- Keep essential development workflow information

#### 2. Integrates Recent Changes
Analyze the git diff and logs to identify:
- **New Features**: What new functionality was added?
- **API Changes**: New endpoints, modified routes, updated parameters
- **Configuration Updates**: Changes to build tools, dependencies, environment variables
- **File Structure Changes**: New directories, moved files, deleted components
- **Database Changes**: New models, schema updates, migrations
- **Bug Fixes**: Important fixes that affect how the system works
- **Refactoring**: Significant code reorganization or architectural changes

#### 3. Updates Key Sections
Intelligently update these CLAUDE.md sections:

##### Project Overview
- Update description if scope changed
- Note new technologies or frameworks added
- Update version information

##### Architecture
- Document new architectural patterns
- Note significant structural changes
- Update component relationships

##### Setup Instructions  
- Add new environment variables
- Update installation steps if dependencies changed
- Note new configuration requirements

##### API Documentation
- Add new endpoints discovered in routes
- Update existing endpoint documentation
- Note authentication or parameter changes

##### Development Workflow
- Update based on new scripts in package.json
- Note new development tools or processes
- Update testing procedures if changed

##### Recent Changes Section
Add a "Recent Updates" section with:
- Summary of major changes from git analysis
- New features and their impact
- Important bug fixes
- Breaking changes developers should know about

##### File Structure
- Update directory explanations for new folders
- Note relocated or reorganized files
- Document new important files

#### 4. Smart Content Management
- **Don't duplicate**: Avoid repeating information already well-documented
- **Prioritize relevance**: Focus on changes that affect how developers work with the code
- **Keep it concise**: Summarize rather than listing every small change
- **Maintain structure**: Follow existing CLAUDE.md organization
- **Add timestamps**: Note when major updates were made

#### 5. Output Format
Provide the complete updated CLAUDE.md content, organized as:

```markdown
# Project Name

## Overview
[Updated project description]

## Architecture
[Updated architecture information]

## Setup & Installation
[Updated setup instructions]

## Development Workflow
[Updated development processes]

## API Documentation
[Updated API information]

## File Structure
[Updated directory explanations]

## Recent Updates (Updated: YYYY-MM-DD)
[Summary of recent changes]

## Important Notes
[Key information for developers]
```

## Step 4: Update README.md

Based on the provided PRD and the current project state, update README.md to:

### 1. Align with PRD
- Update project title and description to match PRD
- Reflect the features and functionality outlined in the PRD
- Ensure technical stack matches what's described in the PRD
- Update project goals and objectives

### 2. Structure README.md
Provide a complete, well-structured README.md with:

```markdown
# [Project Name from PRD]

## Overview
[Project description from PRD]

## Features
[List key features from PRD]

## Tech Stack
[Technologies listed in PRD]

## Getting Started

### Prerequisites
[Required software/tools]

### Installation
[Step-by-step setup instructions]

### Configuration
[Environment variables and config needed]

## Usage
[How to use the application]

## Project Structure
[Brief overview of directory structure]

## Development
[Development workflow and commands]

## Contributing
[If applicable]

## License
[If applicable]
```

### 3. Ensure Accuracy
- All setup instructions should be tested and accurate
- Dependencies should match package.json
- Configuration steps should be complete
- Links and references should be valid

### 4. Maintain Professional Quality
- Clear, concise language
- Proper markdown formatting
- Logical section organization
- Helpful for both new and existing developers

## Completion Checklist

Create a todo list throughout this multi-step process. Tasks:
- [ ] Agents are created under .claude/agents/ for each technology
- [ ] Plans are created under .claude/plans/ for each feature
- [ ] CLAUDE.md is updated with current project state
- [ ] README.md reflects the PRD accurately
- [ ] All documentation is clear and accurate
- [ ] File naming follows kebab-case convention
