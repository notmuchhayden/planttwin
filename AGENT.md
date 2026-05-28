# Agent Policy

This repository is for a web-based 3D factory layout and digital twin editor.

## Working Rules

- Keep changes focused and incremental.
- Prefer clear, maintainable code over clever code.
- Do not overwrite unrelated user changes.
- Preserve existing conventions unless there is a strong reason to change them.
- Document important decisions when they affect future implementation work.

## Project Direction

- Build the application as a web-based 3D factory layout and digital twin editor.
- Treat this folder as the canonical workspace for that product.
- If a task conflicts with these instructions, the instructions in this file take priority.

## External LLM Workflow

- Use `nvidia-nim-worker` for code generation and patch creation.
- Prefer one focused implementation pass per task, with clear context files attached through `--context`.
- Keep Codex responsible for planning, scope control, review, verification, and final integration decisions.
- If a task crosses files, requires design judgment, or needs state synchronization, break it into smaller passes before delegating.
- After the worker returns a patch, verify the result with a build or targeted check before expanding scope.
- If repeated retries or review overhead start to outweigh the saved coding work, stop delegating that task and handle the remaining change directly.

## Codex Role

- Codex should handle design, scoping, review, verification, and merge decisions.
- Delegate actual code changes to `nvidia-nim-worker` and review the returned diff before applying it.
- For architecture changes, multi-file refactors, or any change that requires keeping shared state consistent, Codex should own the implementation plan and ensure the patch is correct before integration.
- Do not force `nvidia-nim-worker` onto a task when it is slowing progress or producing low-quality structure.
