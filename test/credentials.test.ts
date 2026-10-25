import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  type RefreshTokenProtector,
  loadStoredRefreshToken,
  removeStoredRefreshToken,
  saveStoredRefreshToken,
  storedTokenPath,
} from "../src/credentials.js";
import { loadRefreshToken } from "../src/config.js";

const testProtector: RefreshTokenProtector = {
  protect: (value) => Buffer.from(value, "utf8").toString("base64"),
  unprotect: (value) => Buffer.from(value, "base64").toString("utf8"),
};

test("a locally saved token is not written as plaintext and can be removed", () => {
  const localAppData = mkdtempSync(join(tmpdir(), "velog-mcp-test-"));
  const env = { LOCALAPPDATA: localAppData } as NodeJS.ProcessEnv;
  const fixtureToken = "test-refresh-token";

  try {
    saveStoredRefreshToken(fixtureToken, env, testProtector);
    const path = storedTokenPath(env);
    assert.ok(existsSync(path));
    assert.doesNotMatch(readFileSync(path, "utf8"), /test-refresh-token/);
    assert.equal(loadStoredRefreshToken(env, testProtector), fixtureToken);
    assert.equal(removeStoredRefreshToken(env), true);
    assert.equal(existsSync(path), false);
  } finally {
    rmSync(localAppData, { recursive: true, force: true });
  }
});

test("an explicit environment token takes precedence over local credential storage", () => {
  const env = { VELOG_REFRESH_TOKEN: "from-environment" } as NodeJS.ProcessEnv;
  let readStorage = false;

  assert.equal(loadRefreshToken(env, () => {
    readStorage = true;
    return "from-storage";
  }), "from-environment");
  assert.equal(readStorage, false);
});
