import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const PLOP_URL = "https://plop.so";
const CONFIG_DIR = join(homedir(), ".plop");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

interface TokenConfig {
  access_token: string;
  expires_at: number;
}

export function getToken(): string | null {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    const config: TokenConfig = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
    if (Date.now() > config.expires_at) {
      return null;
    }
    return config.access_token;
  } catch {
    return null;
  }
}

export async function login(): Promise<void> {
  // Request device code from better-auth
  const codeRes = await fetch(`${PLOP_URL}/api/auth/device/code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope: "openid",
    }),
  });

  if (!codeRes.ok) {
    const body = await codeRes.text();
    console.error(`Failed to request device code (${codeRes.status}): ${body}`);
    process.exit(1);
  }

  const {
    device_code,
    user_code,
    verification_uri_complete,
    verification_uri,
    interval = 5,
    expires_in = 1800,
  } = (await codeRes.json()) as {
    device_code: string;
    user_code: string;
    verification_uri: string;
    verification_uri_complete: string;
    interval: number;
    expires_in: number;
  };

  const verifyUrl = verification_uri_complete || verification_uri;
  console.log(`\nVisit: ${verifyUrl}`);
  console.log(`Code:  ${user_code}\n`);

  // Open browser
  const openCmd = process.platform === "win32" ? ["cmd", "/c", "start", verifyUrl]
    : process.platform === "darwin" ? ["open", verifyUrl]
    : ["xdg-open", verifyUrl];
  Bun.spawn(openCmd);

  // Poll for token
  const deadline = Date.now() + expires_in * 1000;
  let pollInterval = interval;

  while (Date.now() < deadline) {
    await Bun.sleep(pollInterval * 1000);

    const tokenRes = await fetch(`${PLOP_URL}/api/auth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    const body = (await tokenRes.json()) as {
      access_token?: string;
      token?: string;
      expires_in?: number;
      error?: string;
    };

    const token = body.access_token || body.token;
    if (token) {
      mkdirSync(CONFIG_DIR, { recursive: true });
      const config: TokenConfig = {
        access_token: token,
        expires_at: Date.now() + (body.expires_in || 86400) * 1000,
      };
      writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log("Logged in.");
      return;
    }

    if (body.error === "authorization_pending") continue;
    if (body.error === "slow_down") {
      pollInterval += 1;
      continue;
    }

    console.error(`Auth failed: ${body.error}`);
    process.exit(1);
  }

  console.error("Device code expired. Please try again.");
  process.exit(1);
}
