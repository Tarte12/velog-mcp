import { z } from "zod";

import { LocalPostIndex } from "./local-index.js";
import { MarkdownExporter } from "./markdown-export.js";
import type { VelogGateway, VelogPost } from "./velog-gateway.js";

const UsernameSchema = z.string().trim().min(1).max(80);
export const SyncLocalIndexInputSchema = z.object({ username: UsernameSchema });
export const SearchLocalIndexInputSchema = z.object({
  username: UsernameSchema, query: z.string().trim().min(1).max(200), limit: z.number().int().min(1).max(50).default(20),
});
export const ExportLocalPostsInputSchema = z.object({ username: UsernameSchema });

export function createIndexTools(gateway: VelogGateway, index = new LocalPostIndex(), exporter = new MarkdownExporter()) {
  return {
    sync: async (input: z.infer<typeof SyncLocalIndexInputSchema>) => ({
      username: input.username, ...index.update(input.username, await getAllPosts(gateway, input.username)),
    }),
    search: (input: z.infer<typeof SearchLocalIndexInputSchema>) => ({
      username: input.username, results: index.search(input.username, input.query, input.limit),
    }),
    export: (input: z.infer<typeof ExportLocalPostsInputSchema>) => {
      const posts = index.postsFor(input.username);
      if (posts.length === 0) throw new Error("No local posts are synced for this username. Sync before exporting.");
      return exporter.export(input.username, posts);
    },
  };
}
async function getAllPosts(gateway: VelogGateway, username: string): Promise<VelogPost[]> {
  const posts: VelogPost[] = [];
  const seenPostIds = new Set<string>();
  const seenCursors = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await gateway.listPosts({ username, limit: 50, cursor });
    for (const post of page) {
      if (!post.is_private && !seenPostIds.has(post.id)) {
        seenPostIds.add(post.id);
        posts.push(post);
      }
    }
    const nextCursor = page.at(-1)?.id;
    if (!nextCursor || page.length < 50 || seenCursors.has(nextCursor)) break;
    seenCursors.add(nextCursor);
    cursor = nextCursor;
  } while (true);
  return posts;
}
