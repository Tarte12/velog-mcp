import assert from "node:assert/strict";
import test from "node:test";

import { auditMarkdown } from "../src/markdown.js";

test("an unclosed code fence is not publishable", () => {
  const result = auditMarkdown("## Example\n```ts\nconst token = 'safe';");

  assert.match(result.errors.join("\n"), /code fence is not closed/);
});

test("a code fence without a language produces a quality warning", () => {
  const result = auditMarkdown("## Example\n```\nconst value = 1;\n```");

  assert.equal(result.errors.length, 0);
  assert.match(result.warnings.join("\n"), /has no language/);
});

test("an AWS access key is blocked before publishing", () => {
  const result = auditMarkdown("## Credentials\nAKIA1234567890ABCDEF");

  assert.match(result.errors.join("\n"), /AWS access key/);
});

test("an empty image alt text produces an accessibility warning", () => {
  const result = auditMarkdown("## Diagram\n![](https://example.com/diagram.png)");

  assert.match(result.warnings.join("\n"), /meaningful alt text/);
});
