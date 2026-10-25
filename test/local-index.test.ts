import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createIndexTools } from "../src/index-tools.js";
import { LocalPostIndex } from "../src/local-index.js";
import { MarkdownExporter } from "../src/markdown-export.js";
import { VelogGateway, type FetchLike } from "../src/velog-gateway.js";

const post = {
  id: "post-1", title: "Reliable Redis cache", body: "Use Redis for a cache with explicit invalidation.",
  url_slug: "reliable-redis-cache", short_description: "Redis cache guide", thumbnail: null,
  released_at: "2026-10-25T00:00:00.000Z", is_private: false, tags: ["redis", "cache"], user: { username: "kim" },
};

test("sync stores posts locally and keyword search returns a ranked excerpt", async () => {
  const directory = mkdtempSync(join(tmpdir(), "velog-index-test-"));
  const index = new LocalPostIndex(join(directory, "posts.json"));
  const fetchLike: FetchLike = async () => new Response(JSON.stringify({ data: { posts: [post] } }), { status: 200 });
  const tools = createIndexTools(new VelogGateway(fetchLike), index);
  try {
    assert.deepEqual(await tools.sync({ username: "kim" }), { username: "kim", added: 1, updated: 0, removed: 0, total: 1 });
    const result = tools.search({ username: "kim", query: "redis cache", limit: 20 });
    assert.equal(result.results[0]?.urlSlug, "reliable-redis-cache");
    assert.match(result.results[0]?.excerpt ?? "", /Redis/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("a later sync updates changed posts without duplicating them", () => {
  const directory = mkdtempSync(join(tmpdir(), "velog-index-test-"));
  const index = new LocalPostIndex(join(directory, "posts.json"));
  try {
    assert.deepEqual(index.update("kim", [post]), { added: 1, updated: 0, removed: 0, total: 1 });
    assert.deepEqual(index.update("kim", [{ ...post, title: "Updated Redis cache" }]), { added: 0, updated: 1, removed: 0, total: 1 });
    assert.equal(index.search("kim", "updated", 20).length, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("sync ignores private posts and a repeated cursor page", async () => {
  const directory = mkdtempSync(join(tmpdir(), "velog-index-test-"));
  const index = new LocalPostIndex(join(directory, "posts.json"));
  const repeatedPage = Array.from({ length: 50 }, (_, number) => ({ ...post, id: `post-${number}`, is_private: number === 0 }));
  let calls = 0;
  const fetchLike: FetchLike = async () => {
    calls += 1;
    return new Response(JSON.stringify({ data: { posts: repeatedPage } }), { status: 200 });
  };
  const tools = createIndexTools(new VelogGateway(fetchLike), index);
  try {
    const result = await tools.sync({ username: "kim" });
    assert.equal(calls, 2);
    assert.equal(result.total, 49);
    assert.equal(index.postsFor("kim").some((entry) => entry.is_private), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("export does not overwrite a file modified outside the index", () => {
  const directory = mkdtempSync(join(tmpdir(), "velog-export-test-"));
  const index = new LocalPostIndex(join(directory, "index.json"));
  const exporter = new MarkdownExporter(join(directory, "export"));
  try {
    index.update("kim", [post]);
    const first = exporter.export("kim", index.postsFor("kim"));
    assert.equal(first.added, 1);
    const markdownFile = readdirSync(first.directory).find((name) => name.endsWith(".md"));
    assert.ok(markdownFile);
    writeFileSync(join(first.directory, markdownFile), "User's local edit", "utf8");
    assert.equal(exporter.export("kim", index.postsFor("kim")).conflicts, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
