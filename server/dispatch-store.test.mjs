import { mkdtemp, rm, writeFile, mkdir, readFile, copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import assert from 'node:assert/strict'

const importStores = async (dir) => {
  await mkdir(dir, { recursive: true })

  const dataFile = join(dir, 'kanban.json')
  const statusFile = join(dir, 'mcp-status.json')
  const metricsFile = join(dir, 'mcp-metrics.json')
  const agentsFile = join(dir, 'agents.json')
  const dispatchesFile = join(dir, 'dispatches.json')

  process.env.KANBAN_DATA_FILE = dataFile
  process.env.KANBAN_MCP_STATUS_FILE = statusFile
  process.env.KANBAN_MCP_METRICS_FILE = metricsFile
  process.env.KANBAN_AGENTS_FILE = agentsFile
  process.env.KANBAN_DISPATCHES_FILE = dispatchesFile

  await copyFile(join(process.cwd(), 'server', 'kanban-store.mjs'), join(dir, 'kanban-store.mjs'))
  await copyFile(join(process.cwd(), 'server', 'dispatch-store.mjs'), join(dir, 'dispatch-store.mjs'))

  const suffix = `${Date.now()}-${Math.random()}`
  const kanbanStore = await import(`${pathToFileURL(join(dir, 'kanban-store.mjs')).href}?test=${suffix}`)
  const dispatchStore = await import(`${pathToFileURL(join(dir, 'dispatch-store.mjs')).href}?test=${suffix}`)

  return {
    kanbanStore,
    dispatchStore,
    dataFile,
    statusFile,
    metricsFile,
    agentsFile,
    dispatchesFile,
  }
}

test('dispatch store module', async (t) => {
  await t.test('ensureDefaultAgent creates agents.json with orchestrator', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dispatch-store-'))
    try {
      const { dispatchStore, agentsFile } = await importStores(dir)

      const agent = await dispatchStore.ensureDefaultAgent()
      const raw = JSON.parse(await readFile(agentsFile, 'utf8'))

      assert.equal(agent.id, 'orchestrator')
      assert.ok(raw.agents.some((item) => item.id === 'orchestrator'))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  await t.test('ensureDefaultAgent is idempotent', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dispatch-store-'))
    try {
      const { dispatchStore, agentsFile } = await importStores(dir)

      await dispatchStore.ensureDefaultAgent()
      await dispatchStore.ensureDefaultAgent()

      const raw = JSON.parse(await readFile(agentsFile, 'utf8'))
      const orchestrators = raw.agents.filter((item) => item.id === 'orchestrator')

      assert.equal(orchestrators.length, 1)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  await t.test('registerAgent upserts correctly', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dispatch-store-'))
    try {
      const { dispatchStore } = await importStores(dir)

      await dispatchStore.ensureDefaultAgent()
      const result = await dispatchStore.registerAgent({ id: 'orchestrator', name: 'Coordinator', status: 'busy' })

      assert.equal(result.agent.id, 'orchestrator')
      assert.equal(result.agent.name, 'Coordinator')
      assert.equal(result.agent.status, 'busy')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  await t.test('listAgents returns orchestrator', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dispatch-store-'))
    try {
      const { dispatchStore } = await importStores(dir)

      await dispatchStore.ensureDefaultAgent()
      const result = await dispatchStore.listAgents()

      assert.ok(result.agents.some((item) => item.id === 'orchestrator'))
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  await t.test('createDispatch rejects empty prompt', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dispatch-store-'))
    try {
      const { dispatchStore } = await importStores(dir)

      await assert.rejects(
        () => dispatchStore.createDispatch({ taskId: 'task-1', prompt: '   ' }),
        (error) => error.code === 'VALIDATION_ERROR',
      )
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  await t.test('createDispatch rejects missing taskId', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dispatch-store-'))
    try {
      const { dispatchStore } = await importStores(dir)

      await assert.rejects(
        () => dispatchStore.createDispatch({ prompt: 'Investigate the issue' }),
        (error) => error.code === 'VALIDATION_ERROR',
      )
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  await t.test('createDispatch creates dispatch and task note', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dispatch-store-'))
    try {
      const { kanbanStore, dispatchStore } = await importStores(dir)
      const task = await kanbanStore.createTask({ title: 'Dispatch target', description: 'Needs work' })
      const state = await kanbanStore.readState()

      const created = await dispatchStore.createDispatch({
        prompt: 'Review the task and summarize blockers.',
        taskId: task.result.id,
        boardId: state.boards[0].id,
        author: 'tester',
      })
      const dispatches = await dispatchStore.listDispatches()
      const detail = await kanbanStore.getTask({ boardId: state.boards[0].id, taskId: task.result.id })

      assert.equal(created.ok, true)
      assert.equal(dispatches.total, 1)
      assert.equal(dispatches.dispatches[0].id, created.dispatch.id)
      assert.equal(detail.task.notes.length, 1)
      assert.match(detail.task.notes[0].text, /Review the task and summarize blockers\./)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  await t.test('listDispatches filters by agentId', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dispatch-store-'))
    try {
      const { kanbanStore, dispatchStore } = await importStores(dir)
      const task = await kanbanStore.createTask({ title: 'Agent filter task' })
      const state = await kanbanStore.readState()

      await dispatchStore.createDispatch({ prompt: 'First dispatch', taskId: task.result.id, boardId: state.boards[0].id, agentId: 'orchestrator' })
      await dispatchStore.createDispatch({ prompt: 'Second dispatch', taskId: task.result.id, boardId: state.boards[0].id, agentId: 'agent-a' })

      const filtered = await dispatchStore.listDispatches({ agentId: 'agent-a' })

      assert.equal(filtered.total, 1)
      assert.equal(filtered.dispatches[0].agentId, 'agent-a')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  await t.test('listDispatches with markDispatched=true sets status', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dispatch-store-'))
    try {
      const { kanbanStore, dispatchStore } = await importStores(dir)
      const task = await kanbanStore.createTask({ title: 'Mark dispatched task' })
      const state = await kanbanStore.readState()

      const created = await dispatchStore.createDispatch({ prompt: 'Mark me', taskId: task.result.id, boardId: state.boards[0].id })
      const listed = await dispatchStore.listDispatches({ markDispatched: true })
      const reloaded = await dispatchStore.listDispatches()

      assert.equal(listed.dispatches[0].id, created.dispatch.id)
      assert.equal(listed.dispatches[0].status, 'dispatched')
      assert.ok(Number.isFinite(listed.dispatches[0].dispatchedAt))
      assert.equal(reloaded.dispatches[0].status, 'dispatched')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  await t.test('completeDispatch with success=true sets completed', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dispatch-store-'))
    try {
      const { kanbanStore, dispatchStore } = await importStores(dir)
      const task = await kanbanStore.createTask({ title: 'Complete success task' })
      const state = await kanbanStore.readState()

      const created = await dispatchStore.createDispatch({ prompt: 'Finish successfully', taskId: task.result.id, boardId: state.boards[0].id })
      const completed = await dispatchStore.completeDispatch({ dispatchId: created.dispatch.id, result: 'All done' })

      assert.equal(completed.ok, true)
      assert.equal(completed.dispatch.status, 'completed')
      assert.ok(Number.isFinite(completed.dispatch.completedAt))
      assert.equal(completed.dispatch.result, 'All done')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  await t.test('completeDispatch with success=false sets failed', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dispatch-store-'))
    try {
      const { kanbanStore, dispatchStore } = await importStores(dir)
      const task = await kanbanStore.createTask({ title: 'Complete failure task' })
      const state = await kanbanStore.readState()

      const created = await dispatchStore.createDispatch({ prompt: 'Fail please', taskId: task.result.id, boardId: state.boards[0].id })
      const failed = await dispatchStore.completeDispatch({ dispatchId: created.dispatch.id, success: false, result: 'The operation failed' })

      assert.equal(failed.ok, true)
      assert.equal(failed.dispatch.status, 'failed')
      assert.ok(Number.isFinite(failed.dispatch.failedAt))
      assert.equal(failed.dispatch.error, 'The operation failed')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  await t.test('cancelDispatch sets cancelled', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dispatch-store-'))
    try {
      const { kanbanStore, dispatchStore } = await importStores(dir)
      const task = await kanbanStore.createTask({ title: 'Cancel task' })
      const state = await kanbanStore.readState()

      const created = await dispatchStore.createDispatch({ prompt: 'Cancel me', taskId: task.result.id, boardId: state.boards[0].id })
      const cancelled = await dispatchStore.cancelDispatch({ dispatchId: created.dispatch.id, reason: 'No longer needed' })

      assert.equal(cancelled.ok, true)
      assert.equal(cancelled.dispatch.status, 'cancelled')
      assert.ok(Number.isFinite(cancelled.dispatch.cancelledAt))
      assert.equal(cancelled.dispatch.error, 'No longer needed')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  await t.test('Terminal dispatches cannot be changed', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dispatch-store-'))
    try {
      const { kanbanStore, dispatchStore } = await importStores(dir)
      const task = await kanbanStore.createTask({ title: 'Terminal task' })
      const state = await kanbanStore.readState()

      const created = await dispatchStore.createDispatch({ prompt: 'Complete once', taskId: task.result.id, boardId: state.boards[0].id })
      const first = await dispatchStore.completeDispatch({ dispatchId: created.dispatch.id, result: 'Finished' })
      const second = await dispatchStore.completeDispatch({ dispatchId: created.dispatch.id, result: 'Changed result' })

      assert.equal(first.dispatch.status, 'completed')
      assert.equal(second.ok, true)
      assert.equal(second.dispatch.status, 'completed')
      assert.equal(second.dispatch.result, 'Finished')
      assert.equal(second.dispatch.completedAt, first.dispatch.completedAt)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
