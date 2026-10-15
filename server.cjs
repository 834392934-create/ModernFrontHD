"use strict";
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path");
const root = __dirname,
  port = Number(process.argv[2]) || Number(process.env.PORT) || 8765;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
const server = http.createServer((req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ app: "modern-front-hd", version: "1.0.0" }));
      return;
    }
    const relative =
      decodeURIComponent(url.pathname).replace(/^[/\\]+/, "") || "index.html";
    const target = path.resolve(root, relative);
    if (
      !target.startsWith(root + path.sep) ||
      relative.split(/[/\\]/).some((p) => p.startsWith("."))
    ) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fs.readFile(target, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.writeHead(200, {
        "Content-Type":
          mime[path.extname(target)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(data);
    });
  } catch {
    res.writeHead(400);
    res.end("Bad request");
  }
});
server.on("error", (e) => {
  console.error("无法启动本地服务器：" + e.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log("现代战线 HD：http://127.0.0.1:" + port + " / Ctrl+C 停止"),
);
