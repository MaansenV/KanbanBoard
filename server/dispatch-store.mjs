import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { dataFilePath, getTask, appendTaskNote } from './kanban-store.mjs'

const DATA_DIR = dirname(dataFilePath)

const AGENTS_FILE = resolve(
  process.env.KANBAN_AGENTS_FILE ?? join(DATA_DIR, 'agents.json'),
)
const DISPATCHES_FILE = resolve(
  process.env.KANBAN_DISPATCHES_FILE ?? join(DATA_DIR, 'dispatches.json'),
)

const AGENTS_LOCK_DIR = `${AGENTS_FILE}.lock`
const DISPATCHES_LOCK_DIR = `${DISPATCHES_FILE}.lock`

const MAX_PROMPT_LENGTH = 20_000
const MAX_RESULT_LENGTH = 50_000
const DEFAULT_LIST_LIMIT = 50
const MAX_LIST_LIMIT = 200

const now = () => Date.now()
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const parseStoredJson = (raw) => JSON.parse(raw.replace(/^\uFEFF/, ''))
const generateId = () => {
  if (typeof randomUUID === 'function') return `d_${randomUUID().slice(0, 12)}`
  return `d_${Math.random().toString(36).slice(2, 14)}`
}

// ── File Locking ──────────────────────────────────────────────────

const isProcessAlive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if (error.code === 'EPERM') return true
    return false
  }
}

const withFileLock = async (lockDir, operation) => {
  const startedAt = now()

  while (true) {
    try {
      await mkdir(lockDir)
      try {
        await writeFile(`${lockDir}/pid`, String(process.pid), 'utf8')
      } catch (pidError) {
        await rm(lockDir, { recursive: true, force: true }).catch(() => {})
        throw pidError
      }
      break
    } catch (error) {
      if (error.code !== 'EEXIST') throw error

      const elapsed = now() - startedAt
      if (elapsed > 3000) {
        const pidRaw = await readFile(`${lockDir}/pid`, 'utf8').catch(() => null)
        if (pidRaw !== null) {
          const holderPid = Number(pidRaw.trim())
          if (!Number.isFinite(holderPid) || holderPid <= 0 || !isProcessAlive(holderPid)) {
            await rm(lockDir, { recursive: true, force: true }).catch(() => {})
            continue
          }
        }
        throw error
      }

      await sleep(35)
    }
  }

  try {
    return await operation()
  } finally {
    await rm(lockDir, { recursive: true, force: true }).catch(() => {})
  }
}

const writeJsonAtomic = async (filePath, data) => {
  await mkdir(dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.${process.pid}-${generateId()}.tmp`
  try {
    await writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
    await rename(tmpPath, filePath)
  } catch (error) {
    await rm(tmpPath, { force: true }).catch(() => {})
    throw error
  }
}

const readJsonFile = async (filePath, defaultValue) => {
  try {
    const raw = await readFile(filePath, 'utf8')
    return parseStoredJson(raw)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return defaultValue
  }
}

// ── Normalization ─────────────────────────────────────────────────

const normalizeAgent = (agent = {}) => ({
  id: String(agent.id || 'orchestrator'),
  name: String(agent.name || 'Orchestrator'),
  type: 'opencode',
  registeredAt: Number.isFinite(agent.registeredAt) ? agent.registeredAt : now(),
  lastSeen: Number.isFinite(agent.lastSeen) ? agent.lastSeen : now(),
  status: agent.status === 'busy' ? 'busy' : 'idle',
})

const normalizeAgentsState = (input = {}) => {
  const agents = Array.isArray(input.agents) ? input.agents.map(normalizeAgent) : []
  // Ensure default orchestrator exists
  if (!agents.find((a) => a.id === 'orchestrator')) {
    agents.unshift(normalizeAgent({ id: 'orchestrator', name: 'Orchestrator' }))
  }
  return {
    agents,
    revision: Number.isFinite(input.revision) ? input.revision : 0,
    updatedAt: Number.isFinite(input.updatedAt) ? input.updatedAt : now(),
  }
}

const dispatchStatuses = new Set(['pending', 'dispatched', 'completed', 'failed', 'cancelled'])

const normalizeDispatch = (dispatch = {}) => ({
  id: String(dispatch.id || generateId()),
  agentId: String(dispatch.agentId || 'orchestrator'),
  taskId: String(dispatch.taskId || ''),
  boardId: typeof dispatch.boardId === 'string' ? dispatch.boardId : undefined,
  prompt: String(dispatch.prompt || ''),
  status: dispatchStatuses.has(dispatch.status) ? dispatch.status : 'pending',
  createdAt: Number.isFinite(dispatch.createdAt) ? dispatch.createdAt : now(),
  dispatchedAt: Number.isFinite(dispatch.dispatchedAt) ? dispatch.dispatchedAt : null,
  completedAt: Number.isFinite(dispatch.completedAt) ? dispatch.completedAt : null,
  cancelledAt: Number.isFinite(dispatch.cancelledAt) ? dispatch.cancelledAt : null,
  failedAt: Number.isFinite(dispatch.failedAt) ? dispatch.failedAt : null,
  result: typeof dispatch.result === 'string' ? dispatch.result : null,
  error: typeof dispatch.error === 'string' ? dispatch.error : null,
  author: String(dispatch.author || 'unknown'),
})

const normalizeDispatchState = (input = {}) => ({
  dispatches: Array.isArray(input.dispatches) ? input.dispatches.map(normalizeDispatch) : [],
  revision: Number.isFinite(input.revision) ? input.revision : 0,
  updatedAt: Number.isFinite(input.updatedAt) ? input.updatedAt : now(),
})

const clampListLimit = (limit) => {
  if (!Number.isFinite(limit)) return DEFAULT_LIST_LIMIT
  return Math.max(1, Math.min(Math.trunc(limit), MAX_LIST_LIMIT))
}

const isTerminal = (status) => status === 'completed' || status === 'failed' || status === 'cancelled'

// ── Agent Functions ───────────────────────────────────────────────

export const ensureDefaultAgent = async ({ touch = false } = {}) => {
  return withFileLock(AGENTS_LOCK_DIR, async () => {
    const state = normalizeAgentsState(await readJsonFile(AGENTS_FILE, { agents: [] }))
    const existing = state.agents.find((a) => a.id === 'orchestrator')

    if (existing) {
      if (touch) existing.lastSeen = now()
      existing.name = existing.name || 'Orchestrator'
      existing.type = 'opencode'
    } else {
      state.agents.unshift(normalizeAgent({
        id: 'orchestrator',
        name: 'Orchestrator',
        registeredAt: now(),
        lastSeen: now(),
      }))
    }

    state.revision += 1
    state.updatedAt = now()
    await writeJsonAtomic(AGENTS_FILE, state)
    return state.agents.find((a) => a.id === 'orchestrator')
  })
}

export const registerAgent = async ({ id, name, type, status } = {}) => {
  return withFileLock(AGENTS_LOCK_DIR, async () => {
    const state = normalizeAgentsState(await readJsonFile(AGENTS_FILE, { agents: [] }))
    const agentId = String(id || 'orchestrator')
    const existing = state.agents.find((a) => a.id === agentId)

    if (existing) {
      if (name) existing.name = String(name)
      existing.type = 'opencode'
      if (status === 'busy') existing.status = 'busy'
      else existing.status = 'idle'
      existing.lastSeen = now()
    } else {
      state.agents.push(normalizeAgent({
        id: agentId,
        name: name || agentId,
        type: 'opencode',
        status,
        registeredAt: now(),
        lastSeen: now(),
      }))
    }

    state.revision += 1
    state.updatedAt = now()
    await writeJsonAtomic(AGENTS_FILE, state)
    return {
      agent: state.agents.find((a) => a.id === agentId),
      agents: state.agents,
      revision: state.revision,
      updatedAt: state.updatedAt,
    }
  })
}

export const listAgents = async ({ touchDefault = true } = {}) => {
  return withFileLock(AGENTS_LOCK_DIR, async () => {
    const state = normalizeAgentsState(await readJsonFile(AGENTS_FILE, { agents: [] }))
    if (touchDefault) {
      const orch = state.agents.find((a) => a.id === 'orchestrator')
      if (orch) {
        orch.lastSeen = now()
        state.revision += 1
        state.updatedAt = now()
        await writeJsonAtomic(AGENTS_FILE, state)
      }
    }
    return {
      agents: state.agents,
      revision: state.revision,
      updatedAt: state.updatedAt,
    }
  })
}

export const getAgent = async (agentId) => {
  const state = normalizeAgentsState(await readJsonFile(AGENTS_FILE, { agents: [] }))
  return state.agents.find((a) => a.id === agentId) || null
}

// ── Dispatch Functions ────────────────────────────────────────────

export const createDispatch = async ({ boardId, taskId, agentId, prompt, author } = {}) => {
  const trimmedPrompt = String(prompt || '').trim()
  if (!trimmedPrompt) {
    const error = new Error('Dispatch prompt is required and cannot be empty.')
    error.code = 'VALIDATION_ERROR'
    throw error
  }
  if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
    const error = new Error(`Dispatch prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters.`)
    error.code = 'VALIDATION_ERROR'
    throw error
  }
  if (!taskId) {
    const error = new Error('Task ID is required for dispatch.')
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  // Validate task exists
  let taskInfo
  try {
    taskInfo = await getTask({ boardId, taskId })
  } catch {
    const error = new Error(`Task not found: ${taskId}`)
    error.code = 'NOT_FOUND'
    throw error
  }

  // Ensure agent exists
  await ensureDefaultAgent()

  const targetAgentId = String(agentId || 'orchestrator')

  const dispatch = normalizeDispatch({
    id: generateId(),
    agentId: targetAgentId,
    taskId,
    boardId: taskInfo.boardId,
    prompt: trimmedPrompt,
    status: 'pending',
    createdAt: now(),
    author: author || 'user',
  })

  // Write dispatch
  await withFileLock(DISPATCHES_LOCK_DIR, async () => {
    const state = normalizeDispatchState(await readJsonFile(DISPATCHES_FILE, { dispatches: [] }))
    state.dispatches.push(dispatch)
    state.revision += 1
    state.updatedAt = now()
    await writeJsonAtomic(DISPATCHES_FILE, state)
  })

  // Append task note (best-effort, fail dispatch if note fails)
  let note
  try {
    const noteResult = await appendTaskNote({
      boardId: taskInfo.boardId,
      taskId,
      text: `Dispatch an ${targetAgentId} erstellt.\n\nPrompt:\n${trimmedPrompt}`,
      type: 'system',
      author: author || 'user',
    })
    note = noteResult.note
  } catch (noteError) {
    // Mark dispatch as failed
    await withFileLock(DISPATCHES_LOCK_DIR, async () => {
      const state = normalizeDispatchState(await readJsonFile(DISPATCHES_FILE, { dispatches: [] }))
      const d = state.dispatches.find((x) => x.id === dispatch.id)
      if (d) {
        d.status = 'failed'
        d.failedAt = now()
        d.error = `Task note creation failed: ${noteError.message}`
      }
      state.revision += 1
      state.updatedAt = now()
      await writeJsonAtomic(DISPATCHES_FILE, state)
    })
    dispatch.status = 'failed'
    dispatch.failedAt = now()
    dispatch.error = `Task note creation failed: ${noteError.message}`
  }

  return {
    ok: dispatch.status !== 'failed',
    dispatch,
    ...(note ? { note } : {}),
    task: taskInfo.task,
  }
}

export const listDispatches = async ({
  agentId,
  taskId,
  status,
  includeCompleted = true,
  markDispatched = false,
  limit = DEFAULT_LIST_LIMIT,
} = {}) => {
  const pageSize = clampListLimit(limit)

  return withFileLock(DISPATCHES_LOCK_DIR, async () => {
    const state = normalizeDispatchState(await readJsonFile(DISPATCHES_FILE, { dispatches: [] }))
    let matches = state.dispatches

    if (agentId) matches = matches.filter((d) => d.agentId === agentId)
    if (taskId) matches = matches.filter((d) => d.taskId === taskId)
    if (status) matches = matches.filter((d) => d.status === status)
    if (!includeCompleted) matches = matches.filter((d) => !isTerminal(d.status))

    // Sort: newest first
    matches.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    const page = matches.slice(0, pageSize)

    // Mark dispatched if requested
    if (markDispatched) {
      let changed = false
      for (const d of page) {
        if (d.status === 'pending') {
          d.status = 'dispatched'
          d.dispatchedAt = now()
          changed = true
        }
      }
      if (changed) {
        state.revision += 1
        state.updatedAt = now()
        await writeJsonAtomic(DISPATCHES_FILE, state)
      }
    }

    return {
      dispatches: page,
      revision: state.revision,
      updatedAt: state.updatedAt,
      total: matches.length,
    }
  })
}

export const completeDispatch = async ({ dispatchId, result, success = true } = {}) => {
  if (!dispatchId) {
    const error = new Error('Dispatch ID is required.')
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  return withFileLock(DISPATCHES_LOCK_DIR, async () => {
    const state = normalizeDispatchState(await readJsonFile(DISPATCHES_FILE, { dispatches: [] }))
    const dispatch = state.dispatches.find((d) => d.id === dispatchId)
    if (!dispatch) {
      const error = new Error(`Dispatch not found: ${dispatchId}`)
      error.code = 'NOT_FOUND'
      throw error
    }

    // Idempotent for same terminal state, error for conflicting transitions
    if (isTerminal(dispatch.status)) {
      if (dispatch.status === 'cancelled') {
        const error = new Error('Cannot complete a cancelled dispatch.')
        error.code = 'INVALID_STATE'
        throw error
      }
      if (
        (success !== false && dispatch.status === 'completed') ||
        (success === false && dispatch.status === 'failed')
      ) {
        return { ok: true, dispatch }
      }
      const error = new Error(`Dispatch is already terminal with status ${dispatch.status}.`)
      error.code = 'INVALID_STATE'
      throw error
    }

    const trimmedResult = String(result || '').trim().slice(0, MAX_RESULT_LENGTH) || null

    if (success !== false) {
      dispatch.status = 'completed'
      dispatch.completedAt = now()
      dispatch.result = trimmedResult
      dispatch.error = null
    } else {
      dispatch.status = 'failed'
      dispatch.failedAt = now()
      dispatch.error = trimmedResult || 'Dispatch failed.'
      dispatch.result = null
    }

    state.revision += 1
    state.updatedAt = now()
    await writeJsonAtomic(DISPATCHES_FILE, state)

    // Append task note (best-effort)
    try {
      const noteText = success !== false
        ? `Dispatch ${dispatchId} abgeschlossen.\n${trimmedResult ? `Ergebnis: ${trimmedResult}` : ''}`
        : `Dispatch ${dispatchId} fehlgeschlagen.\n${dispatch.error}`
      await appendTaskNote({
        boardId: dispatch.boardId,
        taskId: dispatch.taskId,
        text: noteText,
        type: 'system',
        author: dispatch.agentId,
      })
    } catch {
      // Don't fail the completion over a note error
    }

    // Update agent status if no more pending/dispatched for this agent
    const pendingCount = state.dispatches.filter(
      (d) => d.agentId === dispatch.agentId && (d.status === 'pending' || d.status === 'dispatched')
    ).length
    if (pendingCount === 0) {
      await withFileLock(AGENTS_LOCK_DIR, async () => {
        const agentState = normalizeAgentsState(await readJsonFile(AGENTS_FILE, { agents: [] }))
        const agent = agentState.agents.find((a) => a.id === dispatch.agentId)
        if (agent) {
          agent.status = 'idle'
          agentState.revision += 1
          agentState.updatedAt = now()
          await writeJsonAtomic(AGENTS_FILE, agentState)
        }
      })
    }

    return { ok: true, dispatch }
  })
}

export const cancelDispatch = async ({ dispatchId, reason, author } = {}) => {
  if (!dispatchId) {
    const error = new Error('Dispatch ID is required.')
    error.code = 'VALIDATION_ERROR'
    throw error
  }

  return withFileLock(DISPATCHES_LOCK_DIR, async () => {
    const state = normalizeDispatchState(await readJsonFile(DISPATCHES_FILE, { dispatches: [] }))
    const dispatch = state.dispatches.find((d) => d.id === dispatchId)
    if (!dispatch) {
      const error = new Error(`Dispatch not found: ${dispatchId}`)
      error.code = 'NOT_FOUND'
      throw error
    }

    if (dispatch.status === 'cancelled') {
      return { ok: true, dispatch }
    }
    if (isTerminal(dispatch.status)) {
      const error = new Error(`Cannot cancel dispatch with status ${dispatch.status}.`)
      error.code = 'INVALID_STATE'
      throw error
    }

    dispatch.status = 'cancelled'
    dispatch.cancelledAt = now()
    dispatch.error = reason || null

    state.revision += 1
    state.updatedAt = now()
    await writeJsonAtomic(DISPATCHES_FILE, state)

    // Append task note (best-effort)
    try {
      await appendTaskNote({
        boardId: dispatch.boardId,
        taskId: dispatch.taskId,
        text: `Dispatch ${dispatchId} wurde abgebrochen.${reason ? `\nGrund: ${reason}` : ''}`,
        type: 'system',
        author: author || dispatch.author,
      })
    } catch {
      // Don't fail cancellation over a note error
    }

    return { ok: true, dispatch }
  })
}

export const listDispatchesForTask = async ({ taskId } = {}) => {
  return listDispatches({
    taskId,
    includeCompleted: true,
    limit: 100,
  })
}

// ── Exports for external use ──────────────────────────────────────
export { AGENTS_FILE as agentsFilePath, DISPATCHES_FILE as dispatchesFilePath }
