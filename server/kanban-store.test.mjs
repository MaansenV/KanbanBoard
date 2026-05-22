import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const importStore = async (dataFile, statusFile) => {
  process.env.KANBAN_DATA_FILE = dataFile
  process.env.KANBAN_MCP_STATUS_FILE = statusFile
  return import(`./kanban-store.mjs?test=${Date.now()}-${Math.random()}`)
}

test('readState parses persisted JSON with a leading UTF-8 BOM', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kanban-store-'))
  const dataFile = join(dir, 'kanban.json')
  const statusFile = join(dir, 'mcp-status.json')

  try {
    await writeFile(
      dataFile,
      `\uFEFF${JSON.stringify({
        boards: [{ id: 'board-1', title: 'BOM Board', createdAt: 1, columns: [] }],
        revision: 7,
        updatedAt: 9,
      })}`,
      'utf8',
    )

    const { readState } = await importStore(dataFile, statusFile)
    const state = await readState()

    assert.equal(state.revision, 7)
    assert.equal(state.updatedAt, 9)
    assert.equal(state.boards[0].title, 'BOM Board')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('readMcpStatus parses persisted status JSON with a leading UTF-8 BOM', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kanban-store-'))
  const dataFile = join(dir, 'kanban.json')
  const statusFile = join(dir, 'mcp-status.json')

  try {
    const updatedAt = Date.now()
    await writeFile(
      statusFile,
      `\uFEFF${JSON.stringify({
        connected: true,
        pid: 123,
        updatedAt,
        dataFile,
      })}`,
      'utf8',
    )

    const { readMcpStatus } = await importStore(dataFile, statusFile)
    const status = await readMcpStatus()

    assert.equal(status.connected, true)
    assert.equal(status.pid, 123)
    assert.equal(status.updatedAt, updatedAt)
    assert.equal(status.dataFile, dataFile)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
