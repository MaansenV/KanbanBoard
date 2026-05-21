import { handleJsonRpcMessage } from './mcp-core.mjs'
import { writeMcpStatus } from './kanban-store.mjs'

let buffer = Buffer.alloc(0)
let messageQueue = Promise.resolve()
let heartbeatTimer = null

const startHeartbeat = () => {
  const heartbeat = () => {
    void writeMcpStatus({ connected: true }).catch((error) => console.error(error))
  }

  heartbeat()
  heartbeatTimer = setInterval(heartbeat, 5000)
}

const stopHeartbeat = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  void writeMcpStatus({ connected: false }).finally(() => process.exit(0))
}

const send = (message) => {
  const payload = Buffer.from(JSON.stringify(message), 'utf8')
  process.stdout.write(`Content-Length: ${payload.length}\r\n\r\n`)
  process.stdout.write(payload)
}

const processBuffer = () => {
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n')
    if (headerEnd === -1) return

    const header = buffer.subarray(0, headerEnd).toString('utf8')
    const match = header.match(/Content-Length:\s*(\d+)/i)
    if (!match) {
      buffer = Buffer.alloc(0)
      return
    }

    const length = Number(match[1])
    const start = headerEnd + 4
    const end = start + length
    if (buffer.length < end) return

    const payload = buffer.subarray(start, end).toString('utf8')
    buffer = buffer.subarray(end)
    messageQueue = messageQueue
      .then(async () => {
        const response = await handleJsonRpcMessage(JSON.parse(payload))
        if (response) send(response)
      })
      .catch((error) => console.error(error))
  }
}

process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk])
  processBuffer()
})
process.stdin.on('end', stopHeartbeat)

process.on('SIGINT', stopHeartbeat)
process.on('SIGTERM', stopHeartbeat)
process.on('exit', () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer)
})

startHeartbeat()
process.stdin.resume()
