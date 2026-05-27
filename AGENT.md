# Agent Policy

This repository is for a 3D plant twin application.

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

## Local LLM Workflow

- Use local LLM tools such as `aider` only for small, tightly scoped code changes.
- Prefer one file or one isolated behavior per local LLM pass.
- Keep Codex responsible for planning, scope control, review, and integration checks.
- If a task crosses files, requires design judgment, or needs state synchronization, break it into smaller passes before delegating.
- After a local LLM edit, verify the result with a build or targeted check before expanding scope.
- If repeated retries or review overhead start to outweigh the saved coding work, stop delegating that task and handle the remaining change directly.
