import type { IncomingMessage, ServerResponse } from 'node:http'

/** Reject cross-site browser requests; allow same-origin and non-browser callers without Origin. */
export function isSameOrigin(req: IncomingMessage): boolean {
  if (req.headers['sec-fetch-site'] === 'cross-site') return false
  const origin = req.headers.origin
  if (origin === undefined || origin.length === 0) return true
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

/** Read and parse a JSON request body with a bounded size. */
export async function readJsonBody<T = unknown>(
  req: IncomingMessage,
  maxBytes = 64 * 1024,
): Promise<T> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > maxBytes) throw new Error(`request body exceeds ${maxBytes} bytes`)
    chunks.push(buffer)
  }
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text.length === 0) return {} as T
  return JSON.parse(text) as T
}

/** Write a JSON response. */
export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(text),
  })
  res.end(text)
}

/** Write a structured error response. */
export function sendError(res: ServerResponse, status: number, message: string): void {
  sendJson(res, status, { ok: false, error: { message } })
}
