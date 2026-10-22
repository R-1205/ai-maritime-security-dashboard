/* CRP-317 · Maritime Security Dashboard — static server
 * Zero-dependency Node server so the dashboard deploys on Railway
 * (or any Node host) without a build step. */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf"
};

const server = http.createServer((req, res) => {
  const url = (req.url || "/").split("?")[0];

  if (url === "/health" || url === "/healthz") {
    res.writeHead(200, { "Content-Type": MIME[".json"] });
    res.end(JSON.stringify({ status: "ok", service: "crp-317-maritime-dashboard" }));
    return;
  }

  const rel = url === "/" ? "index.html" : decodeURIComponent(url).replace(/^\/+/, "");
  const file = path.normalize(path.join(ROOT, rel));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>404</h1><p>Not found — try <a href='/'>the dashboard</a>.</p>");
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "public, max-age=300"
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`CRP-317 maritime dashboard listening on port ${PORT}`);
});
