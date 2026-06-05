import { createServer } from 'node:http'
import { dataFilePath, readMcpMetrics, readMcpStatus, readState, replaceBoards } from './kanban-store.mjs'
import { listAgents, createDispatch, listDispatches, cancelDispatch } from './dispatch-store.mjs'

const host = process.env.KANBAN_HOST || '127.0.0.1'
const port = Number(process.env.KANBAN_PORT || 4174)

const allowedOrigins = new Set([
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'http://127.0.0.1:4174',
  'http://localhost:4174',
])

const sendJson = (res, status, value) => {
  const body = JSON.stringify(value)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
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
        req.removeAllListeners('data')
        req.pause()
        reject(new Error('Request body is too large.'))
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })

const readJsonBody = async (req) => {
  try {
    return JSON.parse(await readBody(req))
  } catch {
    const error = new Error('Invalid JSON body.')
    error.code = 'VALIDATION_ERROR'
    throw error
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') {
      sendJson(res, 204, {})
      return
    }

    const url = new URL(req.url || '/', `http://${host}:${port}`)

    if (req.method === 'GET' && url.pathname === '/api/health') {
      sendJson(res, 200, { ok: true, dataFile: dataFilePath, mcp: await readMcpStatus() })
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/mcp-status') {
      sendJson(res, 200, await readMcpStatus())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/mcp-metrics') {
      sendJson(res, 200, await readMcpMetrics())
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      sendJson(res, 200, await readState())
      return
    }

    if (req.method === 'PUT' && url.pathname === '/api/state') {
      const payload = await readJsonBody(req)
      const state = await replaceBoards(payload.boards, payload.revision ?? null, payload.updatedAt ?? null)
      sendJson(res, 200, state)
      return
    }

    // ── Agent Dispatch REST Endpoints ────────────────────────────────

    if (req.method === 'GET' && url.pathname === '/api/agents') {
      sendJson(res, 200, await listAgents({ touchDefault: false }))
      return
    }

    if (req.method === 'GET' && url.pathname === '/api/dispatches') {
      sendJson(res, 200, await listDispatches({
        agentId: url.searchParams.get('agentId') || undefined,
        taskId: url.searchParams.get('taskId') || undefined,
        status: url.searchParams.get('status') || undefined,
        includeCompleted: url.searchParams.get('includeCompleted') !== 'false',
        limit: Number(url.searchParams.get('limit') || 50),
      }))
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/dispatches') {
      const payload = await readJsonBody(req)
      const result = await createDispatch(payload)
      sendJson(res, result.ok ? 201 : 400, result)
      return
    }

    if (req.method === 'POST' && url.pathname === '/api/dispatches/cancel') {
      const payload = await readJsonBody(req)
      const result = await cancelDispatch(payload)
      sendJson(res, 200, result)
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (error) {
    if (error.code === 'STALE_STATE') {
      sendJson(res, 409, {
        error: error.message,
        state: error.current,
      })
      return
    }

    if (error.code === 'VALIDATION_ERROR') {
      sendJson(res, 400, { error: error.message, code: error.code })
      return
    }

    if (error.code === 'NOT_FOUND') {
      sendJson(res, 404, { error: error.message, code: error.code })
      return
    }

    if (error.code === 'INVALID_STATE') {
      sendJson(res, 409, { error: error.message, code: error.code })
      return
    }

    sendJson(res, 500, { error: error.message })
  }
})

server.listen(port, host, async () => {
  await readState()
  console.log(`Kanban offline API listening on http://${host}:${port}`)
  console.log(`Kanban data file: ${dataFilePath}`)
})
