# Velog MCP

`@emprimula/velog-mcp` is a local stdio MCP server for reading public Velog posts, auditing Markdown, creating drafts or private posts, and maintaining a local keyword index and Markdown export.

## Install

Node.js 26 is required.

```powershell
npm install -g @emprimula/velog-mcp
velog-auth setup
```

`velog-auth setup` opens Velog in the browser. Copy the `refresh_token` cookie from DevTools (Application > Cookies > `https://velog.io`) and paste it into the hidden prompt. The token is encrypted with Windows DPAPI for the current Windows user. Do not send the token in chat or add it to an MCP configuration file.

## Connect an MCP client

The server command is `velog-mcp`.

For Codex:

```powershell
codex mcp add velog -- velog-mcp
```

For any client that uses an MCP JSON configuration, use:

```json
{
  "mcpServers": {
    "velog": {
      "command": "velog-mcp",
      "args": []
    }
  }
}
```

Restart the client after changing its MCP configuration.

## Safety

- Public publishing is unavailable unless the server process has `VELOG_ALLOW_PUBLIC=1`.
- Writes require `confirm: true`.
- Markdown with secret-like values is blocked before a write.
- Local credentials are Windows-only. `VELOG_REFRESH_TOKEN` remains available for automation and overrides the stored credential.

## Local second brain

1. Call `velog_sync_local_index` with a Velog username.
2. Call `velog_search_local_index` to search the local snapshot.
3. Call `velog_export_local_posts` to write Markdown files.

The local index and exports are stored below `%LOCALAPPDATA%\velog-mcp`.

## Publishing this package

Maintainers can validate the package with `pnpm pack`, then publish after logging into the intended npm account:

```powershell
npm login
npm publish --access public
```

Publishing is not part of the install workflow and should only be done by the package owner.
