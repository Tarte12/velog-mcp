import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "../src/config.js";
import { VelogGateway, type FetchLike } from "../src/velog-gateway.js";
import { createWriteTools } from "../src/write-tools.js";

test("a publish preview never sends a mutation", async () => {
  let calls = 0;
  const fetchLike: FetchLike = async () => {
    calls += 1;
    return new Response("unexpected", { status: 500 });
  };
  const tools = createWriteTools(new VelogGateway(fetchLike, undefined, "token"));

  const result = await tools.publishPrivate({
    title: "Safe post",
    body: "## Body",
    tags: [],
    confirm: false,
  });

  assert.equal(result.status, "preview");
  assert.equal(calls, 0);
});

test("a confirmed private publish sends a private mutation with the refresh token", async () => {
  let request: RequestInit | undefined;
  const fetchLike: FetchLike = async (_url, init) => {
    request = init;
    return new Response(
      JSON.stringify({ data: { writePost: { id: "post-1", url_slug: "safe-post", is_temp: false, is_private: true } } }),
      { status: 200 },
    );
  };
  const tools = createWriteTools(new VelogGateway(fetchLike, undefined, "refresh-token"));

  const result = await tools.publishPrivate({
    title: "Safe post",
    body: "## Body",
    tags: ["mcp"],
    urlSlug: "safe-post",
    confirm: true,
  });

  assert.equal(result.status, "written");
  assert.match(String(request?.headers instanceof Headers ? request.headers.get("cookie") : (request?.headers as Record<string, string>).cookie), /refresh-token/);
  const body = JSON.parse(String(request?.body)) as { variables: { input: { is_private: boolean; is_temp: boolean } } };
  assert.equal(body.variables.input.is_private, true);
  assert.equal(body.variables.input.is_temp, false);
});

test("a secret-like body is blocked before a confirmed publish can call Velog", async () => {
  let calls = 0;
  const fetchLike: FetchLike = async () => {
    calls += 1;
    return new Response("unexpected", { status: 500 });
  };
  const tools = createWriteTools(new VelogGateway(fetchLike, undefined, "token"));

  const result = await tools.publishPrivate({
    title: "Unsafe post",
    body: "AKIA1234567890ABCDEF",
    tags: [],
    confirm: true,
  });

  assert.equal(result.status, "blocked");
  assert.equal(calls, 0);
});

test("only explicit true values enable public publishing", () => {
  assert.equal(loadConfig({ VELOG_ALLOW_PUBLIC: "yes" }).allowPublic, true);
  assert.equal(loadConfig({ VELOG_ALLOW_PUBLIC: "1 " }).allowPublic, true);
  assert.equal(loadConfig({ VELOG_ALLOW_PUBLIC: "trueish" }).allowPublic, false);
});
