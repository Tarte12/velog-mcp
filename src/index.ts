#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { loadConfig, loadRefreshToken } from "./config.js";
import { saveStoredRefreshToken } from "./credentials.js";
import {
  ExportLocalPostsInputSchema,
  SearchLocalIndexInputSchema,
  SyncLocalIndexInputSchema,
  createIndexTools,
} from "./index-tools.js";
import {
  GetPostInputSchema,
  ListPostsInputSchema,
  SearchPostsInputSchema,
  createReadTools,
} from "./read-tools.js";
import { FormatMarkdownInputSchema, formatMarkdown } from "./markdown-tool.js";
import { VelogGateway } from "./velog-gateway.js";
import {
  CreateDraftInputSchema,
  PublishPrivateInputSchema,
  PublishPublicInputSchema,
  createWriteTools,
} from "./write-tools.js";

function textResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

serveStdio(() => {
  const config = loadConfig();
  const server = new McpServer({ name: "velog-second-brain", version: "0.1.0" });
  const refreshToken = loadRefreshToken();
  const gateway = new VelogGateway(
    fetch,
    undefined,
    refreshToken,
    config.refreshToken ? undefined : (token) => saveStoredRefreshToken(token),
  );
  const tools = createReadTools(gateway);
  const indexTools = createIndexTools(gateway);
  const writeTools = createWriteTools(gateway);

  server.registerTool(
    "velog_list_posts",
    {
      description: "List public posts for one Velog username.",
      inputSchema: ListPostsInputSchema,
    },
    async (input) => textResult(await tools.listPosts(input)),
  );

  server.registerTool(
    "velog_get_post",
    {
      description: "Read one public Velog post, including its Markdown body.",
      inputSchema: GetPostInputSchema,
    },
    async (input) => textResult(await tools.getPost(input)),
  );

  server.registerTool(
    "velog_search_posts",
    {
      description: "Search public Velog posts by keyword, optionally within one username.",
      inputSchema: SearchPostsInputSchema,
    },
    async (input) => textResult(await tools.searchPosts(input)),
  );

  server.registerTool(
    "velog_sync_local_index",
    {
      description: "Sync all public posts for one Velog username into the local keyword index.",
      inputSchema: SyncLocalIndexInputSchema,
    },
    async (input) => textResult(await indexTools.sync(input)),
  );

  server.registerTool(
    "velog_search_local_index",
    {
      description: "Search posts previously synced into the local keyword index.",
      inputSchema: SearchLocalIndexInputSchema,
    },
    async (input) => textResult(indexTools.search(input)),
  );

  server.registerTool(
    "velog_export_local_posts",
    {
      description: "Export posts already synced into the local index as Markdown files without making a network request.",
      inputSchema: ExportLocalPostsInputSchema,
    },
    async (input) => textResult(indexTools.export(input)),
  );

  server.registerTool(
    "velog_format_markdown",
    {
      description: "Audit Velog Markdown for structure, accessibility, and secret-like content before saving.",
      inputSchema: FormatMarkdownInputSchema,
    },
    async (input) => textResult(formatMarkdown(input)),
  );

  server.registerTool(
    "velog_create_draft",
    {
      description: "Preview or create a private Velog draft. Writing requires confirm=true.",
      inputSchema: CreateDraftInputSchema,
    },
    async (input) => textResult(await writeTools.createDraft(input)),
  );

  if (config.allowPublic) {
    server.registerTool(
      "velog_publish_post",
      {
        description: "Preview or publish a Velog post. Public visibility is available only because the server owner enabled it.",
        inputSchema: PublishPublicInputSchema,
      },
      async (input) => textResult(await writeTools.publishWithVisibility(input)),
    );
  } else {
    server.registerTool(
      "velog_publish_post",
      {
        description: "Preview or publish a private Velog post. Writing requires confirm=true.",
        inputSchema: PublishPrivateInputSchema,
      },
      async (input) => textResult(await writeTools.publishPrivate(input)),
    );
  }

  return server;
});
