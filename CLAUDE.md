# Velog MCP instructions

This is a compact TypeScript MCP server. Follow `PLAN.md` and `AGENTS.md`.

## Commands

```sh
pnpm run typecheck
pnpm run build
pnpm test
```

## Implementation rules

- Serve locally via stdio using `@modelcontextprotocol/server`; stdout is reserved for MCP protocol messages.
- Use native `fetch` for Velog. Do not add Axios, Express/Fastify, React, or a database in M1.
- Use Zod for tool inputs and untrusted HTTP responses.
- Keep GraphQL documents in `src/velog-gateway.ts`; tools must not issue HTTP calls directly.
- Tests use `node:test` and inject `fetch` into `VelogGateway`; never hit Velog from automated tests.
- The current endpoint is `https://v3.velog.io/graphql`. It is undocumented and must remain isolated behind `VelogGateway`.

## Source hierarchy

1. MCP TypeScript SDK: https://ts.sdk.modelcontextprotocol.io/v2/
2. Node.js: https://nodejs.org/api/
3. TypeScript: https://www.typescriptlang.org/docs/
4. Zod: https://zod.dev/
5. CommonMark: https://spec.commonmark.org/spec
6. Velog public source and a reproducible live observation
