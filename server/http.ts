import { createServer, type Server, type ServerResponse } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Poller } from './poller.js'

const WEB_DIST = fileURLToPath(new URL('../../web/dist/', import.meta.url))

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.map': 'application/json',
  '.woff2': 'font/woff2',
}

export interface Started {
  server: Server
  port: number
  url: string
}

export function startHttp(poller: Poller, preferredPort: number): Promise<Started> {
  const server = createServer((req, res) => {
    void handle(req.url ?? '/', res, poller)
  })
  return listen(server, preferredPort, 10)
}

async function handle(url: string, res: ServerResponse, poller: Poller): Promise<void> {
  const path = url.split('?')[0] ?? '/'

  if (path === '/api/state') {
    const snapshot = poller.current()
    res.writeHead(snapshot ? 200 : 503, { 'content-type': 'application/json' })
    res.end(JSON.stringify(snapshot ?? { error: 'first poll still running' }))
    return
  }

  if (path === '/api/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    })
    const send = (data: unknown): void => {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }
    const current = poller.current()
    if (current) send(current)
    const unsubscribe = poller.onState(send)
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000)
    res.on('close', () => {
      unsubscribe()
      clearInterval(ping)
    })
    return
  }

  await serveStatic(path, res)
}

async function serveStatic(path: string, res: ServerResponse): Promise<void> {
  const rel = path === '/' ? 'index.html' : path.slice(1)
  const file = normalize(join(WEB_DIST, rel))
  if (!file.startsWith(WEB_DIST)) {
    res.writeHead(403).end()
    return
  }
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    // SPA fallback — unknown paths get the app shell.
    try {
      const index = await readFile(join(WEB_DIST, 'index.html'))
      res.writeHead(200, { 'content-type': MIME['.html'] ?? 'text/html' })
      res.end(index)
    } catch {
      res.writeHead(500, { 'content-type': 'text/plain' })
      res.end('web/dist missing — run `npm run build`')
    }
  }
}

function listen(server: Server, port: number, attemptsLeft: number): Promise<Started> {
  return new Promise((resolve, reject) => {
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
        resolve(listen(server, port + 1, attemptsLeft - 1))
      } else {
        reject(err)
      }
    })
    server.listen(port, '127.0.0.1', () => {
      resolve({ server, port, url: `http://localhost:${port}` })
    })
  })
}
