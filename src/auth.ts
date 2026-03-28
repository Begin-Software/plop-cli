import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const AUTH0_DOMAIN = "dev-q4qag76qq7ai5we8.us.auth0.com";
const AUTH0_CLIENT_ID = "dDnceSVZAPSIYd2nZtt31FkCqpx8HTTl";
const AUTH0_AUDIENCE = "https://plop.so";
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
  // Request device code
  const codeRes = await fetch(`https://${AUTH0_DOMAIN}/oauth/device/code`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: AUTH0_CLIENT_ID,
      audience: AUTH0_AUDIENCE,
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
    interval = 5,
  } = (await codeRes.json()) as {
    device_code: string;
    user_code: string;
    verification_uri_complete: string;
    interval: number;
  };

  console.log(`\nVisit: ${verification_uri_complete}`);
  console.log(`Code:  ${user_code}\n`);

  // Open browser
  const openCmd = process.platform === "win32" ? ["cmd", "/c", "start", verification_uri_complete]
    : process.platform === "darwin" ? ["open", verification_uri_complete]
    : ["xdg-open", verification_uri_complete];
  Bun.spawn(openCmd);

  // Poll for token
  while (true) {
    await Bun.sleep(interval * 1000);

    const tokenRes = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: AUTH0_CLIENT_ID,
        device_code,
      }),
    });

    const body = (await tokenRes.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (body.access_token) {
      mkdirSync(CONFIG_DIR, { recursive: true });
      const config: TokenConfig = {
        access_token: body.access_token,
        expires_at: Date.now() + (body.expires_in || 86400) * 1000,
      };
      writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      console.log("Logged in.");
      return;
    }

    if (body.error === "authorization_pending") continue;
    if (body.error === "slow_down") {
      await Bun.sleep(2000);
      continue;
    }

    console.error(`Auth failed: ${body.error}`);
    process.exit(1);
  }
}
