import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { describe, expect, it, vi } from 'vitest'
import { isSameOrigin, readJsonBody, sendError, sendJson } from 'dsh-shared-meta'

function request(headers: Record<string, string>): IncomingMessage {
  return { headers } as unknown as IncomingMessage
}

function response() {
  const writeHead = vi.fn()
  const end = vi.fn()
  return { res: { writeHead, end } as unknown as ServerResponse, writeHead, end }
}

describe('same-origin guard', () => {
  it('allows non-browser and matching origins', () => {
    expect(isSameOrigin(request({ host: '127.0.0.1:3080' }))).toBe(true)
    expect(
      isSameOrigin(request({ host: '127.0.0.1:3080', origin: 'http://127.0.0.1:3080' })),
    ).toBe(true)
  })

  it('rejects cross-site and mismatched origins', () => {
    expect(
      isSameOrigin(request({ host: '127.0.0.1:3080', 'sec-fetch-site': 'cross-site' })),
    ).toBe(false)
    expect(
      isSameOrigin(request({ host: '127.0.0.1:3080', origin: 'https://example.com' })),
    ).toBe(false)
    expect(isSameOrigin(request({ host: '127.0.0.1:3080', origin: 'not a url' }))).toBe(false)
  })
})

describe('json body reader', () => {
  it('reads a bounded JSON body and treats an empty body as an object', async () => {
    const body = Readable.from([Buffer.from('{"goal":"weekly report"}')])
    await expect(readJsonBody(body as unknown as IncomingMessage)).resolves.toEqual({
      goal: 'weekly report',
    })
    const empty = Readable.from([])
    await expect(readJsonBody(empty as unknown as IncomingMessage)).resolves.toEqual({})
  })

  it('rejects an oversized body', async () => {
    const body = Readable.from([Buffer.from('{"x":"' + 'a'.repeat(100) + '"}')])
    await expect(
      readJsonBody(body as unknown as IncomingMessage, 20),
    ).rejects.toThrow('exceeds')
  })
})

describe('json response writer', () => {
  it('writes JSON with no-store caching', () => {
    const { res, writeHead, end } = response()
    sendJson(res, 200, { ok: true })
    expect(writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({ 'content-type': 'application/json; charset=utf-8' }),
    )
    expect(end).toHaveBeenCalledWith('{"ok":true}')
  })

  it('writes a structured error', () => {
    const { res, writeHead, end } = response()
    sendError(res, 401, 'authentication required')
    expect(writeHead).toHaveBeenCalledWith(401, expect.any(Object))
    expect(end).toHaveBeenCalledWith(
      '{"ok":false,"error":{"message":"authentication required"}}',
    )
  })
})
