import { loadStoredRefreshToken } from "./credentials.js";

export type VelogConfig = {
  refreshToken?: string;
  allowPublic: boolean;
};

const trueValues = new Set(["1", "true", "yes", "on"]);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): VelogConfig {
  const refreshToken = env.VELOG_REFRESH_TOKEN?.trim();
  return {
    refreshToken: refreshToken || undefined,
    allowPublic: trueValues.has(env.VELOG_ALLOW_PUBLIC?.trim().toLowerCase() ?? ""),
  };
}

export function loadRefreshToken(
  env: NodeJS.ProcessEnv = process.env,
  storedToken: () => string | undefined = () => loadStoredRefreshToken(env),
): string | undefined {
  return loadConfig(env).refreshToken ?? storedToken();
}
