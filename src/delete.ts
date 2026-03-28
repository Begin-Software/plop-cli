import { getToken } from "./auth";

const API_URL = "https://plop.so";

export async function del(input: string): Promise<void> {
  const token = getToken();
  if (!token) {
    console.error("Not logged in. Run: plop login");
    process.exit(1);
  }

  // Strip extension if present
  const id = input.includes(".") ? input.slice(0, input.indexOf(".")) : input;

  const res = await fetch(`${API_URL}/plop/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    try {
      const body = (await res.json()) as { error: string };
      console.error(body.error);
    } catch {
      console.error(`Delete failed (${res.status})`);
    }
    process.exit(1);
  }

  console.log(`Deleted ${id}`);
}
