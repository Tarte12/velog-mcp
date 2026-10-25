# Roadmap: Markdown templates, cross-platform credentials, and follow-up improvements

## Goal

Make Velog MCP useful as a writing workspace, not only as a Velog API bridge. The next milestone should make generated posts consistent and attractive while keeping credentials local and platform-appropriate.

## P0 — Generate a consistent Markdown template

- [ ] Extend `velog_format_markdown` to generate a polished Velog article structure, not only report warnings.
- [ ] Define an explicit input contract for title, summary, sections, code examples, references, and tags.
- [ ] Produce deterministic Markdown with consistent heading levels, spacing, code-fence languages, links, image alt text, and a `## References` section when sources are supplied.
- [ ] Keep user-authored prose intact where possible; formatting must not invent technical claims.
- [ ] Return `formattedBody`, `warnings`, `errors`, and a short preview.
- [ ] Block publication when secrets, malformed fences, or invalid links remain.
- [ ] Add contract tests for empty sections, Korean text, nested lists, code fences, links, images, and references.

### Acceptance criteria

Given the same structured input, the tool returns the same Markdown every time. A user can copy `formattedBody` directly into a private draft and receive a readable, consistently structured Velog post without manually repairing headings or code blocks.

## P1 — Cross-platform credential storage

- [ ] Keep the current Windows DPAPI implementation.
- [ ] Add macOS Keychain storage through a platform-native or well-maintained keychain backend.
- [ ] Add Linux Secret Service/libsecret storage with a clear error when no desktop secret service is available.
- [ ] Keep `setup`, `status`, and `logout` behavior consistent across platforms.
- [ ] Never read browser cookie databases automatically; users must explicitly provide the Velog token.
- [ ] Persist rotated `refresh_token` values on every supported platform.
- [ ] Add platform-specific tests or safe integration checks without printing credential material.

### Acceptance criteria

The same published package can be installed on Windows, macOS, and Linux. Credentials are stored in the platform's user-scoped secret store, never in MCP JSON configuration or a plaintext project file.

## P2 — Useful follow-up features

- [ ] Add an explicit `velog_get_current_user` tool or setup status that shows the connected username without exposing credentials.
- [ ] Add sync deletion/archive reporting and a dry-run mode before changing the local index.
- [ ] Add export front matter customization and an option for a user-selected export directory.
- [ ] Add post update support with the same preview and confirmation rules as publishing.
- [ ] Add rate-limit and network timeout feedback without retrying mutations.
- [ ] Add a release workflow that runs typecheck, build, tests, package dry-run, and publishes only from a tagged commit.
- [ ] Evaluate semantic search only after keyword search and Markdown snapshots have stable usage evidence.

## Explicit non-goals

- Browser cookie scraping or password automation.
- Public publishing by default.
- A hosted multi-user token service.
- Semantic search before reliable local snapshots exist.
