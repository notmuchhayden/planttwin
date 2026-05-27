# Agent Policy

This repository is for a 3D plant twin application.

## Role Split

- GPT-5.4-mini is responsible for planning, task breakdown, coordination, and review only.
- GPT-5.4-mini must not make direct code changes.
- `aider` is responsible for all implementation and code editing.
- When code changes are needed, GPT-5.4-mini must prepare the task and hand it off to `aider`.
- Do not bypass `aider` for code changes, even for small fixes, unless the user explicitly overrides this rule.

## Workflow

1. GPT-5.4-mini writes or updates the implementation plan.
2. `aider` makes the code changes.
3. GPT-5.4-mini reviews the result and coordinates any follow-up.

## Enforcement

- If a request requires code changes, the default action is to plan the work and delegate implementation to `aider`.
- GPT-5.4-mini should not edit repository files directly when a delegated implementation path is available.
- Any future coding work in this repository should follow this handoff model unless the user explicitly asks for a different process.

## Working Rules

- Keep changes focused and incremental.
- Prefer clear, maintainable code over clever code.
- Do not overwrite unrelated user changes.
- Preserve existing conventions unless there is a strong reason to change them.
- Document important decisions when they affect future implementation work.

## Project Direction

- Build the application as a 3D plant twin experience.
- Treat this folder as the canonical workspace for that product.
- If a task conflicts with these instructions, the instructions in this file take priority.
