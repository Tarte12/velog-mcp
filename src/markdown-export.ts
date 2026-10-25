import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { z } from "zod";

import type { VelogPost } from "./velog-gateway.js";

const ManifestSchema = z.object({
  version: z.literal(1),
  files: z.record(z.string(), z.object({ path: z.string(), contentHash: z.string() })),
});
type Manifest = z.infer<typeof ManifestSchema>;

export function defaultExportRoot(env: NodeJS.ProcessEnv = process.env): string {
  return join(env.LOCALAPPDATA?.trim() || join(homedir(), "AppData", "Local"), "velog-mcp", "export");
}

export class MarkdownExporter {
  public constructor(private readonly root = defaultExportRoot()) {}

  public export(username: string, posts: VelogPost[]) {
    const directory = join(this.root, safePathPart(username));
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    const manifestPath = join(directory, ".velog-mcp-manifest.json");
    const manifest = loadManifest(manifestPath);
    let added = 0;
    let updated = 0;
    let unchanged = 0;
    let conflicts = 0;
    const nextFiles: Manifest["files"] = {};

    for (const post of posts) {
      const relativePath = `${safePathPart(post.url_slug || "post")}-${shortHash(post.id)}.md`;
      const path = join(directory, relativePath);
      const contents = markdown(username, post);
      const contentHash = hash(contents);
      const previous = manifest.files[post.id];
      nextFiles[post.id] = { path: relativePath, contentHash };
      if (existsSync(path)) {
        const actualHash = hash(readFileSync(path, "utf8"));
        if (actualHash === contentHash) { unchanged += 1; continue; }
        if (previous && actualHash !== previous.contentHash) { conflicts += 1; continue; }
        writeFileSync(path, contents, { encoding: "utf8", mode: 0o600 });
        updated += 1;
      } else {
        writeFileSync(path, contents, { encoding: "utf8", mode: 0o600 });
        added += 1;
      }
    }
    writeFileSync(manifestPath, JSON.stringify({ version: 1, files: nextFiles } satisfies Manifest), { encoding: "utf8", mode: 0o600 });
    return { directory, added, updated, unchanged, conflicts, stale: Object.keys(manifest.files).length - posts.filter((post) => manifest.files[post.id]).length };
  }
}

function loadManifest(path: string): Manifest {
  if (!existsSync(path)) return { version: 1, files: {} };
  try { return ManifestSchema.parse(JSON.parse(readFileSync(path, "utf8")) as unknown); }
  catch { throw new Error("The local export manifest is invalid. Restore or remove it before exporting."); }
}
function markdown(username: string, post: VelogPost): string {
  return [
    "---",
    `title: ${JSON.stringify(post.title ?? "")}`,
    `slug: ${JSON.stringify(post.url_slug ?? "")}`,
    `publishedAt: ${JSON.stringify(post.released_at ?? "")}`,
    `tags: ${JSON.stringify(post.tags)}`,
    `source: ${JSON.stringify(post.url_slug ? `https://velog.io/@${username}/${post.url_slug}` : `https://velog.io/@${username}`)}`,
    "---", "", post.body ?? "",
  ].join("\n");
}
function hash(value: string): string { return createHash("sha256").update(value, "utf8").digest("hex"); }
function shortHash(value: string): string { return hash(value).slice(0, 12); }
function safePathPart(value: string): string {
  const safe = value.replace(/[<>:"/\\|?*\u0000-\u001f]/gu, "-").replace(/[. ]+$/u, "").trim();
  return safe || "post";
}
