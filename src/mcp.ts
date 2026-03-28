import { getToken } from "./auth";

const MCP_URL = "https://mcp.plop.so/mcp";

export async function mcp(): Promise<void> {
  const token = getToken();
  if (!token) {
    console.error("Not logged in. Run: plop login");
    process.exit(1);
  }

  // Read JSON-RPC messages from stdin, forward to MCP server, write responses to stdout
  let sessionId: string | null = null;

  const decoder = new TextDecoder();
  let buffer = "";

  for await (const chunk of Bun.stdin.stream()) {
    buffer += decoder.decode(chunk, { stream: true });

    // Process complete JSON-RPC messages (one per line)
    let newlineIdx;
    while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (!line) continue;

      try {
        const message = JSON.parse(line);
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Accept": "application/json, text/event-stream",
          "Authorization": `Bearer ${token}`,
        };
        if (sessionId) {
          headers["mcp-session-id"] = sessionId;
        }

        const res = await fetch(MCP_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(message),
        });

        // Capture session ID from response
        const sid = res.headers.get("mcp-session-id");
        if (sid) sessionId = sid;

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("text/event-stream")) {
          // Handle SSE response
          const text = await res.text();
          for (const line of text.split("\n")) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              if (data) {
                process.stdout.write(data + "\n");
              }
            }
          }
        } else {
          // Handle JSON response
          const data = await res.text();
          if (data.trim()) {
            process.stdout.write(data.trim() + "\n");
          }
        }
      } catch (e) {
        console.error("MCP bridge error:", e);
      }
    }
  }
}
