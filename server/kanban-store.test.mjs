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
