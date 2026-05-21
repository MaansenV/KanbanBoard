import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const SERVER_DIR = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(SERVER_DIR, '..')

const DATA_FILE = resolve(
  process.env.KANBAN_DATA_FILE ?? join(PROJECT_ROOT, 'data', 'kanban.json'),
)
const LOCK_DIR = `${DATA_FILE}.lock`
const MCP_STATUS_FILE = resolve(
  process.env.KANBAN_MCP_STATUS_FILE ?? join(dirname(DATA_FILE), 'mcp-status.json'),
)

const priorities = new Set(['low', 'medium', 'high', 'critical'])
const categories = new Set(['todo', 'doing', 'done', 'bugs', 'none'])

export const dataFilePath = DATA_FILE
export const mcpStatusFilePath = MCP_STATUS_FILE

const now = () => Date.now()
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const writeMcpStatus = async ({ connected = true } = {}) => {
  const status = {
    connected,
    pid: process.pid,
    updatedAt: now(),
    dataFile: DATA_FILE,
  }

  await mkdir(dirname(MCP_STATUS_FILE), { recursive: true })
  await writeFile(MCP_STATUS_FILE, `${JSON.stringify(status, null, 2)}\n`, 'utf8')
  return status
}

export const readMcpStatus = async () => {
  try {
    const raw = await readFile(MCP_STATUS_FILE, 'utf8')
    const status = JSON.parse(raw)
    const updatedAt = Number.isFinite(status.updatedAt) ? status.updatedAt : 0
    const ageMs = now() - updatedAt

    return {
      connected: Boolean(status.connected) && ageMs < 15000,
      pid: Number.isFinite(status.pid) ? status.pid : null,
      updatedAt,
      ageMs,
      dataFile: status.dataFile || DATA_FILE,
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return {
      connected: false,
      pid: null,
      updatedAt: null,
      ageMs: null,
      dataFile: DATA_FILE,
    }
  }
}

export const generateId = () => {
  if (typeof randomUUID === 'function') return randomUUID().slice(0, 13)
  return Math.random().toString(36).slice(2, 15)
}

export const createDefaultBoard = () => ({
  id: generateId(),
  title: 'Product Launch',
  createdAt: now(),
  columns: [
    {
      id: generateId(),
      title: 'To Do',
      color: 'bg-slate-500',
      category: 'todo',
      cards: [],
    },
    {
      id: generateId(),
      title: 'In Progress',
      color: 'bg-blue-500',
      category: 'doing',
      cards: [],
    },
    {
      id: generateId(),
      title: 'Done',
      color: 'bg-emerald-500',
      category: 'done',
      cards: [],
    },
  ],
})

const clone = (value) => JSON.parse(JSON.stringify(value))

const normalizeSubtask = (subtask = {}) => ({
  id: String(subtask.id || generateId()),
  title: String(subtask.title || 'Untitled subtask'),
  completed: Boolean(subtask.completed),
})

const normalizeCard = (card = {}) => {
  const normalized = {
    id: String(card.id || generateId()),
    title: String(card.title || 'Untitled task'),
    priority: priorities.has(card.priority) ? card.priority : 'medium',
    createdAt: Number.isFinite(card.createdAt) ? card.createdAt : now(),
    subtasks: Array.isArray(card.subtasks)
      ? card.subtasks.map(normalizeSubtask)
      : [],
  }

  if (typeof card.description === 'string') normalized.description = card.description
  if (Number.isFinite(card.completedAt)) normalized.completedAt = card.completedAt

  return normalized
}

const normalizeColumn = (column = {}) => ({
  id: String(column.id || generateId()),
  title: String(column.title || 'Untitled column'),
  color: typeof column.color === 'string' ? column.color : 'bg-slate-500',
  category: categories.has(column.category) ? column.category : 'none',
  cards: Array.isArray(column.cards) ? column.cards.map(normalizeCard) : [],
})

const normalizeBoard = (board = {}) => ({
  id: String(board.id || generateId()),
  title: String(board.title || 'Untitled board'),
  createdAt: Number.isFinite(board.createdAt) ? board.createdAt : now(),
  columns: Array.isArray(board.columns) ? board.columns.map(normalizeColumn) : [],
})

export const normalizeState = (input = {}) => {
  const boardsInput = Array.isArray(input) ? input : input.boards
  const boards = Array.isArray(boardsInput)
    ? boardsInput.map(normalizeBoard)
    : [createDefaultBoard()]

  return {
    boards,
    revision: Number.isFinite(input.revision) ? input.revision : 0,
    updatedAt: Number.isFinite(input.updatedAt) ? input.updatedAt : now(),
  }
}

const createStaleStateError = (current) => {
  const error = new Error('Kanban state changed before this write was saved.')
  error.code = 'STALE_STATE'
  error.current = current
  return error
}

const withWriteLock = async (operation) => {
  const startedAt = now()

  while (true) {
    try {
      await mkdir(LOCK_DIR)
      break
    } catch (error) {
      if (error.code !== 'EEXIST' || now() - startedAt > 3000) throw error
      await sleep(35)
    }
  }

  try {
    return await operation()
  } finally {
    await rm(LOCK_DIR, { recursive: true, force: true })
  }
}

export const readState = async () => {
  try {
    const raw = await readFile(DATA_FILE, 'utf8')
    return normalizeState(JSON.parse(raw))
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const state = normalizeState({ boards: [createDefaultBoard()] })
    await writeState(state)
    return state
  }
}

export const writeState = async (state) => {
  const normalized = normalizeState(state)
  normalized.revision += 1
  normalized.updatedAt = now()

  await mkdir(dirname(DATA_FILE), { recursive: true })
  const tmpPath = `${DATA_FILE}.${process.pid}.tmp`
  await writeFile(tmpPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
  await rename(tmpPath, DATA_FILE)
  return normalized
}

export const replaceBoards = async (boards, expectedRevision = null, expectedUpdatedAt = null) => {
  return withWriteLock(async () => {
    const current = await readState()
    if (Number.isFinite(expectedRevision) && current.revision !== expectedRevision) {
      throw createStaleStateError(current)
    }
    if (
      !Number.isFinite(expectedRevision) &&
      expectedUpdatedAt !== null &&
      Number.isFinite(expectedUpdatedAt) &&
      current.updatedAt > expectedUpdatedAt
    ) {
      throw createStaleStateError(current)
    }

    return writeState({ boards, revision: current.revision })
  })
}

export const mutateState = async (mutator) => {
  return withWriteLock(async () => {
    const current = await readState()
    const draft = clone(current)
    const result = await mutator(draft)
    const state = await writeState(draft)
    return { state, result }
  })
}

export const findBoard = (state, boardId) => {
  const board = boardId
    ? state.boards.find((item) => item.id === boardId)
    : state.boards[0]
  if (!board) throw new Error(`Board not found: ${boardId || '(first board)'}`)
  return board
}

export const findColumn = (board, columnId) => {
  const column = board.columns.find((item) => item.id === columnId)
  if (!column) throw new Error(`Column not found: ${columnId}`)
  return column
}

export const findTask = (board, taskId) => {
  for (const column of board.columns) {
    const task = column.cards.find((item) => item.id === taskId)
    if (task) return { column, task }
  }
  throw new Error(`Task not found: ${taskId}`)
}

export const createBoard = async ({ title, withDefaultColumns = true }) =>
  mutateState((draft) => {
    const board = {
      id: generateId(),
      title: String(title || 'Untitled board'),
      createdAt: now(),
      columns: withDefaultColumns ? createDefaultBoard().columns : [],
    }
    draft.boards.push(board)
    return board
  })

export const updateBoard = async ({ boardId, title }) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    if (typeof title === 'string') board.title = title
    return board
  })

export const deleteBoard = async ({ boardId }) =>
  mutateState((draft) => {
    const before = draft.boards.length
    draft.boards = draft.boards.filter((board) => board.id !== boardId)
    if (draft.boards.length === before) throw new Error(`Board not found: ${boardId}`)
    return { deleted: boardId }
  })

export const createColumn = async ({ boardId, title, color, category }) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const column = normalizeColumn({
      title,
      color: color || 'bg-slate-500',
      category: category || 'none',
      cards: [],
    })
    board.columns.push(column)
    return column
  })

export const updateColumn = async ({ boardId, columnId, title, color, category }) =>
  mutateState((draft) => {
    const column = findColumn(findBoard(draft, boardId), columnId)
    if (typeof title === 'string') column.title = title
    if (typeof color === 'string') column.color = color
    if (categories.has(category)) column.category = category
    return column
  })

export const deleteColumn = async ({ boardId, columnId }) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const before = board.columns.length
    board.columns = board.columns.filter((column) => column.id !== columnId)
    if (board.columns.length === before) throw new Error(`Column not found: ${columnId}`)
    return { deleted: columnId }
  })

export const createTask = async ({
  boardId,
  columnId,
  title,
  description,
  priority = 'medium',
  subtasks = [],
}) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const column = columnId ? findColumn(board, columnId) : board.columns[0]
    if (!column) throw new Error('No target column exists.')

    const task = normalizeCard({ title, description, priority, subtasks, createdAt: now() })
    if (column.category === 'done') task.completedAt = now()
    column.cards.push(task)
    return task
  })

export const updateTask = async ({
  boardId,
  taskId,
  title,
  description,
  priority,
  subtasks,
  completedAt,
}) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const { task } = findTask(board, taskId)
    if (typeof title === 'string') task.title = title
    if (typeof description === 'string') task.description = description
    if (priorities.has(priority)) task.priority = priority
    if (Array.isArray(subtasks)) task.subtasks = subtasks.map(normalizeSubtask)
    if (completedAt === null) delete task.completedAt
    if (Number.isFinite(completedAt)) task.completedAt = completedAt
    return task
  })

export const moveTask = async ({ boardId, taskId, targetColumnId, targetIndex = null }) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const source = findTask(board, taskId)
    const targetColumn = findColumn(board, targetColumnId)
    const sourceIndex = source.column.cards.findIndex((task) => task.id === taskId)
    const [task] = source.column.cards.splice(sourceIndex, 1)

    if (targetColumn.category === 'done' && source.column.category !== 'done') {
      task.completedAt = now()
    } else if (targetColumn.category !== 'done' && source.column.category === 'done') {
      delete task.completedAt
    }

    const index = Number.isInteger(targetIndex)
      ? Math.max(0, Math.min(targetIndex, targetColumn.cards.length))
      : targetColumn.cards.length
    targetColumn.cards.splice(index, 0, task)
    return { task, fromColumnId: source.column.id, toColumnId: targetColumn.id, index }
  })

export const deleteTask = async ({ boardId, taskId }) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const { column } = findTask(board, taskId)
    column.cards = column.cards.filter((task) => task.id !== taskId)
    return { deleted: taskId }
  })

export const addSubtask = async ({ boardId, taskId, title, completed = false }) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const { task } = findTask(board, taskId)
    const subtask = normalizeSubtask({ title, completed })
    task.subtasks = [...(task.subtasks || []), subtask]
    return subtask
  })

export const toggleSubtask = async ({ boardId, taskId, subtaskId, completed }) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const { task } = findTask(board, taskId)
    const subtask = (task.subtasks || []).find((item) => item.id === subtaskId)
    if (!subtask) throw new Error(`Subtask not found: ${subtaskId}`)
    subtask.completed = typeof completed === 'boolean' ? completed : !subtask.completed
    return subtask
  })

export const searchTasks = async ({ boardId, query = '', priority, category } = {}) => {
  const state = await readState()
  const boards = boardId ? [findBoard(state, boardId)] : state.boards
  const needle = String(query).toLowerCase()
  const tasks = []

  for (const board of boards) {
    for (const column of board.columns) {
      for (const task of column.cards) {
        const haystack = `${task.title} ${task.description || ''}`.toLowerCase()
        if (needle && !haystack.includes(needle)) continue
        if (priority && task.priority !== priority) continue
        if (category && column.category !== category) continue
        tasks.push({ boardId: board.id, boardTitle: board.title, columnId: column.id, columnTitle: column.title, task })
      }
    }
  }

  return tasks
}
