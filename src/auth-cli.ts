#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";

import {
  hasStoredRefreshToken,
  removeStoredRefreshToken,
  saveStoredRefreshToken,
} from "./credentials.js";

const command = process.argv[2];

if (command === "setup") {
  await setup();
} else if (command === "status") {
  console.log(hasStoredRefreshToken() ? "A local Velog credential is configured." : "No local Velog credential is configured.");
} else if (command === "logout") {
  console.log(removeStoredRefreshToken() ? "Local Velog credential removed." : "No local Velog credential was configured.");
} else {
  console.error("Usage: velog-auth <setup|status|logout>");
  process.exitCode = 1;
}

async function setup(): Promise<void> {
  if (process.platform !== "win32") {
    throw new Error("velog-auth setup currently supports Windows only.");
  }

  openVelog();
  console.log("A Velog login page was opened in your browser.");
  console.log("After signing in: F12 > Application > Cookies > https://velog.io > refresh_token.");
  const token = await readSecret("Paste the refresh_token here with Ctrl+V (input is hidden): ");
  saveStoredRefreshToken(token);
  console.log("Saved an encrypted local credential for the current Windows user.");
}

function openVelog(): void {
  const browser = spawn("cmd.exe", ["/c", "start", "", "https://velog.io"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  browser.unref();
}

function readSecret(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return Promise.reject(new Error("Setup requires an interactive terminal."));
  }

  return new Promise((resolve, reject) => {
    let value = "";
    const input = process.stdin;
    const output = process.stdout;
    const wasRaw = input.isRaw;
    output.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");

    const restore = () => {
      input.off("data", onData);
      input.setRawMode(wasRaw ?? false);
      input.pause();
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\r" || character === "\n") {
          restore();
          output.write("\n");
          resolve(value);
          return;
        }
        if (character === "\u0003") {
          restore();
          output.write("\n");
          reject(new Error("Setup cancelled."));
          return;
        }
        if (character === "\b" || character === "\u007f") {
          value = value.slice(0, -1);
        } else if (character === "\u0016") {
          value += readClipboard();
        } else {
          value += character;
        }
      }
    };
    input.on("data", onData);
  });
}

function readClipboard(): string {
  try {
    return execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Get-Clipboard -Raw"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
  } catch {
    throw new Error("Could not read the clipboard. Use Shift+Insert or right-click to paste instead.");
  }
}
