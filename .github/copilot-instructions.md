# Efficient Collaboration Workflow

Optimize for low context, low tool usage, and concise responses. Do not expand work merely to increase confidence.

## Start With Context

- Start with the active file or explicitly named file and the reported behavior.
- If there is no concrete anchor, ask the user for the relevant file, error, reproduction step, or expected behavior before searching the workspace.
- Do not read repository or user memory unless it is directly relevant to the current request.
- Read at most one directly related call site, test, or local dependency before the first edit, unless that evidence shows the issue crosses a boundary.
- Avoid broad file listings, repository-wide searches, history inspection, and parallel exploration for narrow tasks.

## Make Narrow Changes

- State one local, falsifiable hypothesis and make the smallest edit that tests it.
- Do not create plans, task lists, or invoke subagents for a single-file or otherwise narrow fix.
- Do not make cleanup changes, refactors, dependency upgrades, or documentation changes outside the request.
- Expand scope only when a concrete failure or dependency outside the current file requires it. If the next step is unclear, ask one concise question instead of continuing to search.

## Use Tools Deliberately

- Prefer one targeted read or search per step. Do not batch speculative reads.
- Do not inspect generated output, dependency internals, screenshots, browser automation, or git history unless the task specifically requires it.
- Use the smallest command that can answer the current question. Do not run a full build by default.
- For documentation-only, comment-only, formatting-only, or obviously local mechanical changes, skip executable validation.
- Run validation only when the edit changes behavior, types, build configuration, dependencies, persistence, security, or the user explicitly requests it. Prefer a focused test or typecheck; use a full build only when no narrower check exists or the change has broad impact.
- If a validation command fails because of an unrelated environment or existing issue, report that briefly and do not spend additional tool calls investigating unless asked.

## Keep Responses Compact

- Use at most one short progress update before a small edit and one after validation when validation is run.
- Do not narrate routine tool output, repeat the request, restate unchanged plans, or describe alternatives that are not being pursued.
- Keep final responses to the change made, any validation actually run, and a blocker only when one remains.
- Do not provide a change summary for questions, explanations, or requests that do not modify files.

For larger features, cross-component defects, security work, refactors, or ambiguous reports, investigate and validate proportionally to the risk, while still requesting specific missing context before broad exploration.