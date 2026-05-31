import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

const importStore = async (dataFile, statusFile) => {
  process.env.KANBAN_DATA_FILE = dataFile
  process.env.KANBAN_MCP_STATUS_FILE = statusFile
  process.env.KANBAN_MCP_METRICS_FILE = join(dirFromFile(dataFile), 'mcp-metrics.json')
  return import(`./kanban-store.mjs?test=${Date.now()}-${Math.random()}`)
}

const dirFromFile = (file) => file.replace(/[\\/][^\\/]+$/, '')

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

test('listTasks returns compact paginated task rows', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kanban-store-'))
  const dataFile = join(dir, 'kanban.json')
  const statusFile = join(dir, 'mcp-status.json')

  try {
    await writeFile(
      dataFile,
      JSON.stringify({
        boards: [{
          id: 'board-1',
          title: 'Efficient Board',
          createdAt: 1,
          columns: [{
            id: 'todo-1',
            title: 'To Do',
            color: 'bg-slate-500',
            category: 'todo',
            cards: [
              {
                id: 'task-1',
                title: 'Compact task',
                description: 'A long description that should be previewed instead of returned in full by listTasks.',
                priority: 'high',
                createdAt: 2,
                subtasks: [
                  { id: 'subtask-1', title: 'Done part', completed: true },
                  { id: 'subtask-2', title: 'Open part', completed: false },
                ],
              },
              {
                id: 'task-2',
                title: 'Second task',
                description: 'Another body',
                priority: 'medium',
                createdAt: 3,
                subtasks: [],
              },
            ],
          }],
        }],
        revision: 7,
        updatedAt: 8,
      }),
      'utf8',
    )

    const { listTasks } = await importStore(dataFile, statusFile)
    const result = await listTasks({ boardId: 'board-1', limit: 1 })

    assert.equal(result.revision, 7)
    assert.equal(result.total, 2)
    assert.equal(result.nextCursor, 1)
    assert.equal(result.tasks.length, 1)
    assert.equal(result.tasks[0].task.id, 'task-1')
    assert.equal(result.tasks[0].task.subtaskCount, 2)
    assert.equal(result.tasks[0].task.completedSubtaskCount, 1)
    assert.equal('description' in result.tasks[0].task, false)
    assert.match(result.tasks[0].task.descriptionPreview, /^A long description/)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('getTask returns one full task when detail is needed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kanban-store-'))
  const dataFile = join(dir, 'kanban.json')
  const statusFile = join(dir, 'mcp-status.json')

  try {
    await writeFile(
      dataFile,
      JSON.stringify({
        boards: [{
          id: 'board-1',
          title: 'Detail Board',
          createdAt: 1,
          columns: [{
            id: 'todo-1',
            title: 'To Do',
            color: 'bg-slate-500',
            category: 'todo',
            cards: [{
              id: 'task-1',
              title: 'Full task',
              description: 'Full description body',
              priority: 'critical',
              createdAt: 2,
              subtasks: [{ id: 'subtask-1', title: 'Check', completed: false }],
            }],
          }],
        }],
        revision: 3,
        updatedAt: 4,
      }),
      'utf8',
    )

    const { getTask } = await importStore(dataFile, statusFile)
    const result = await getTask({ boardId: 'board-1', taskId: 'task-1' })

    assert.equal(result.revision, 3)
    assert.equal(result.columnId, 'todo-1')
    assert.equal(result.task.description, 'Full description body')
    assert.equal(result.task.subtasks.length, 1)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('listColumns and listTasks support narrow efficient reads', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kanban-store-'))
  const dataFile = join(dir, 'kanban.json')
  const statusFile = join(dir, 'mcp-status.json')

  try {
    await writeFile(
      dataFile,
      JSON.stringify({
        boards: [{
          id: 'board-1',
          title: 'Narrow Board',
          createdAt: 1,
          columns: [{
            id: 'todo-1',
            title: 'To Do',
            color: 'bg-slate-500',
            category: 'todo',
            cards: [
              {
                id: 'task-1',
                title: 'Write release notes',
                description: 'Contains board keyword only in description.',
                priority: 'low',
                createdAt: 2,
                subtasks: [],
              },
              {
                id: 'task-2',
                title: 'Board polish',
                description: 'Exact title prefix should rank above description matches.',
                priority: 'high',
                createdAt: 3,
                subtasks: [{ id: 'subtask-1', title: 'Done', completed: true }],
              },
            ],
          }],
        }],
        revision: 9,
        updatedAt: 10,
      }),
      'utf8',
    )

    const { listColumns, listTasks } = await importStore(dataFile, statusFile)
    const columns = await listColumns({ boardId: 'board-1' })
    const tasks = await listTasks({ boardId: 'board-1', query: 'board', fields: ['id', 'title'] })

    assert.equal(columns.boardId, 'board-1')
    assert.equal(columns.columns.length, 1)
    assert.equal(columns.columns[0].tasks, 2)
    assert.equal(tasks.total, 2)
    assert.equal(tasks.tasks[0].task.id, 'task-2')
    assert.deepEqual(Object.keys(tasks.tasks[0].task).sort(), ['id', 'title'])
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('appendMcpMetric stores token estimates and totals', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kanban-store-'))
  const dataFile = join(dir, 'kanban.json')
  const statusFile = join(dir, 'mcp-status.json')

  try {
    const { appendMcpMetric, readMcpMetrics } = await importStore(dataFile, statusFile)

    await appendMcpMetric({
      tool: 'list_tasks',
      success: true,
      durationMs: 12,
      requestText: '12345678',
      responseText: '123456789012',
    })

    const metrics = await readMcpMetrics()
    assert.equal(metrics.calls.length, 1)
    assert.equal(metrics.calls[0].tool, 'list_tasks')
    assert.equal(metrics.calls[0].inputTokens, 2)
    assert.equal(metrics.calls[0].outputTokens, 3)
    assert.equal(metrics.calls[0].totalTokens, 5)
    assert.equal(metrics.totals.calls, 1)
    assert.equal(metrics.totals.totalTokens, 5)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('ensureTask is idempotent by title and preserves a single task', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kanban-store-'))
  const dataFile = join(dir, 'kanban.json')
  const statusFile = join(dir, 'mcp-status.json')

  try {
    const { ensureTask, readState } = await importStore(dataFile, statusFile)

    const first = await ensureTask({ title: 'Agent TODO', description: 'First body', owner: 'codex' })
    const second = await ensureTask({ title: 'Agent TODO', description: 'Updated body', owner: 'codex' })
    const state = await readState()
    const tasks = state.boards[0].columns.flatMap((column) => column.cards)

    assert.equal(first.result.created, true)
    assert.equal(second.result.created, false)
    assert.equal(tasks.length, 1)
    assert.equal(tasks[0].description, 'Updated body')
    assert.equal(tasks[0].owner, 'codex')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('appendTaskNote keeps description and appends chronological notes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kanban-store-'))
  const dataFile = join(dir, 'kanban.json')
  const statusFile = join(dir, 'mcp-status.json')

  try {
    const { createTask, appendTaskNote, getTask } = await importStore(dataFile, statusFile)
    const created = await createTask({ title: 'Note target', description: 'Stable description' })

    await appendTaskNote({ taskId: created.result.id, text: 'Started', type: 'progress', author: 'agent-a' })
    await appendTaskNote({ taskId: created.result.id, text: 'Verified', type: 'verification', author: 'agent-a' })
    const detail = await getTask({ taskId: created.result.id })

    assert.equal(detail.task.description, 'Stable description')
    assert.equal(detail.task.notes.length, 2)
    assert.equal(detail.task.notes[0].text, 'Started')
    assert.equal(detail.task.notes[1].type, 'verification')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('agent status tools move tasks and set metadata', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kanban-store-'))
  const dataFile = join(dir, 'kanban.json')
  const statusFile = join(dir, 'mcp-status.json')

  try {
    const { blockTask, completeTask, createTask, getTask, reopenTask, startTask } = await importStore(dataFile, statusFile)
    const created = await createTask({ title: 'Lifecycle task' })

    const started = await startTask({ taskId: created.result.id, owner: 'codex', note: 'Taking this' })
    assert.equal(started.result.toColumnId, started.state.boards[0].columns.find((column) => column.category === 'doing').id)
    assert.equal(started.result.task.owner, 'codex')
    assert.ok(Number.isFinite(started.result.task.claimedAt))

    const blocked = await blockTask({ taskId: created.result.id, reason: 'Need input', moveToBugs: true })
    assert.equal(blocked.result.toColumnId, started.result.toColumnId)
    assert.equal(blocked.result.task.blockedReason, 'Need input')

    const reopened = await reopenTask({ taskId: created.result.id })
    assert.equal(reopened.result.toColumnId, reopened.state.boards[0].columns.find((column) => column.category === 'todo').id)
    assert.equal(reopened.result.task.blockedReason, undefined)

    const completed = await completeTask({ taskId: created.result.id, verificationNote: 'npm test passed' })
    const detail = await getTask({ taskId: created.result.id })
    assert.equal(completed.result.toColumnId, completed.state.boards[0].columns.find((column) => column.category === 'done').id)
    assert.ok(Number.isFinite(detail.task.completedAt))
    assert.equal(detail.task.notes.at(-1).type, 'verification')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('getAgentDigest stays compact and omits full descriptions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kanban-store-'))
  const dataFile = join(dir, 'kanban.json')
  const statusFile = join(dir, 'mcp-status.json')

  try {
    const { blockTask, createTask, getAgentDigest } = await importStore(dataFile, statusFile)
    const created = await createTask({ title: 'Digest task', description: 'This full description should not be present.', owner: 'codex' })
    await blockTask({ taskId: created.result.id, reason: 'Waiting for review' })

    const digest = await getAgentDigest({ owner: 'codex', limit: 5 })
    const serialized = JSON.stringify(digest)

    assert.equal(digest.blocked.length, 1)
    assert.equal(digest.blocked[0].blockedReasonPreview, 'Waiting for review')
    assert.equal(serialized.includes('This full description should not be present.'), false)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('applyTaskChanges reports changed and failed entries', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'kanban-store-'))
  const dataFile = join(dir, 'kanban.json')
  const statusFile = join(dir, 'mcp-status.json')

  try {
    const { applyTaskChanges, createTask, getTask } = await importStore(dataFile, statusFile)
    const created = await createTask({ title: 'Batch target' })

    const result = await applyTaskChanges({
      changes: [
        { type: 'set_owner', taskId: created.result.id, owner: 'codex' },
        { type: 'append_note', taskId: created.result.id, text: 'Batch note', noteType: 'progress' },
        { type: 'set_priority', taskId: 'missing-task', priority: 'high' },
      ],
    })
    const detail = await getTask({ taskId: created.result.id })

    assert.equal(result.result.changed.length, 2)
    assert.equal(result.result.failed.length, 1)
    assert.equal(detail.task.owner, 'codex')
    assert.equal(detail.task.notes[0].text, 'Batch note')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
