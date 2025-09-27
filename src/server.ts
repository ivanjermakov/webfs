import { createReadStream } from 'fs'
import { readdir, stat } from 'fs/promises'
import { createServer, IncomingMessage, ServerResponse } from 'http'
import { extname, join, normalize, relative, resolve, sep } from 'path'
import { exit } from 'process'

function streamFile(filePath: string, res: ServerResponse) {
    const ext = extname(filePath).toLowerCase()
    const ctype = contentType[ext] ?? contentType['.txt']
    res.setHeader('Content-Type', ctype)
    const stream = createReadStream(filePath)
    stream.on('error', () => {
        res.statusCode = 500
        res.end('Server error')
    })
    stream.pipe(res)
}

function log(msg: string, e?: Error): void {
    const ts = new Date().toISOString()
    console.log(`${ts} ${msg}`)
    if (e) console.trace(e)
}

function logRequest(req: IncomingMessage): void {
    const addr = (req.socket && (req.socket.remoteAddress || req.socket.remoteFamily)) || '-'
    const method = req.method || '-'
    const url = req.url || '-'
    log(`${addr} "${method} ${url}"`)
}

const contentType: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
    logRequest(req)
    const host = req.headers.host ?? 'localhost';
    const rawUrl = `http://${host}${req.url ?? '/'}`;
    const url = new URL(rawUrl);

    if (url.pathname.startsWith('/api')) {
        if (req.url === '/api/files') {
            const files = await listFiles(rootPath)
            res.statusCode = 200
            res.setHeader("Content-Type", contentType['.json']);
            res.end(JSON.stringify(files))
            return
        }
        if (url.pathname.startsWith('/api/file')) {
            const filePath = url.searchParams.get('path')
            if (filePath === undefined) throw Error('no path')
            const truePath = normalize(join(rootPath, filePath!))
            const stats = await stat(truePath)
            if (stats.isFile()) {
                streamFile(truePath, res)
                return
            }
        }
        throw Error()
    }

    if (await tryServeFile(req.url, res, distPath)) {
        return
    }

    if (await tryServeFile('/', res, distPath)) {
        return
    }

    throw Error()
}

async function tryServeFile(url: string | undefined, res: ServerResponse, root: string): Promise<boolean> {
    try {
        let urlPath = decodeURIComponent(url ?? '/')
        if (urlPath === '/') urlPath = '/index.html'
        const truePath = normalize(join(root, urlPath))
        if (!truePath.startsWith(normalize(root + sep))) return false

        const stats = await stat(truePath)
        if (stats.isFile()) {
            streamFile(truePath, res)
            return true
        }
        return false
    } catch (e) {
        return false
    }
}

async function listFiles(root: string): Promise<string[]> {
    const rootAbs = resolve(root);
    const results: string[] = [];

    async function walk(dir: string) {
        const entries = await readdir(dir, { withFileTypes: true });
        await Promise.all(entries.map(async (ent) => {
            const abs = join(dir, ent.name);
            if (ent.isDirectory()) {
                await walk(abs);
            } else if (ent.isFile()) {
                const rel = relative(rootAbs, abs).split(sep).join('/');
                results.push(rel);
            }
        }));
    }

    await walk(rootAbs);
    return results;
}

const port = parseInt(process.env.WEBFS_PORT ?? '3000', 10)
const distPath = process.env.WEBFS_DIST!
const rootPath = process.env.WEBFS_ROOT!

if (!distPath) {
    log('no dist path')
    exit(1)
}
if (!rootPath) {
    log('no root path')
    exit(1)
}

const server = createServer((req, res) => {
    handleRequest(req, res).catch(e => {
        log('request error', e)
        res.statusCode = 500
        res.end('Server error')
    })
})

server.listen(port, () => {
    log(`Serving ${rootPath} at port ${port}/`)
})
