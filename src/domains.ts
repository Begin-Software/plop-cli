import { getToken } from "./auth";
import { exec } from "child_process";

const API_URL = "https://plop.so";

function requireToken(): string {
  const token = getToken();
  if (!token) {
    console.error("Not logged in. Run: plop login");
    process.exit(1);
  }
  return token;
}

function openUrl(url: string): void {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  exec(`${cmd} "${url}"`);
}

export async function addDomain(hostname: string): Promise<void> {
  const token = requireToken();

  const res = await fetch(`${API_URL}/api/domains`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ hostname }),
  });

  if (!res.ok) {
    try {
      const body = (await res.json()) as { error: string };
      console.error(body.error);
    } catch {
      console.error(`Add domain failed (${res.status})`);
    }
    process.exit(1);
  }

  const data = (await res.json()) as { checkout_url: string };

  console.log(`Custom domains are $5/mo each.`);
  console.log(`\nComplete payment to activate ${hostname}:`);
  console.log(`  ${data.checkout_url}`);
  console.log(`\nOpening browser...`);
  openUrl(data.checkout_url);
  console.log(`\nAfter payment, the domain will be registered automatically.`);
  console.log(`\nDNS setup required:`);

  const parts = hostname.split(".");
  const isApex = parts.length <= 2;

  if (isApex) {
    console.log(`  ${hostname} is an apex domain. Setup requires verification records`);
    console.log(`  before adding A records for traffic.`);
    console.log(`\n  Visit https://plop.so/account for guided setup with the exact`);
    console.log(`  DNS records needed (TXT for verification, CNAME for SSL, then A records).`);
  } else {
    console.log(`  Add a CNAME record at your DNS provider:`);
    console.log(`    Type:   CNAME`);
    console.log(`    Name:   ${parts[0]}`);
    console.log(`    Target: plop.so`);
  }

  console.log(`\nGuide the user through adding this DNS record at their DNS provider's settings.`);
  console.log(`The domain will not work until DNS is configured and propagated.`);
  console.log(`\nCheck configuration status at: https://plop.so/account`);
}

export async function removeDomain(hostname: string): Promise<void> {
  const token = requireToken();

  const res = await fetch(`${API_URL}/api/domains`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ hostname }),
  });

  if (!res.ok) {
    try {
      const body = (await res.json()) as { error: string };
      console.error(body.error);
    } catch {
      console.error(`Remove domain failed (${res.status})`);
    }
    process.exit(1);
  }

  const data = (await res.json()) as {
    hostname: string;
    status: string;
    activeUntil: number | null;
    message: string;
  };

  console.log(data.message);
}

export async function listDomains(): Promise<void> {
  const token = requireToken();

  const res = await fetch(`${API_URL}/api/domains`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    try {
      const body = (await res.json()) as { error: string };
      console.error(body.error);
    } catch {
      console.error(`List domains failed (${res.status})`);
    }
    process.exit(1);
  }

  const data = (await res.json()) as {
    subdomain: { name: string; url: string } | null;
    customDomains: {
      hostname: string;
      status: string;
      subscriptionStatus: string | null;
      currentPeriodEnd: number | null;
    }[];
  };

  if (data.subdomain) {
    console.log(`Subdomain: ${data.subdomain.url}`);
  } else {
    console.log("Subdomain: (none — run plop claim <username>)");
  }

  if (data.customDomains.length > 0) {
    console.log(`\nCustom domains:`);
    for (const d of data.customDomains) {
      const status = d.subscriptionStatus || d.status;
      console.log(`  ${d.hostname} [${status}]`);
    }
  } else {
    console.log("\nCustom domains: (none)");
  }
}
