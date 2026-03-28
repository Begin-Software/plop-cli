import { getToken } from "./auth";

const API_URL = "https://plop.so";

export async function claim(username: string): Promise<void> {
  const token = getToken();
  if (!token) {
    console.error("Not logged in. Run: plop login");
    process.exit(1);
  }

  const res = await fetch(`${API_URL}/api/claim`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username }),
  });

  if (!res.ok) {
    try {
      const body = (await res.json()) as { error: string };
      console.error(body.error);
    } catch {
      console.error(`Claim failed (${res.status})`);
    }
    process.exit(1);
  }

  const data = (await res.json()) as { subdomain: string; url: string };
  console.log(`Claimed ${data.subdomain} — ${data.url}`);
}
