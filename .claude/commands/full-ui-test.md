---
description: Test the entire user-flow and all functionalities for errors.
argument-hint: []
---

# Command: Full UI Check

1. run `npm run dev` and use playwright to test the app. 
2. When log-in is needed, STOP and ask the human (me) to do it.
3. After user logs in manually, continue to test all functionalities of the app. Do the minimal just enough to test all functionalities.
4. If an error i stopping you from testing, end the tes there and generate the report.
5. After test is complete, list all errors found throughout the testing process by creating a md file for each problem encountered. Store groups of errors in `/docs/errors` folder as seperate files.

Notes:
- If you encounter an action you cannot do, STOP and ask the human (me) to do it. After I said I'm done, continue testing.
- Do not create any error logs (not even a summary) if no errors are found.
- Do not close the playwright testing window after completion.
- If playwright MCP is not available or installed, STOP and ask the user to install it. Do not continue without using the Playwright MCP.