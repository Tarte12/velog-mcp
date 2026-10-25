# Velog MCP MVP Plan

## Goal

Build a local, stdio-based MCP server that reads public Velog posts, then safely formats and publishes technical Markdown. The server has no React UI and no HTTP framework in MVP.

## Non-goals

- Remote/SaaS hosting, OAuth, React, browser automation, image generation, vector search, profile changes, and comments.
- Copying another server's code. We may reproduce externally observable behavior only after documenting it.

## Technical baseline

| Concern | Decision | Primary reference |
| --- | --- | --- |
| MCP transport | `@modelcontextprotocol/server` v2 `serveStdio` | https://ts.sdk.modelcontextprotocol.io/v2/serving/stdio |
| Runtime | Node.js, native `fetch`, native test runner | https://nodejs.org/api/globals.html#fetch · https://nodejs.org/api/test.html |
| Language | TypeScript ESM, `strict: true` | https://www.typescriptlang.org/tsconfig/strict |
| Boundary validation | Zod v4 schemas | https://zod.dev/ |
| Markdown baseline | CommonMark, then a Velog-tested compatibility profile | https://spec.commonmark.org/spec |

## Delivery order

### M0 — Project contract

- Create this plan, `AGENTS.md`, and `CLAUDE.md`.
- Use Node + TypeScript only; no framework or database.
- Use pnpm, pinned by `packageManager` in `package.json`.
- Use Node 26 Current to evaluate the newest runtime. It is intentionally not an LTS line; `.node-version` pins the verified patch release.
- Done when `typecheck`, `build`, and `test` scripts run locally.

### M1 — Public read vertical slice

- `velog_list_posts`, `velog_get_post`, `velog_search_posts`.
- Call `https://v3.velog.io/graphql` through one `VelogGateway`.
- Validate tool inputs and GraphQL response boundaries with Zod.
- Done when gateway contract tests cover success, GraphQL errors, and malformed payloads.

### M2 — Markdown audit

- `velog_format_markdown`: conservative Markdown audit for heading/code-fence/link/image-alt checks and secret detection. A full CommonMark AST parser is added only if these checks require it.
- Return structured `formattedBody`, `warnings`, and `errors`.
- Done when dangerous or malformed input cannot be marked publishable.

### M3 — Safe writing

- Draft creation and private publishing with `confirm: true`.
- `VELOG_ALLOW_PUBLIC=1` is required before the public option exists.
- Do not retry mutations. Verify the created post by reading it back.
- Done when a test account can create one private post with no secret leakage.

Current status: complete. Draft/private publish tool contracts, confirmation, public gate, secret blocking, and the test-account private publish/read-back smoke check are implemented and verified.

Run `pnpm run smoke:velog -- --confirm` locally after `velog-auth setup` to create one private, uniquely named smoke post and verify it through an authenticated read-back. It never prints the credential or post body.

### M3.1 ??Windows local credential setup

- `velog-auth setup` opens Velog in the user's browser and accepts a manually copied `refresh_token` through hidden terminal input.
- Store only DPAPI-encrypted bytes scoped to the current Windows user; `status` must not reveal the token and `logout` must remove it.
- Environment variable configuration remains supported and takes precedence, so automated environments never need a local credential file. macOS/Linux credential storage is out of scope for this milestone.
- When an authenticated Velog response rotates `refresh_token` through `Set-Cookie`, the server updates the Windows credential store. This behavior is based on the observed authentication flow documented at https://github.com/milcho0604/velog-mcp/blob/main/README.md#%ED%86%A0%ED%81%B0-%EC%96%BB%EB%8A%94-%EB%B2%95.

### M4 — Second brain

- Export and incrementally sync posts into a local index.
- Add semantic search only after keyword retrieval and snapshots are reliable.

Current status: public-post sync, local keyword retrieval, and Markdown export are implemented. `velog_sync_local_index` downloads public posts for a named user and atomically refreshes that user's local snapshot; `velog_search_local_index` searches the snapshot without a network request; `velog_export_local_posts` exports the snapshot while preserving locally modified files. Semantic search remains out of scope.

## MVP tool catalog

| Milestone | Tool | Side effect |
| --- | --- | --- |
| M1 | `velog_list_posts` | none |
| M1 | `velog_get_post` | none |
| M1 | `velog_search_posts` | none |
| M2 | `velog_format_markdown` | none |
| M3 | `velog_create_draft` | creates a draft |
| M3 | `velog_publish_post` | creates a private/public post |
| M4 | `velog_sync_local_index` | writes a local public-post index |
| M4 | `velog_search_local_index` | none |
| M4 | `velog_export_local_posts` | writes local Markdown files |

## Test policy

Use Node's built-in `node:test` and `node:assert/strict`; do not introduce a test framework.

Every test must state a user-facing rule or safety invariant. Required tests:

1. Each read operation sends the documented GraphQL operation and parses its response.
2. GraphQL `errors` or an invalid payload never become a successful tool result.
3. Markdown secret detection blocks publication.
4. Public publishing is unreachable without the environment gate.

Avoid snapshots, tests that duplicate implementation details, and real Velog calls in automated tests. A test-account smoke check belongs to M3.

## Definition of done

- `pnpm run typecheck`, `pnpm run build`, and `pnpm test` pass.
- No `any`, no web framework, and no duplicate API client.
- Each external boundary has a Zod schema or deliberate `unknown` handling.
- Token values and body content are not logged.
- New externally observable behavior has a source URL or a test-account observation recorded in the PRD.
