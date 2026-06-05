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
const MCP_METRICS_FILE = resolve(
  process.env.KANBAN_MCP_METRICS_FILE ?? join(dirname(DATA_FILE), 'mcp-metrics.json'),
)

const priorities = new Set(['low', 'medium', 'high', 'critical'])
const categories = new Set(['todo', 'doing', 'review', 'done', 'bugs', 'none'])

export const dataFilePath = DATA_FILE
export const mcpStatusFilePath = MCP_STATUS_FILE
export const mcpMetricsFilePath = MCP_METRICS_FILE

const now = () => Date.now()
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const parseStoredJson = (raw) => JSON.parse(raw.replace(/^\uFEFF/, ''))
const estimateTokens = (text) => Math.ceil(String(text || '').length / 4)

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
    const status = parseStoredJson(raw)
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

export const readMcpMetrics = async () => {
  try {
    const raw = await readFile(MCP_METRICS_FILE, 'utf8')
    const metrics = parseStoredJson(raw)
    return {
      calls: Array.isArray(metrics.calls) ? metrics.calls.slice(-100) : [],
      totals: metrics.totals && typeof metrics.totals === 'object'
        ? metrics.totals
        : { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, errors: 0 },
      updatedAt: Number.isFinite(metrics.updatedAt) ? metrics.updatedAt : null,
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return {
      calls: [],
      totals: { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, errors: 0 },
      updatedAt: null,
    }
  }
}

export const appendMcpMetric = async ({
  tool,
  success = true,
  durationMs = 0,
  requestText = '',
  responseText = '',
  errorMessage,
} = {}) => {
  const requestChars = String(requestText || '').length
  const responseChars = String(responseText || '').length
  const inputTokens = estimateTokens(requestText)
  const outputTokens = estimateTokens(responseText)
  const entry = {
    id: generateId(),
    timestamp: now(),
    tool: String(tool || 'unknown'),
    success: Boolean(success),
    durationMs: Math.max(0, Math.round(durationMs)),
    requestChars,
    responseChars,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    ...(errorMessage ? { errorMessage: String(errorMessage).slice(0, 240) } : {}),
  }

  const current = await readMcpMetrics()
  const calls = [...current.calls, entry].slice(-100)
  const totals = {
    calls: Number(current.totals.calls || 0) + 1,
    inputTokens: Number(current.totals.inputTokens || 0) + inputTokens,
    outputTokens: Number(current.totals.outputTokens || 0) + outputTokens,
    totalTokens: Number(current.totals.totalTokens || 0) + entry.totalTokens,
    errors: Number(current.totals.errors || 0) + (entry.success ? 0 : 1),
  }
  const metrics = { calls, totals, updatedAt: now() }

  await mkdir(dirname(MCP_METRICS_FILE), { recursive: true })
  await writeFile(MCP_METRICS_FILE, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8')
  return entry
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
      title: 'Ready to Review',
      color: 'bg-indigo-500',
      category: 'review',
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
const DEFAULT_TASK_LIMIT = 25
const MAX_TASK_LIMIT = 100
const DESCRIPTION_PREVIEW_LENGTH = 96
const TASK_FIELD_BUILDERS = {
  id: (task) => task.id,
  title: (task) => task.title,
  priority: (task) => task.priority,
  createdAt: (task) => task.createdAt,
  completedAt: (task) => task.completedAt,
  owner: (task) => task.owner,
  claimedAt: (task) => task.claimedAt,
  lastTouchedAt: (task) => task.lastTouchedAt,
  blockedReasonPreview: (task) => previewText(task.blockedReason),
  noteCount: (task) => (Array.isArray(task.notes) ? task.notes.length : 0),
  descriptionPreview: (task) => previewText(task.description),
  subtaskCount: (task) => (Array.isArray(task.subtasks) ? task.subtasks.length : 0),
  completedSubtaskCount: (task) => (
    Array.isArray(task.subtasks) ? task.subtasks.filter((subtask) => subtask.completed).length : 0
  ),
}

const normalizeSubtask = (subtask = {}) => ({
  id: String(subtask.id || generateId()),
  title: String(subtask.title || 'Untitled subtask'),
  completed: Boolean(subtask.completed),
})

const noteTypes = new Set(['note', 'progress', 'blocker', 'verification', 'system'])

const normalizeTaskNote = (note = {}) => ({
  id: String(note.id || generateId()),
  timestamp: Number.isFinite(note.timestamp) ? note.timestamp : now(),
  type: noteTypes.has(note.type) ? note.type : 'note',
  text: String(note.text || ''),
  ...(typeof note.author === 'string' && note.author.trim() ? { author: note.author.trim() } : {}),
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
    notes: Array.isArray(card.notes)
      ? card.notes.map(normalizeTaskNote).filter((note) => note.text.trim())
      : [],
  }

  if (typeof card.description === 'string') normalized.description = card.description
  if (Number.isFinite(card.completedAt)) normalized.completedAt = card.completedAt
  if (typeof card.owner === 'string' && card.owner.trim()) normalized.owner = card.owner.trim()
  if (Number.isFinite(card.claimedAt)) normalized.claimedAt = card.claimedAt
  if (Number.isFinite(card.lastTouchedAt)) normalized.lastTouchedAt = card.lastTouchedAt
  if (typeof card.blockedReason === 'string' && card.blockedReason.trim()) normalized.blockedReason = card.blockedReason.trim()

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

const clampListLimit = (limit) => {
  if (!Number.isFinite(limit)) return DEFAULT_TASK_LIMIT
  return Math.max(1, Math.min(Math.trunc(limit), MAX_TASK_LIMIT))
}

const clampCursor = (cursor) => {
  if (!Number.isFinite(cursor)) return 0
  return Math.max(0, Math.trunc(cursor))
}

const previewText = (value, maxLength = DESCRIPTION_PREVIEW_LENGTH) => {
  if (typeof value !== 'string' || value.length === 0) return undefined
  const collapsed = value.replace(/\s+/g, ' ').trim()
  if (!collapsed) return undefined
  return collapsed.length > maxLength ? `${collapsed.slice(0, maxLength - 3)}...` : collapsed
}

export const summarizeTask = (task = {}) => {
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  const summary = {
    id: task.id,
    title: task.title,
    priority: task.priority,
    createdAt: task.createdAt,
    owner: task.owner,
    claimedAt: task.claimedAt,
    lastTouchedAt: task.lastTouchedAt,
    noteCount: Array.isArray(task.notes) ? task.notes.length : 0,
    subtaskCount: subtasks.length,
    completedSubtaskCount: subtasks.filter((subtask) => subtask.completed).length,
  }

  const descriptionPreview = previewText(task.description)
  const blockedReasonPreview = previewText(task.blockedReason)
  if (descriptionPreview) summary.descriptionPreview = descriptionPreview
  if (blockedReasonPreview) summary.blockedReasonPreview = blockedReasonPreview
  if (Number.isFinite(task.completedAt)) summary.completedAt = task.completedAt
  return summary
}

const pickTaskFields = (task = {}, fields) => {
  if (!Array.isArray(fields) || fields.length === 0) return summarizeTask(task)

  const picked = {}
  for (const field of fields) {
    const builder = TASK_FIELD_BUILDERS[field]
    if (!builder) continue
    const value = builder(task)
    if (value !== undefined) picked[field] = value
  }
  if (!Object.keys(picked).length) return summarizeTask(task)
  return picked
}

export const summarizeColumn = (column = {}) => {
  const cards = Array.isArray(column.cards) ? column.cards : []
  return {
    id: column.id,
    title: column.title,
    color: column.color,
    category: column.category,
    tasks: cards.length,
  }
}

export const summarizeBoard = (board = {}) => {
  const columns = Array.isArray(board.columns) ? board.columns : []
  return {
    id: board.id,
    title: board.title,
    createdAt: board.createdAt,
    columns: columns.map(summarizeColumn),
    columnCount: columns.length,
    taskCount: columns.reduce((sum, column) => sum + (Array.isArray(column.cards) ? column.cards.length : 0), 0),
  }
}

export const listColumns = async ({ boardId } = {}) => {
  const state = await readState()
  const board = findBoard(state, boardId)
  return {
    revision: state.revision,
    updatedAt: state.updatedAt,
    boardId: board.id,
    boardTitle: board.title,
    columns: board.columns.map(summarizeColumn),
  }
}

export const summarizeState = (state = {}) => {
  const boards = Array.isArray(state.boards) ? state.boards : []
  return {
    revision: state.revision,
    updatedAt: state.updatedAt,
    boardCount: boards.length,
    columnCount: boards.reduce((sum, board) => sum + (Array.isArray(board.columns) ? board.columns.length : 0), 0),
    taskCount: boards.reduce(
      (sum, board) => sum + (Array.isArray(board.columns)
        ? board.columns.reduce((columnSum, column) => columnSum + (Array.isArray(column.cards) ? column.cards.length : 0), 0)
        : 0),
      0,
    ),
  }
}

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

const isProcessAlive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM means the process exists but we can't signal it — treat as alive
    if (error.code === 'EPERM') return true
    return false
  }
}

const withWriteLock = async (operation) => {
  const startedAt = now()

  while (true) {
    try {
      await mkdir(LOCK_DIR)
      try {
        await writeFile(`${LOCK_DIR}/pid`, String(process.pid), 'utf8')
      } catch (pidError) {
        // Pid file write failed — clean up the lock we just acquired
        await rm(LOCK_DIR, { recursive: true, force: true }).catch(() => {})
        throw pidError
      }
      break
    } catch (error) {
      if (error.code !== 'EEXIST') throw error

      // Check for stale lock (crashed holder)
      const elapsed = now() - startedAt
      if (elapsed > 3000) {
        const pidRaw = await readFile(`${LOCK_DIR}/pid`, 'utf8').catch(() => null)
        if (pidRaw !== null) {
          const holderPid = Number(pidRaw.trim())
          if (!Number.isFinite(holderPid) || holderPid <= 0 || !isProcessAlive(holderPid)) {
            // Stale lock — clean it up and retry
            await rm(LOCK_DIR, { recursive: true, force: true }).catch(() => {})
            continue
          }
        }
        // PID file missing or holder is alive — not safe to clean up
        throw error
      }

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
    return normalizeState(parseStoredJson(raw))
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
  const tmpPath = `${DATA_FILE}.${process.pid}-${generateId()}.tmp`
  try {
    await writeFile(tmpPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
    await rename(tmpPath, DATA_FILE)
  } catch (error) {
    // Clean up orphaned tmp file on any failure
    await rm(tmpPath, { force: true }).catch(() => {})
    throw error
  }
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

const findColumnByCategory = (board, category) => {
  const column = board.columns.find((item) => item.category === category)
  if (!column) throw new Error(`Column category not found: ${category}`)
  return column
}

const findOptionalColumnByCategory = (board, category) =>
  board.columns.find((item) => item.category === category) || null

const findTaskByTitle = (board, title, columnId) => {
  const needle = String(title || '').trim().toLowerCase()
  if (!needle) return null

  for (const column of board.columns) {
    if (columnId && column.id !== columnId) continue
    const task = column.cards.find((item) => String(item.title || '').trim().toLowerCase() === needle)
    if (task) return { column, task }
  }

  return null
}

const touchTask = (task, touchedAt = now()) => {
  task.lastTouchedAt = touchedAt
}

const appendNoteToTask = (task, { text, type = 'note', author } = {}) => {
  const note = normalizeTaskNote({ text, type, author, timestamp: now() })
  if (!note.text.trim()) throw new Error('Task note text is required.')
  task.notes = [...(Array.isArray(task.notes) ? task.notes : []), note]
  touchTask(task, note.timestamp)
  return note
}

const applyTaskPatch = (task, { title, description, priority, subtasks, completedAt, owner, blockedReason } = {}) => {
  if (typeof title === 'string') task.title = title
  if (typeof description === 'string') task.description = description
  if (priorities.has(priority)) task.priority = priority
  if (Array.isArray(subtasks)) task.subtasks = subtasks.map(normalizeSubtask)
  if (completedAt === null) delete task.completedAt
  if (Number.isFinite(completedAt)) task.completedAt = completedAt
  if (typeof owner === 'string') {
    if (owner.trim()) task.owner = owner.trim()
    else delete task.owner
  }
  if (blockedReason === null) delete task.blockedReason
  if (typeof blockedReason === 'string') {
    if (blockedReason.trim()) task.blockedReason = blockedReason.trim()
    else delete task.blockedReason
  }
  touchTask(task)
}

const moveTaskToColumn = (board, taskId, targetColumn, targetIndex = null) => {
  const source = findTask(board, taskId)
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
  touchTask(task)
  return { task, fromColumnId: source.column.id, toColumnId: targetColumn.id, index }
}

const taskDigestItem = (board, column, task) => {
  const blockedReasonPreview = previewText(task.blockedReason)
  return {
    boardId: board.id,
    boardTitle: board.title,
    columnId: column.id,
    columnTitle: column.title,
    columnCategory: column.category,
    id: task.id,
    title: task.title,
    priority: task.priority,
    owner: task.owner,
    lastTouchedAt: task.lastTouchedAt,
    completedAt: task.completedAt,
    ...(blockedReasonPreview ? { blockedReasonPreview } : {}),
  }
}

const taskMatchesFilters = (task, column, { query = '', priority, category } = {}) => {
  const needle = String(query || '').toLowerCase()
  const haystack = `${task.title} ${task.description || ''}`.toLowerCase()
  if (needle && !haystack.includes(needle)) return false
  if (priority && task.priority !== priority) return false
  if (category && column.category !== category) return false
  return true
}

const taskSearchRank = (task, query = '') => {
  const needle = String(query || '').trim().toLowerCase()
  if (!needle) return 0

  const title = String(task.title || '').toLowerCase()
  const description = String(task.description || '').toLowerCase()
  if (title === needle) return 0
  if (title.startsWith(needle)) return 1
  if (title.includes(needle)) return 2
  if (description.startsWith(needle)) return 3
  return 4
}

const taskListItem = (board, column, task, { includeFullTask = false, fields } = {}) => ({
  boardId: board.id,
  boardTitle: board.title,
  columnId: column.id,
  columnTitle: column.title,
  columnCategory: column.category,
  task: includeFullTask ? task : pickTaskFields(task, fields),
})

export const getBoardSummary = async ({ boardId } = {}) => {
  const state = await readState()
  const boards = boardId ? [findBoard(state, boardId)] : state.boards
  return {
    revision: state.revision,
    updatedAt: state.updatedAt,
    boards: boards.map(summarizeBoard),
  }
}

export const getTask = async ({ boardId, taskId }) => {
  const state = await readState()
  const board = findBoard(state, boardId)
  const { column, task } = findTask(board, taskId)
  return {
    revision: state.revision,
    updatedAt: state.updatedAt,
    boardId: board.id,
    boardTitle: board.title,
    columnId: column.id,
    columnTitle: column.title,
    columnCategory: column.category,
    task,
  }
}

export const listTasks = async ({
  boardId,
  columnId,
  query = '',
  priority,
  category,
  limit = DEFAULT_TASK_LIMIT,
  cursor = 0,
  includeFullTask = false,
  fields,
} = {}) => {
  const state = await readState()
  const boards = boardId ? [findBoard(state, boardId)] : state.boards
  const matches = []

  for (const board of boards) {
    for (const column of board.columns) {
      if (columnId && column.id !== columnId) continue
      for (const task of column.cards) {
        if (!taskMatchesFilters(task, column, { query, priority, category })) continue
        matches.push({
          rank: taskSearchRank(task, query),
          title: task.title,
          id: task.id,
          item: taskListItem(board, column, task, { includeFullTask, fields }),
        })
      }
    }
  }

  matches.sort((left, right) => (
    left.rank - right.rank ||
    String(left.title || '').localeCompare(String(right.title || '')) ||
    String(left.id || '').localeCompare(String(right.id || ''))
  ))

  const start = clampCursor(cursor)
  const pageSize = clampListLimit(limit)
  const page = matches.slice(start, start + pageSize)
  const nextCursor = start + page.length < matches.length ? start + page.length : null

  return {
    revision: state.revision,
    updatedAt: state.updatedAt,
    total: matches.length,
    cursor: start,
    limit: pageSize,
    nextCursor,
    tasks: page.map((match) => match.item),
  }
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
  owner,
}) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const column = columnId ? findColumn(board, columnId) : board.columns[0]
    if (!column) throw new Error('No target column exists.')

    const task = normalizeCard({ title, description, priority, subtasks, owner, createdAt: now(), lastTouchedAt: now() })
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
  owner,
  blockedReason,
}) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const { task } = findTask(board, taskId)
    applyTaskPatch(task, { title, description, priority, subtasks, completedAt, owner, blockedReason })
    return task
  })

export const moveTask = async ({ boardId, taskId, targetColumnId, targetIndex = null }) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const targetColumn = findColumn(board, targetColumnId)
    return moveTaskToColumn(board, taskId, targetColumn, targetIndex)
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

export const ensureTask = async ({
  boardId,
  columnId,
  title,
  description,
  priority,
  subtasks,
  owner,
  updateExisting = true,
} = {}) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const existing = findTaskByTitle(board, title, columnId)
    if (existing) {
      if (updateExisting) {
        applyTaskPatch(existing.task, { description, priority, subtasks, owner })
      }
      return { task: existing.task, columnId: existing.column.id, created: false }
    }

    const column = columnId ? findColumn(board, columnId) : board.columns[0]
    if (!column) throw new Error('No target column exists.')
    const task = normalizeCard({ title, description, priority, subtasks, owner, createdAt: now(), lastTouchedAt: now() })
    column.cards.push(task)
    return { task, columnId: column.id, created: true }
  })

export const appendTaskNote = async ({ boardId, taskId, text, type = 'note', author } = {}) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const { task } = findTask(board, taskId)
    const note = appendNoteToTask(task, { text, type, author })
    return { task, note }
  })

export const startTask = async ({ boardId, taskId, owner, note } = {}) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const targetColumn = findColumnByCategory(board, 'doing')
    const moved = moveTaskToColumn(board, taskId, targetColumn)
    if (typeof owner === 'string' && owner.trim()) {
      moved.task.owner = owner.trim()
      moved.task.claimedAt = now()
    }
    delete moved.task.blockedReason
    if (typeof note === 'string' && note.trim()) appendNoteToTask(moved.task, { text: note, type: 'progress', author: owner })
    touchTask(moved.task)
    return moved
  })

export const completeTask = async ({ boardId, taskId, verificationNote, author } = {}) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const targetColumn = findColumnByCategory(board, 'done')
    const moved = moveTaskToColumn(board, taskId, targetColumn)
    moved.task.completedAt = now()
    delete moved.task.blockedReason
    if (typeof verificationNote === 'string' && verificationNote.trim()) {
      appendNoteToTask(moved.task, { text: verificationNote, type: 'verification', author })
    }
    touchTask(moved.task)
    return moved
  })

export const reviewTask = async ({ boardId, taskId, reviewNote, author } = {}) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const targetColumn = findColumnByCategory(board, 'review')
    const moved = moveTaskToColumn(board, taskId, targetColumn)
    if (typeof reviewNote === 'string' && reviewNote.trim()) {
      appendNoteToTask(moved.task, { text: reviewNote, type: 'progress', author })
    }
    touchTask(moved.task)
    return moved
  })

export const blockTask = async ({ boardId, taskId, reason, author, moveToBugs = false } = {}) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const current = findTask(board, taskId)
    let moved = { task: current.task, fromColumnId: current.column.id, toColumnId: current.column.id, index: current.column.cards.indexOf(current.task) }
    if (moveToBugs) {
      const targetColumn = findOptionalColumnByCategory(board, 'bugs')
      if (targetColumn) moved = moveTaskToColumn(board, taskId, targetColumn)
    }
    moved.task.blockedReason = String(reason || 'Blocked')
    appendNoteToTask(moved.task, { text: moved.task.blockedReason, type: 'blocker', author })
    touchTask(moved.task)
    return moved
  })

export const reopenTask = async ({ boardId, taskId, targetColumnId, note, author } = {}) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const targetColumn = targetColumnId ? findColumn(board, targetColumnId) : findColumnByCategory(board, 'todo')
    const moved = moveTaskToColumn(board, taskId, targetColumn)
    delete moved.task.completedAt
    delete moved.task.blockedReason
    if (typeof note === 'string' && note.trim()) appendNoteToTask(moved.task, { text: note, type: 'progress', author })
    touchTask(moved.task)
    return moved
  })

export const getAgentDigest = async ({ boardId, owner, limit = 8 } = {}) => {
  const state = await readState()
  const boards = boardId ? [findBoard(state, boardId)] : state.boards
  const pageSize = clampListLimit(limit)
  const active = []
  const blocked = []
  const recent = []

  for (const board of boards) {
    for (const column of board.columns) {
      for (const task of column.cards) {
        if (owner && task.owner !== owner) continue
        const item = taskDigestItem(board, column, task)
        if (!task.completedAt && column.category !== 'done' && !task.blockedReason) active.push(item)
        if (task.blockedReason) blocked.push(item)
        recent.push(item)
      }
    }
  }

  recent.sort((left, right) => (right.lastTouchedAt || 0) - (left.lastTouchedAt || 0))
  const nextAction = blocked.length
    ? `Review blocked task: ${blocked[0].title}`
    : active.length
    ? `Continue active task: ${active[0].title}`
    : 'No active tasks found.'

  return {
    revision: state.revision,
    updatedAt: state.updatedAt,
    summary: summarizeState(state),
    active: active.slice(0, pageSize),
    blocked: blocked.slice(0, pageSize),
    recent: recent.slice(0, pageSize),
    nextAction,
  }
}

const applyTaskChange = (board, change = {}) => {
  const type = change.type
  if (type === 'append_note') {
    const { task } = findTask(board, change.taskId)
    const note = appendNoteToTask(task, { text: change.text, type: change.noteType || 'note', author: change.author })
    return { task, note }
  }
  if (type === 'set_owner') {
    const { task } = findTask(board, change.taskId)
    applyTaskPatch(task, { owner: change.owner })
    return { task }
  }
  if (type === 'set_priority') {
    const { task } = findTask(board, change.taskId)
    applyTaskPatch(task, { priority: change.priority })
    return { task }
  }
  if (type === 'move') {
    const targetColumn = findColumn(board, change.targetColumnId)
    return moveTaskToColumn(board, change.taskId, targetColumn, change.targetIndex)
  }
  if (type === 'start') {
    const targetColumn = findColumnByCategory(board, 'doing')
    const moved = moveTaskToColumn(board, change.taskId, targetColumn)
    if (typeof change.owner === 'string' && change.owner.trim()) {
      moved.task.owner = change.owner.trim()
      moved.task.claimedAt = now()
    }
    return moved
  }
  if (type === 'complete') {
    const targetColumn = findColumnByCategory(board, 'done')
    const moved = moveTaskToColumn(board, change.taskId, targetColumn)
    moved.task.completedAt = now()
    delete moved.task.blockedReason
    if (typeof change.verificationNote === 'string' && change.verificationNote.trim()) {
      appendNoteToTask(moved.task, { text: change.verificationNote, type: 'verification', author: change.author })
    }
    return moved
  }
  if (type === 'review') {
    const targetColumn = findColumnByCategory(board, 'review')
    const moved = moveTaskToColumn(board, change.taskId, targetColumn)
    if (typeof change.reviewNote === 'string' && change.reviewNote.trim()) {
      appendNoteToTask(moved.task, { text: change.reviewNote, type: 'progress', author: change.author })
    }
    return moved
  }
  if (type === 'block') {
    const current = findTask(board, change.taskId)
    let result = { task: current.task }
    if (change.moveToBugs) {
      const targetColumn = findColumnByCategory(board, 'bugs')
      result = moveTaskToColumn(board, change.taskId, targetColumn)
    }
    result.task.blockedReason = String(change.reason || 'Blocked')
    appendNoteToTask(result.task, { text: result.task.blockedReason, type: 'blocker', author: change.author })
    return result
  }
  if (type === 'reopen') {
    const targetColumn = change.targetColumnId ? findColumn(board, change.targetColumnId) : findColumnByCategory(board, 'todo')
    const moved = moveTaskToColumn(board, change.taskId, targetColumn)
    delete moved.task.completedAt
    delete moved.task.blockedReason
    return moved
  }
  throw new Error(`Unsupported task change type: ${type}`)
}

export const applyTaskChanges = async ({ boardId, changes = [] } = {}) =>
  mutateState((draft) => {
    const board = findBoard(draft, boardId)
    const changed = []
    const failed = []
    for (const [index, change] of (Array.isArray(changes) ? changes : []).entries()) {
      try {
        const result = applyTaskChange(board, change)
        changed.push({ index, type: change.type, task: summarizeTask(result.task) })
      } catch (error) {
        failed.push({ index, type: change?.type, message: error instanceof Error ? error.message : String(error) })
      }
    }
    return { changed, failed }
  })

export const searchTasks = async (args = {}) => listTasks(args)
