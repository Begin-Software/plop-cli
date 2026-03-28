import { getToken } from "./auth";

const API_URL = "https://plop.so";

export async function upload(filePath: string, alias?: string): Promise<void> {
  const token = getToken();
  if (!token) {
    console.error("Not logged in. Run: plop login");
    process.exit(1);
  }

  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const formData = new FormData();
  formData.append("file", file);
  if (alias) {
    formData.append("alias", alias);
  }

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (res.status === 429) {
    const body = (await res.json()) as { error: string; tier: string; upgrade_url?: string };
    console.error(`Upload blocked: ${body.error}`);
    if (body.tier === "free") {
      console.error("Upgrade to Pro at https://plop.so/account");
    }
    process.exit(1);
  }

  if (!res.ok) {
    try {
      const body = (await res.json()) as { error: string };
      console.error(body.error);
    } catch {
      console.error(`Upload failed (${res.status})`);
    }
    process.exit(1);
  }

  const data = (await res.json()) as {
    url: string;
    alias_url?: string;
    replaced_plop_id?: string;
  };

  console.log(data.url);
  if (data.alias_url) {
    console.log(data.alias_url);
  }
  if (data.replaced_plop_id) {
    console.error(`Replaced plop: ${data.replaced_plop_id}`);
  }
}
