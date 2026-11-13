import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT) || 4173;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const relative = normalize(requested).replace(/^([/\\])+/, "");
    const filePath = join(root, relative);

    if (!filePath.startsWith(root.endsWith(sep) ? root : root + sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": types[extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(file);
  } catch (error) {
    if (error?.code === "ENOENT") {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(500).end("Internal server error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Matei Sîrghe — Curriculum Vitae running at http://127.0.0.1:${port}`);
});
