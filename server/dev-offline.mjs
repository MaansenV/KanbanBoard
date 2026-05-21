import { spawn } from 'node:child_process'
import { join } from 'node:path'

const children = []
const viteBin = join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js')
const apiUrl = `http://${process.env.KANBAN_HOST || '127.0.0.1'}:${process.env.KANBAN_PORT || '4174'}/api/health`

const spawnChild = (name, command, args, env = {}) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })

  children.push(child)

  child.on('exit', (code, signal) => {
    if (signal) return
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`)
      shutdown(code)
    }
  })

  return child
}

const shutdown = (code = 0) => {
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

spawnChild('offline-api', process.execPath, ['server/offline-server.mjs'])
spawnChild('mcp-http', process.execPath, ['server/mcp-http-server.mjs'])

const waitForApi = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(apiUrl, { cache: 'no-store' })
      if (response.ok) return
    } catch {
      // The API process is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 250))
  }

  throw new Error(`Kanban offline API did not become ready at ${apiUrl}`)
}

waitForApi()
  .then(() => {
    spawnChild(
      'vite',
      process.execPath,
      [viteBin, '--host', '127.0.0.1', '--port', '4173', '--strictPort', '--clearScreen', 'false'],
      { VITE_KANBAN_API_URL: 'http://127.0.0.1:4174' },
    )
  })
  .catch((error) => {
    console.error(error.message)
    shutdown(1)
  })
