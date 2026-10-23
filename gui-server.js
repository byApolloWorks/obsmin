"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const { spawn } = require("child_process");
const { obfuscateProject } = require("./core/dispatcher");
const { runDoctor } = require("./core/doctor");
const { PRESETS } = require("./core/presets");

const WEB_DIR = path.join(__dirname, "web");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

function serveStatic(req, res, pathname) {
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(WEB_DIR, safePath === "/" ? "index.html" : safePath);
  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function getShortcuts() {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  const list = [
    { name: "Current", path: process.cwd() },
    ...(home
      ? [
          { name: "Home", path: home },
          { name: "Desktop", path: path.join(home, "Desktop") },
          { name: "Downloads", path: path.join(home, "Downloads") },
          { name: "Documents", path: path.join(home, "Documents") }
        ]
      : [])
  ];
  return list.filter((s) => {
    try {
      return fs.existsSync(s.path) && fs.statSync(s.path).isDirectory();
    } catch {
      return false;
    }
  });
}

function chooseFolderNative(title = "Choose Folder") {
  return new Promise((resolve) => {
    if (process.platform === "darwin") {
      const escaped = title.replace(/"/g, '\\"');
      const script = `POSIX path of (choose folder with prompt "${escaped}")`;
      const child = spawn("osascript", ["-e", script]);
      let stdout = "";
      child.stdout?.on("data", (d) => (stdout += d.toString()));
      child.on("close", (code) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          resolve(null);
        }
      });
      child.on("error", () => resolve(null));
      return;
    }

    if (process.platform === "win32") {
      const ps = `Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = '${title.replace(/'/g, "''")}'; if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath }`;
      const child = spawn("powershell", ["-NoProfile", "-Command", ps]);
      let stdout = "";
      child.stdout?.on("data", (d) => (stdout += d.toString()));
      child.on("close", (code) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          resolve(null);
        }
      });
      child.on("error", () => resolve(null));
      return;
    }

    if (process.platform === "linux") {
      const child = spawn("zenity", ["--file-selection", "--directory", `--title=${title}`]);
      let stdout = "";
      child.stdout?.on("data", (d) => (stdout += d.toString()));
      child.on("close", (code) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          resolve(null);
        }
      });
      child.on("error", () => resolve(null));
      return;
    }

    resolve(null);
  });
}

function startServer(port) {
  const server = http.createServer(async (req, res) => {
    const parsed = url.parse(req.url, true);

    if (parsed.pathname === "/api/presets" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(PRESETS));
      return;
    }

    if (parsed.pathname === "/api/doctor" && req.method === "GET") {
      const report = runDoctor();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(report));
      return;
    }

    if (parsed.pathname === "/api/browse" && req.method === "GET") {
      const target = parsed.query.path ? String(parsed.query.path) : process.env.HOME || process.cwd();
      try {
        const entries = fs
          .readdirSync(target, { withFileTypes: true })
          .filter((e) => e.isDirectory() && !e.name.startsWith("."))
          .map((e) => e.name)
          .sort();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ path: target, parent: path.dirname(target), entries, shortcuts: getShortcuts() }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message, shortcuts: getShortcuts() }));
      }
      return;
    }

    if (parsed.pathname === "/api/choose-folder" && req.method === "POST") {
      let body = {};
      try {
        body = await readJsonBody(req);
      } catch {}
      const picked = await chooseFolderNative(body.title || "Choose Folder");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ path: picked }));
      return;
    }

    if (parsed.pathname === "/api/run" && req.method === "POST") {
      let payload;
      try {
        payload = await readJsonBody(req);
      } catch (err) {
        res.writeHead(400);
        res.end("Invalid JSON body");
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });

      const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

      try {
        const result = await obfuscateProject({
          projectPath: payload.projectPath,
          presetName: payload.preset || undefined,
          outDir: payload.outDir,
          onProgress: send
        });
        send({ stage: "result", status: "done", message: "Finished", result });
      } catch (err) {
        send({ stage: "result", status: "error", message: err.message });
      } finally {
        res.end();
      }
      return;
    }

    if (req.method === "GET") {
      serveStatic(req, res, parsed.pathname);
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      const openUrl = `http://localhost:${port}`;
      import("open")
        .then((mod) => mod.default(openUrl))
        .catch(() => {
          /* best effort - user can open the URL manually */
        });
      resolve(openUrl);
    });
  });
}

module.exports = { startServer };
