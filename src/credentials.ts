import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const encryptedTokenFile = "refresh-token.dpapi";

export interface RefreshTokenProtector {
  protect(plaintext: string): string;
  unprotect(ciphertext: string): string;
}

export function storedTokenPath(env: NodeJS.ProcessEnv = process.env): string {
  const localAppData = env.LOCALAPPDATA?.trim() || join(homedir(), "AppData", "Local");
  return join(localAppData, "velog-mcp", encryptedTokenFile);
}

export function loadStoredRefreshToken(
  env: NodeJS.ProcessEnv = process.env,
  protector: RefreshTokenProtector = windowsDpapiProtector,
): string | undefined {
  if (process.platform !== "win32") return undefined;

  const path = storedTokenPath(env);
  if (!existsSync(path)) return undefined;

  try {
    return protector.unprotect(readFileSync(path, "utf8")).trim() || undefined;
  } catch {
    return undefined;
  }
}

export function saveStoredRefreshToken(
  token: string,
  env: NodeJS.ProcessEnv = process.env,
  protector: RefreshTokenProtector = windowsDpapiProtector,
): void {
  requireWindows();
  const value = token.trim();
  if (!value) throw new Error("A Velog refresh token is required.");

  const path = storedTokenPath(env);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const encrypted = protector.protect(value);
  writeFileSync(path, encrypted, { encoding: "utf8", mode: 0o600 });
}

export function hasStoredRefreshToken(env: NodeJS.ProcessEnv = process.env): boolean {
  return process.platform === "win32" && existsSync(storedTokenPath(env));
}

export function removeStoredRefreshToken(env: NodeJS.ProcessEnv = process.env): boolean {
  requireWindows();
  const path = storedTokenPath(env);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}

function requireWindows(): void {
  if (process.platform !== "win32") {
    throw new Error("Local credential storage is currently supported on Windows only.");
  }
}

function runPowerShell(script: string, input: string): string {
  try {
    return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      input,
      stdio: ["pipe", "pipe", "ignore"],
      windowsHide: true,
    });
  } catch {
    throw new Error("Could not access the local encrypted credential store.");
  }
}

const windowsDpapiProtector: RefreshTokenProtector = {
  protect: (plaintext) => runPowerShell(encryptScript, plaintext),
  unprotect: (ciphertext) => runPowerShell(decryptScript, ciphertext),
};

const encryptScript = [
  "$ErrorActionPreference = 'Stop'",
  "Add-Type -AssemblyName System.Security",
  "$plain = [Console]::In.ReadToEnd()",
  "$bytes = [Text.Encoding]::UTF8.GetBytes($plain)",
  "$encrypted = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)",
  "[Console]::Out.Write([Convert]::ToBase64String($encrypted))",
].join("; ");

const decryptScript = [
  "$ErrorActionPreference = 'Stop'",
  "Add-Type -AssemblyName System.Security",
  "$encrypted = [Convert]::FromBase64String([Console]::In.ReadToEnd())",
  "$bytes = [Security.Cryptography.ProtectedData]::Unprotect($encrypted, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)",
  "[Console]::OpenStandardOutput().Write($bytes, 0, $bytes.Length)",
].join("; ");
