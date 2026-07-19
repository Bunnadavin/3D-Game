import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const PORT = Number(process.env.PORT ?? 5173);
const ROOT_DIR = resolve(".");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function getSafeFilePath(requestUrl) {
  const url = new URL(requestUrl, `http://localhost:${PORT}`);
  const requestedPath = decodeURIComponent(url.pathname);
  const normalizedPath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(ROOT_DIR, normalizedPath === "/" ? "index.html" : normalizedPath);
  const resolvedPath = resolve(filePath);

  if (!resolvedPath.startsWith(ROOT_DIR)) {
    return null;
  }

  if (existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()) {
    return join(resolvedPath, "index.html");
  }

  return resolvedPath;
}

const server = createServer((request, response) => {
  const url = new URL(request.url, `http://localhost:${PORT}`);

  if (url.pathname === "/favicon.ico") {
    const faviconPath = join(ROOT_DIR, "favicon.svg");
    if (existsSync(faviconPath)) {
      response.writeHead(200, { "Content-Type": "image/svg+xml" });
      createReadStream(faviconPath).pipe(response);
      return;
    }
  }

  const filePath = getSafeFilePath(request.url);

  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const contentType = contentTypes[extname(filePath)] ?? "application/octet-stream";
  response.writeHead(200, { "Content-Type": contentType });
  createReadStream(filePath).pipe(response);
});

server.listen(PORT, () => {
  console.log(`Game server running at http://localhost:${PORT}`);
});
