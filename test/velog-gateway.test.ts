import assert from "node:assert/strict";
import test from "node:test";

import { VelogGateway, VelogGatewayError, type FetchLike } from "../src/velog-gateway.js";

function fetchReturning(payload: unknown): FetchLike {
  return async () => new Response(JSON.stringify(payload), { status: 200 });
}

const post = {
  id: "post-1",
  title: "Redis cache",
  body: "# Redis",
  url_slug: "redis-cache",
  short_description: "Caching",
  thumbnail: null,
  released_at: "2026-10-25T00:00:00.000Z",
  is_private: false,
  tags: ["redis"],
  user: { username: "kim" },
};

test("listPosts sends the documented posts query and parses public posts", async () => {
  let requestBody: unknown;
  const fetchLike: FetchLike = async (_url, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ data: { posts: [post] } }), { status: 200 });
  };

  const gateway = new VelogGateway(fetchLike);
  const result = await gateway.listPosts({ username: "kim", limit: 20 });

  assert.equal(result[0]?.url_slug, "redis-cache");
  assert.ok(requestBody);
  const body = requestBody as { query: string; variables: unknown };
  assert.match(body.query, /query Posts/);
  assert.deepEqual(body.variables, { input: { username: "kim", limit: 20 } });
});

test("currentUser reads only the authenticated account username", async () => {
  let requestBody: unknown;
  const fetchLike: FetchLike = async (_url, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ data: { currentUser: { username: "kim" } } }), { status: 200 });
  };
  const gateway = new VelogGateway(fetchLike, undefined, "refresh-token");

  assert.deepEqual(await gateway.currentUser(), { username: "kim" });
  assert.match((requestBody as { query: string }).query, /query CurrentUser/);
});

test("GraphQL errors never become a successful result", async () => {
  const gateway = new VelogGateway(fetchReturning({ errors: [{ message: "not authorized" }] }));

  await assert.rejects(
    gateway.getPost({ username: "kim", urlSlug: "redis-cache" }),
    VelogGatewayError,
  );
});

test("an invalid post payload never becomes a successful result", async () => {
  const gateway = new VelogGateway(fetchReturning({ data: { posts: [{ id: "missing fields" }] } }));

  await assert.rejects(
    gateway.listPosts({ username: "kim", limit: 20 }),
    zodError,
  );
});

test("a refreshed cookie is used for the next request and can be persisted", async () => {
  const receivedCookies: string[] = [];
  const refreshed: string[] = [];
  const fetchLike: FetchLike = async (_url, init) => {
    const headers = init?.headers as Record<string, string>;
    receivedCookies.push(headers.cookie ?? "");
    if (receivedCookies.length === 1) {
      return new Response(JSON.stringify({ data: { posts: [] } }), {
        status: 200,
        headers: { "set-cookie": "refresh_token=new-token; Path=/; HttpOnly" },
      });
    }
    return new Response(JSON.stringify({ data: { posts: [] } }), { status: 200 });
  };
  const gateway = new VelogGateway(fetchLike, undefined, "old-token", (token) => refreshed.push(token));

  await gateway.listPosts({ username: "kim", limit: 20 });
  await gateway.listPosts({ username: "kim", limit: 20 });

  assert.deepEqual(receivedCookies, ["refresh_token=old-token", "refresh_token=new-token"]);
  assert.deepEqual(refreshed, ["new-token"]);
});

function zodError(error: unknown): boolean {
  return error instanceof Error && error.name === "ZodError";
}
