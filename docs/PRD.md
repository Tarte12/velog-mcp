# Velog Second Brain MCP PRD

## Goal

Allow an MCP client to read a user's public Velog posts as personal knowledge, produce evidence-based technical Markdown, and safely create Velog drafts or posts.

## MVP

1. Read public posts: list, get one, and search.
2. Audit Markdown: CommonMark syntax, heading structure, code-fence language, links, image alt text, and secret patterns.
3. Create drafts and publish private posts after explicit confirmation.

Public publishing is unavailable unless `VELOG_ALLOW_PUBLIC=1` is present when the process starts.

## Local credential setup (Windows)

For a local MCP installation, run `pnpm velog-auth setup`. It opens `velog.io`; after logging in, copy the `refresh_token` cookie in browser DevTools (Application > Cookies) and paste it into the hidden prompt. The value is stored with Windows DPAPI for the current user only. It is never printed, logged, or written as plaintext.

Run `pnpm velog-auth status` to check whether a credential exists and `pnpm velog-auth logout` to remove it. `VELOG_REFRESH_TOKEN` remains supported and overrides the stored credential, which is useful for CI and other non-interactive launches.

If Velog returns a replacement `refresh_token` cookie, the server keeps it in memory and updates the DPAPI credential. A token supplied by `VELOG_REFRESH_TOKEN` is never written to local storage.

## Live smoke test

After setup, run `pnpm run smoke:velog -- --confirm`. This intentionally creates one uniquely named private post and verifies its id, title, and body through an authenticated read-back. The command does not print the token or post body.

## Local second brain

`velog_sync_local_index` saves a user's public posts to `%LOCALAPPDATA%\\velog-mcp\\posts-index.json`; the replacement is atomic so a failed sync does not replace a prior snapshot. `velog_search_local_index` searches that local snapshot by keyword across title, tags, description, and body. It does not call Velog or use semantic search.

`velog_export_local_posts` writes the synced posts to `%LOCALAPPDATA%\\velog-mcp\\export\\<username>`. Each Markdown file includes simple front matter and the source body. A manifest tracks generated content: if a user changes an exported file locally, a later export reports a conflict instead of overwriting it. Stale files are reported but never deleted automatically.

## Non-goals

No React, HTTP framework, hosted multi-user service, browser automation, image rendering, profile changes, comment actions, or semantic search in the initial implementation.

## User flow

```text
Read:    list/search → get post → answer with title and URL
Write:   research with official sources → format/audit → create draft
Publish: preview → confirm=true → private post → read-back verification
```

## Writing policy

- Dynamic technical claims (API shape, version, limits, metrics) cite official documentation or a primary source.
- Personal experience and stated design opinions do not need citations.
- Markdown output includes a `## References` section when external claims are made.
- The server returns errors for secret-like content; it never logs the source body or token.

## Technical decisions

| Concern | Decision |
| --- | --- |
| MCP | TypeScript SDK v2, local stdio transport |
| Velog | isolated `VelogGateway` calling undocumented `https://v3.velog.io/graphql` |
| HTTP | Node native `fetch` |
| Validation | Zod v4 at MCP and HTTP boundaries |
| Tests | Node `node:test`, mocked fetch, no live Velog calls |
| Markdown | CommonMark baseline plus a tested Velog compatibility profile |

Detailed milestones, source URLs, test policy, and definition of done are in `../PLAN.md`.
