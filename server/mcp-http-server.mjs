import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { handleJsonRpcMessage } from './mcp-core.mjs'
import { writeMcpStatus } from './kanban-store.mjs'

const host = process.env.KANBAN_MCP_HOST || process.env.KANBAN_HOST || '127.0.0.1'
const port = Number(process.env.KANBAN_MCP_PORT || 4175)
const endpoint = process.env.KANBAN_MCP_PATH || '/mcp'
const sessionId = randomUUID()

let heartbeatTimer = null

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,DELETE',
  'Access-Control-Allow-Headers': 'Accept, Content-Type, Mcp-Session-Id, MCP-Protocol-Version',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, MCP-Protocol-Version',
  'Cache-Control': 'no-store',
  'Mcp-Session-Id': sessionId,
  'MCP-Protocol-Version': '2024-11-05',
}

const sendJson = (res, status, value) => {
  const body = value === undefined ? '' : JSON.stringify(value)
  res.writeHead(status, {
    ...headers,
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(body)
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk) => {
      body += chunk
      if (body.length > 2_000_000) {
        reject(new Error('Request body is too large.'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })

const handleRpcPayload = async (payload) => {
  if (Array.isArray(payload)) {
    const responses = (await Promise.all(payload.map(handleJsonRpcMessage))).filter(Boolean)
    return responses.length ? responses : null
  }

  return handleJsonRpcMessage(payload)
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204)
      return
    }

    const url = new URL(req.url || '/', `http://${host}:${port}`)

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true, endpoint, sessionId })
      return
    }

    if (url.pathname !== endpoint) {
      sendJson(res, 404, { error: 'Not found' })
      return
    }

    if (req.method === 'GET') {
      res.writeHead(405, {
        ...headers,
        Allow: 'POST, OPTIONS, DELETE',
        'Content-Type': 'application/json; charset=utf-8',
      })
      res.end(JSON.stringify({ error: 'Use POST for MCP JSON-RPC messages.' }))
      return
    }

    if (req.method === 'DELETE') {
      sendJson(res, 200, { ok: true })
      return
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed' })
      return
    }

    const rawBody = await readBody(req)
    const response = await handleRpcPayload(JSON.parse(rawBody))
    if (!response) {
      res.writeHead(202, headers)
      res.end()
      return
    }

    sendJson(res, 200, response)
  } catch (error) {
    sendJson(res, 500, {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32603, message: error.message },
    })
  }
})

const startHeartbeat = () => {
  const heartbeat = () => {
    void writeMcpStatus({ connected: true }).catch((error) => console.error(error))
  }

  heartbeat()
  heartbeatTimer = setInterval(heartbeat, 5000)
}

const stop = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  void writeMcpStatus({ connected: false }).finally(() => process.exit(0))
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)

server.listen(port, host, () => {
  startHeartbeat()
  console.log(`Kanban MCP HTTP listening on http://${host}:${port}${endpoint}`)
})
