import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { z } from "zod";

import type { VelogPost } from "./velog-gateway.js";

const StoredPostSchema = z.object({
  id: z.string(), title: z.string().nullable(), body: z.string().nullable(), url_slug: z.string().nullable(),
  short_description: z.string().nullable(), thumbnail: z.string().nullable(), released_at: z.string().nullable(), is_private: z.boolean(),
  tags: z.array(z.string()), user: z.object({ username: z.string() }).nullable(),
});
const IndexSchema = z.object({
  version: z.literal(1),
  users: z.array(z.object({ username: z.string(), syncedAt: z.string(), posts: z.array(StoredPostSchema) })),
});
type Index = z.infer<typeof IndexSchema>;
type UserIndex = Index["users"][number];

export type LocalSearchResult = {
  id: string; title: string | null; urlSlug: string | null; tags: string[]; releasedAt: string | null; excerpt: string;
};

export function defaultIndexPath(env: NodeJS.ProcessEnv = process.env): string {
  const base = env.LOCALAPPDATA?.trim() || join(homedir(), "AppData", "Local");
  return join(base, "velog-mcp", "posts-index.json");
}

export class LocalPostIndex {
  public constructor(private readonly path = defaultIndexPath()) {}

  public update(username: string, posts: VelogPost[]): { added: number; updated: number; removed: number; total: number } {
    const index = this.load();
    const previous = index.users.find((user) => user.username === username);
    const oldPosts = new Map(previous?.posts.map((post) => [post.id, post]) ?? []);
    let added = 0;
    let updated = 0;
    for (const post of posts) {
      const oldPost = oldPosts.get(post.id);
      if (!oldPost) added += 1;
      else if (!samePost(oldPost, post)) updated += 1;
    }
    const users = index.users.filter((user) => user.username !== username);
    users.push({ username, syncedAt: new Date().toISOString(), posts } satisfies UserIndex);
    this.save({ version: 1, users });
    return { added, updated, removed: Math.max(0, oldPosts.size - posts.length), total: posts.length };
  }

  public search(username: string, query: string, limit: number): LocalSearchResult[] {
    const user = this.load().users.find((entry) => entry.username === username);
    if (!user) return [];
    const terms = query.toLocaleLowerCase().split(/\s+/u).filter(Boolean);
    return user.posts.map((post) => ({ post, score: score(post, terms) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || (right.post.released_at ?? "").localeCompare(left.post.released_at ?? ""))
      .slice(0, limit)
      .map(({ post }) => ({ id: post.id, title: post.title, urlSlug: post.url_slug, tags: post.tags,
        releasedAt: post.released_at, excerpt: excerpt(post.body ?? post.short_description ?? "", terms) }));
  }

  public postsFor(username: string): VelogPost[] {
    return this.load().users.find((entry) => entry.username === username)?.posts ?? [];
  }

  private load(): Index {
    try {
      return IndexSchema.parse(JSON.parse(readFileSync(this.path, "utf8")) as unknown);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return { version: 1, users: [] };
      throw new Error("The local Velog index is invalid. Remove it and sync again.");
    }
  }

  private save(index: Index): void {
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    const temporaryPath = `${this.path}.${process.pid}.tmp`;
    writeFileSync(temporaryPath, JSON.stringify(index), { encoding: "utf8", mode: 0o600 });
    renameSync(temporaryPath, this.path);
  }
}

function samePost(left: VelogPost, right: VelogPost): boolean {
  return left.id === right.id && left.title === right.title && left.body === right.body && left.url_slug === right.url_slug
    && left.short_description === right.short_description && left.thumbnail === right.thumbnail && left.released_at === right.released_at
    && left.tags.join("\u0000") === right.tags.join("\u0000") && left.user?.username === right.user?.username;
}
function score(post: VelogPost, terms: string[]): number {
  const title = (post.title ?? "").toLocaleLowerCase();
  const tags = post.tags.join(" ").toLocaleLowerCase();
  const body = `${post.short_description ?? ""}\n${post.body ?? ""}`.toLocaleLowerCase();
  if (!terms.every((term) => `${title}\n${tags}\n${body}`.includes(term))) return 0;
  return terms.reduce((total, term) => total + occurrences(title, term) * 10 + occurrences(tags, term) * 6 + occurrences(body, term), 0);
}
function occurrences(value: string, term: string): number { return value.split(term).length - 1; }
function excerpt(value: string, terms: string[]): string {
  const compact = value.replace(/\s+/gu, " ").trim();
  const lower = compact.toLocaleLowerCase();
  const position = terms.reduce((best, term) => {
    const found = lower.indexOf(term);
    return found >= 0 && (best < 0 || found < best) ? found : best;
  }, -1);
  const start = Math.max(0, position - 80);
  const text = compact.slice(start, start + 240);
  return `${start > 0 ? "…" : ""}${text}${start + text.length < compact.length ? "…" : ""}`;
}
