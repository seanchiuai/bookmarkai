---
description: Implement all plans in the .claude/plans folder using agents in the .claude/agents folder
allowed-tools: Bash, Edit
argument-hint: []
---

# Command: /cook

Execute all implementation plans located in the `.claude/plans` folder.

**Plan File Naming Convention**: Plans should be named `feature-[feature-name]-plan.md`

Before you start, ensure there are existing markdown files in `.claude/plans` and `.claude/agents`. After confirming this, execute all the plans.

For each plan:
1. Identify the corresponding agent from the `.claude/agents` folder required to execute the plan.
2. Assign the task to the correct agent.
3. Execute each plan step by step, using the agent's specified expertise and tools.
4. Collect and summarize the execution results.

Ensure proper delegation to agents optimized for the specific tasks stated in each plan.

Upon completion:
- Remove the todolist app from the template.
- Update the routes so that the homepage is correct (reflecting the main feature).
- Output a summary report of all executed plans, including any issues or next steps required.
- Update files under /docs to reflect what was built and everything you did.