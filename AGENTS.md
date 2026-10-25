# Working rules

Read `PLAN.md` before changing this project. It is the source of truth for scope.

## Keep the implementation compact

- Use Node built-ins before adding a dependency. `fetch`, `node:test`, and `node:assert/strict` are already available.
- Use only `@modelcontextprotocol/server`, `zod`, TypeScript, and Node for M1.
- Do not add React, an HTTP framework, a database, a DI container, repository classes, or generic base classes.
- One module owns one concern: MCP registration, Velog HTTP access, a group of tools, or Markdown rules.
- Introduce an interface only when a second real implementation is needed.

## Correctness and security

- TypeScript is strict: no `any`, no unchecked casts from external input.
- Validate MCP input and Velog responses with Zod at boundaries.
- Never write secrets, cookies, access tokens, or post bodies to stdout/stderr/logs.
- A mutation must not retry automatically.
- Public publishing must be impossible unless an environment gate enables it.

## Sources and tests

- Prefer official documentation: MCP SDK, Node.js, TypeScript, Zod, CommonMark, then Velog's source or a documented live observation.
- Cite the source URL in `PLAN.md`, `docs/`, or a code comment only when it explains a non-obvious external behavior.
- Use `node:test` only. Test a user-visible contract or safety invariant; avoid snapshots.
- Use pnpm. Run `pnpm run typecheck`, `pnpm run build`, and `pnpm test` after changing code.
