import { createReadStream } from "fs";
import { readdir, stat } from "fs/promises";
import http from "http";
import path from "path";

const port = parseInt(process.env.WEBFS_PORT || "3000", 10);
const root = process.env.WEBFS_ROOT || process.cwd();

function streamFile(filePath: string, res: http.ServerResponse) {
    const ext = path.extname(filePath).toLowerCase();
    const ctype = contentType[ext] ?? "application/octet-stream"
    res.setHeader("Content-Type", ctype);
    const stream = createReadStream(filePath);
    stream.on("error", () => { res.statusCode = 500; res.end("Server error"); });
    stream.pipe(res);
}

function log(msg: string): void {
    const ts = new Date().toISOString();
    console.log(`${ts} ${msg}`);
}

function logRequest(req: http.IncomingMessage): void {
    const addr = (req.socket && (req.socket.remoteAddress || req.socket.remoteFamily)) || "-";
    const method = req.method || "-";
    const url = req.url || "-";
    log(`${addr} "${method} ${url}"`);
}

const contentType: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8",
    ".wav": "audio/wav",
    ".mp4": "video/mp4",
    ".woff": "font/woff",
    ".woff2": "font/woff2"
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    logRequest(req)

    const urlPath = decodeURIComponent(new URL(req.url || "/", `http://localhost`).pathname);
    const safePath = path.normalize(path.join(root, urlPath));
    if (!safePath.startsWith(path.normalize(root + path.sep))) {
        res.statusCode = 403;
        res.end("Forbidden");
        return;
    }

    const stats = await stat(safePath).catch(() => null);
    if (!stats) {
        res.statusCode = 404;
        res.end("Not found");
        return;
    }

    if (stats.isDirectory()) {
        const index = path.join(safePath, "index.html");
        const indexStats = await stat(index).catch(() => null);
        if (indexStats && indexStats.isFile()) {
            streamFile(index, res);
            return;
        }

        const entries = await readdir(safePath, { withFileTypes: true }).catch(() => null);
        if (!entries) {
            res.statusCode = 500;
            res.end("Server error");
            return;
        }

        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.write("<!doctype html><meta charset='utf-8'><title>Index</title><ul>");
        const rel = path.relative(root, safePath);
        if (rel) {
            const up = path.posix.join("/", rel.split(path.sep).map(() => "..").join("/"));
            res.write(`<li><a href="${up}">..</a></li>`);
        }
        for (const e of entries) {
            const name = e.name + (e.isDirectory() ? "/" : "");
            const href = encodeURI(
                path.posix.join(
                    "/",
                    path.relative(root, path.join(safePath, e.name)).split(path.sep).join("/")
                )
            );
            res.write(`<li><a href="${href}">${name}</a></li>`);
        }
        res.end("</ul>");
        return;
    }

    if (stats.isFile()) {
        streamFile(safePath, res);
        return;
    }

    res.statusCode = 403;
    res.end("Forbidden");
}

const server = http.createServer((req, res) => {
    handleRequest(req, res).catch(e => {
        console.error(e)
        if (!res.headersSent) res.statusCode = 500;
        res.end("Server error");
    })
});

server.listen(port, () => {
    console.log(`Serving ${root} at http://localhost:${port}/`);
});