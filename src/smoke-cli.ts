import { loadConfig, loadRefreshToken } from "./config.js";
import { saveStoredRefreshToken } from "./credentials.js";
import { VelogGateway } from "./velog-gateway.js";

if (!process.argv.includes("--confirm")) {
  console.error("This command creates one private Velog post. Re-run with --confirm to continue.");
  process.exitCode = 1;
} else {
  await runSmokeTest();
}

async function runSmokeTest(): Promise<void> {
  const config = loadConfig();
  const refreshToken = loadRefreshToken();
  if (!refreshToken) {
    throw new Error("No Velog credential is configured. Run velog-auth setup first.");
  }

  const gateway = new VelogGateway(
    fetch,
    undefined,
    refreshToken,
    config.refreshToken ? undefined : (token) => saveStoredRefreshToken(token),
  );
  const user = await gateway.currentUser();
  if (!user) throw new Error("Velog did not return an authenticated user.");

  const nonce = Date.now();
  const title = `Velog MCP smoke ${nonce}`;
  const urlSlug = `velog-mcp-smoke-${nonce}`;
  const body = "## Velog MCP smoke test\n\nThis private post verifies authenticated writing and read-back.";
  const written = await gateway.writePost({
    title,
    body,
    tags: ["velog-mcp-smoke"],
    urlSlug,
    isTemp: false,
    isPrivate: true,
  });
  const readBack = await gateway.getPost({ username: user.username, urlSlug: written.url_slug ?? urlSlug });
  if (!readBack || readBack.id !== written.id || readBack.title !== title || readBack.body !== body) {
    throw new Error("The private post could not be verified by read-back.");
  }

  console.log("Private publish and authenticated read-back succeeded.");
}
