import {
  addSubtask,
  appendMcpMetric,
  appendTaskNote,
  applyTaskChanges,
  blockTask,
  completeTask,
  createBoard,
  createColumn,
  createTask,
  dataFilePath,
  deleteBoard,
  deleteColumn,
  deleteTask,
  ensureTask,
  getAgentDigest,
  getBoardSummary,
  getTask,
  listColumns,
  listTasks,
  moveTask,
  readState,
  replaceBoards,
  reopenTask,
  searchTasks,
  startTask,
  summarizeBoard,
  summarizeColumn,
  summarizeState,
  summarizeTask,
  toggleSubtask,
  updateBoard,
  updateColumn,
  updateTask,
} from './kanban-store.mjs'

export const textResult = (value) => ({
  content: [
    {
      type: 'text',
      text: typeof value === 'string' ? value : JSON.stringify(value),
    },
  ],
})

const metricText = (value) => {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const objectSchema = (properties = {}, required = []) => {
  const schema = {
    type: 'object',
    properties,
  }

  if (required.length) schema.required = required
  return schema
}

const stringProp = (description) => ({ type: 'string', description })
const booleanProp = (description) => ({ type: 'boolean', description })
const numberProp = (description) => ({ type: 'number', description })
const nullableNumberProp = (description) => ({
  anyOf: [{ type: 'number' }, { type: 'null' }],
  description,
})
const arrayProp = (description, items = { type: 'object' }) => ({ type: 'array', description, items })

const okResult = (state, result = {}) => ({
  ok: true,
  revision: state.revision,
  updatedAt: state.updatedAt,
  ...result,
})

const compactBoardResult = ({ state, result }) => okResult(state, { board: summarizeBoard(result) })
const compactColumnResult = ({ state, result }) => okResult(state, { column: summarizeColumn(result) })
const compactTaskResult = ({ state, result }) => okResult(state, { task: summarizeTask(result) })
const compactSubtaskResult = ({ state, result }) => okResult(state, { subtask: result })
const taskFieldsProp = () => arrayProp('Optional task fields to return. Supported: id, title, priority, createdAt, completedAt, descriptionPreview, subtaskCount, completedSubtaskCount.', {
  type: 'string',
  enum: [
    'id',
    'title',
    'priority',
    'createdAt',
    'completedAt',
    'owner',
    'claimedAt',
    'lastTouchedAt',
    'blockedReasonPreview',
    'noteCount',
    'descriptionPreview',
    'subtaskCount',
    'completedSubtaskCount',
  ],
})

const compactMoveResult = ({ state, result }) => okResult(state, {
  fromColumnId: result.fromColumnId,
  toColumnId: result.toColumnId,
  index: result.index,
  task: summarizeTask(result.task),
})

export const toolDefinitions = [
  {
    name: 'get_board_state',
    description: 'Expensive full-state debug/export read. Prefer get_board_summary, list_tasks, search_tasks, or get_task for normal work.',
    inputSchema: objectSchema({
      confirmExpensive: booleanProp('Must be true to read the full board state. Prefer compact tools for normal work.'),
    }, ['confirmExpensive']),
    handler: async ({ confirmExpensive }) => {
      if (confirmExpensive !== true) {
        throw new Error('get_board_state is expensive. Use get_board_summary/list_columns/list_tasks/get_task, or pass confirmExpensive: true for export/debug.')
      }
      return { dataFile: dataFilePath, ...(await readState()) }
    },
  },
  {
    name: 'replace_board_state',
    description: 'Replace all boards with the provided board array. Use this for bulk imports or carefully planned migrations.',
    inputSchema: objectSchema({
      boards: arrayProp('Complete board array to store.'),
      revision: numberProp('Optional expected state revision. When supplied, the replacement is rejected if the board changed first.'),
    }, ['boards']),
    handler: async ({ boards, revision }) => {
      const state = await replaceBoards(boards, revision ?? null)
      return okResult(state, summarizeState(state))
    },
  },
  {
    name: 'list_boards',
    description: 'List compact board summaries with column and task counts. Prefer this before any full-state read.',
    inputSchema: objectSchema(),
    handler: async () => getBoardSummary(),
  },
  {
    name: 'get_board_summary',
    description: 'Read compact board and column metadata with counts, without task bodies.',
    inputSchema: objectSchema({
      boardId: stringProp('Optional board id. Omit to summarize all boards.'),
    }),
    handler: async (args) => getBoardSummary(args),
  },
  {
    name: 'list_columns',
    description: 'List compact columns for one board with task counts, without task bodies.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
    }),
    handler: async (args) => listColumns(args),
  },
  {
    name: 'list_tasks',
    description: 'List compact task rows with pagination. Descriptions are returned as short previews unless includeFullTask is true.',
    inputSchema: objectSchema({
      boardId: stringProp('Optional board id.'),
      columnId: stringProp('Optional column id.'),
      query: stringProp('Optional text to match in title or description.'),
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      category: { type: 'string', enum: ['todo', 'doing', 'done', 'bugs', 'none'] },
      limit: numberProp('Maximum tasks to return. Defaults to 25, maximum 100.'),
      cursor: numberProp('Zero-based pagination cursor from a prior response.'),
      includeFullTask: booleanProp('When true, returns full task objects. Use get_task instead when you only need one task.'),
      fields: taskFieldsProp(),
    }),
    handler: async (args) => listTasks(args),
  },
  {
    name: 'get_task',
    description: 'Read one full task by id, including description and subtasks.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      taskId: stringProp('Task id.'),
    }, ['taskId']),
    handler: async (args) => getTask(args),
  },
  {
    name: 'create_board',
    description: 'Create a new board.',
    inputSchema: objectSchema({
      title: stringProp('Board title.'),
      withDefaultColumns: booleanProp('When true, creates To Do, In Progress, and Done columns. Defaults to true.'),
    }, ['title']),
    handler: async (args) => compactBoardResult(await createBoard(args)),
  },
  {
    name: 'update_board',
    description: 'Rename a board.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id.'),
      title: stringProp('New board title.'),
    }, ['boardId', 'title']),
    handler: async (args) => compactBoardResult(await updateBoard(args)),
  },
  {
    name: 'delete_board',
    description: 'Delete a board.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id.'),
    }, ['boardId']),
    handler: async (args) => {
      const { state, result } = await deleteBoard(args)
      return okResult(state, result)
    },
  },
  {
    name: 'create_column',
    description: 'Create a column on a board.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      title: stringProp('Column title.'),
      color: stringProp('Tailwind color class, e.g. bg-blue-500.'),
      category: { type: 'string', enum: ['todo', 'doing', 'done', 'bugs', 'none'] },
    }, ['title']),
    handler: async (args) => compactColumnResult(await createColumn(args)),
  },
  {
    name: 'update_column',
    description: 'Update a column title, color, or category.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      columnId: stringProp('Column id.'),
      title: stringProp('New column title.'),
      color: stringProp('Tailwind color class, e.g. bg-emerald-500.'),
      category: { type: 'string', enum: ['todo', 'doing', 'done', 'bugs', 'none'] },
    }, ['columnId']),
    handler: async (args) => compactColumnResult(await updateColumn(args)),
  },
  {
    name: 'delete_column',
    description: 'Delete a column and all tasks in it.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      columnId: stringProp('Column id.'),
    }, ['columnId']),
    handler: async (args) => {
      const { state, result } = await deleteColumn(args)
      return okResult(state, result)
    },
  },
  {
    name: 'create_task',
    description: 'Create a task in a column. Agents should prefer ensure_task to avoid duplicate TODOs.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      columnId: stringProp('Target column id. Omit to use the first column.'),
      title: stringProp('Task title.'),
      description: stringProp('Task description.'),
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      owner: stringProp('Optional owner or agent name.'),
      subtasks: arrayProp('Optional subtasks.', objectSchema({
        title: stringProp('Subtask title.'),
        completed: booleanProp('Completion state.'),
      }, ['title'])),
    }, ['title']),
    handler: async (args) => compactTaskResult(await createTask(args)),
  },
  {
    name: 'update_task',
    description: 'Update task fields. Do not use for progress history; use append_task_note instead.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      taskId: stringProp('Task id.'),
      title: stringProp('New task title.'),
      description: stringProp('New task description.'),
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      owner: stringProp('Optional owner or agent name. Empty string clears it.'),
      blockedReason: stringProp('Optional blocked reason. Empty string clears it.'),
      subtasks: arrayProp('Full replacement subtask array.'),
      completedAt: nullableNumberProp('Unix timestamp in milliseconds, or null to clear.'),
    }, ['taskId']),
    handler: async (args) => compactTaskResult(await updateTask(args)),
  },
  {
    name: 'ensure_task',
    description: 'Agent-safe idempotent create/update by exact title. Prefer this over create_task for TODO tracking.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      columnId: stringProp('Optional column id to scope lookup and creation.'),
      title: stringProp('Task title to find or create.'),
      description: stringProp('Optional description to set on create or update.'),
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      owner: stringProp('Optional owner or agent name.'),
      updateExisting: booleanProp('When false, existing matching task is returned without updates. Defaults to true.'),
      subtasks: arrayProp('Optional subtasks.', objectSchema({
        title: stringProp('Subtask title.'),
        completed: booleanProp('Completion state.'),
      }, ['title'])),
    }, ['title']),
    handler: async (args) => {
      const { state, result } = await ensureTask(args)
      return okResult(state, {
        created: result.created,
        columnId: result.columnId,
        task: summarizeTask(result.task),
      })
    },
  },
  {
    name: 'append_task_note',
    description: 'Append progress, blocker, verification, or comment history without overwriting the task description.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      taskId: stringProp('Task id.'),
      text: stringProp('Note text. Required.'),
      type: { type: 'string', enum: ['note', 'progress', 'blocker', 'verification', 'system'] },
      author: stringProp('Optional author or agent name.'),
    }, ['taskId', 'text']),
    handler: async (args) => {
      const { state, result } = await appendTaskNote(args)
      return okResult(state, { note: result.note, task: summarizeTask(result.task) })
    },
  },
  {
    name: 'start_task',
    description: 'Claim and move a task to the doing column by category, setting owner/claimedAt/lastTouchedAt.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      taskId: stringProp('Task id.'),
      owner: stringProp('Owner or agent name.'),
      note: stringProp('Optional progress note.'),
    }, ['taskId']),
    handler: async (args) => compactMoveResult(await startTask(args)),
  },
  {
    name: 'complete_task',
    description: 'Move a task to done after real verification. Add verificationNote when tests/smoke checks were run.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      taskId: stringProp('Task id.'),
      verificationNote: stringProp('Optional verification note, e.g. tests or manual smoke result.'),
      author: stringProp('Optional author or agent name.'),
    }, ['taskId']),
    handler: async (args) => compactMoveResult(await completeTask(args)),
  },
  {
    name: 'block_task',
    description: 'Mark a task blocked, append a blocker note, and optionally move it to the bugs column.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      taskId: stringProp('Task id.'),
      reason: stringProp('Blocked reason.'),
      author: stringProp('Optional author or agent name.'),
      moveToBugs: booleanProp('When true, move the task to the bugs column category.'),
    }, ['taskId', 'reason']),
    handler: async (args) => compactMoveResult(await blockTask(args)),
  },
  {
    name: 'reopen_task',
    description: 'Reopen a completed or blocked task, clearing completedAt/blockedReason and moving to todo or target column.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      taskId: stringProp('Task id.'),
      targetColumnId: stringProp('Optional target column id. Defaults to the todo column category.'),
      note: stringProp('Optional reopen note.'),
      author: stringProp('Optional author or agent name.'),
    }, ['taskId']),
    handler: async (args) => compactMoveResult(await reopenTask(args)),
  },
  {
    name: 'move_task',
    description: 'Move a task to another column and optionally to an exact index.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      taskId: stringProp('Task id.'),
      targetColumnId: stringProp('Target column id.'),
      targetIndex: numberProp('Optional zero-based target index.'),
    }, ['taskId', 'targetColumnId']),
    handler: async (args) => {
      const { state, result } = await moveTask(args)
      return okResult(state, {
        fromColumnId: result.fromColumnId,
        toColumnId: result.toColumnId,
        index: result.index,
        task: summarizeTask(result.task),
      })
    },
  },
  {
    name: 'delete_task',
    description: 'Delete a task from a board.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      taskId: stringProp('Task id.'),
    }, ['taskId']),
    handler: async (args) => {
      const { state, result } = await deleteTask(args)
      return okResult(state, result)
    },
  },
  {
    name: 'add_subtask',
    description: 'Append a subtask to a task.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      taskId: stringProp('Task id.'),
      title: stringProp('Subtask title.'),
      completed: booleanProp('Completion state. Defaults to false.'),
    }, ['taskId', 'title']),
    handler: async (args) => compactSubtaskResult(await addSubtask(args)),
  },
  {
    name: 'toggle_subtask',
    description: 'Toggle a subtask, or set it to a specific completion state.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      taskId: stringProp('Task id.'),
      subtaskId: stringProp('Subtask id.'),
      completed: booleanProp('Optional explicit completion state.'),
    }, ['taskId', 'subtaskId']),
    handler: async (args) => compactSubtaskResult(await toggleSubtask(args)),
  },
  {
    name: 'get_agent_digest',
    description: 'Compact agent TODO overview: board counts, active tasks, blocked tasks, recent touched tasks, and next action.',
    inputSchema: objectSchema({
      boardId: stringProp('Optional board id. Omit to digest all boards.'),
      owner: stringProp('Optional owner filter.'),
      limit: numberProp('Maximum items per section. Defaults to 8, maximum 100.'),
    }),
    handler: async (args) => getAgentDigest(args),
  },
  {
    name: 'apply_task_changes',
    description: 'Batch small agent task updates in one compact call. Supports append_note, set_owner, set_priority, start, complete, block, reopen, move.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      changes: arrayProp('Task changes to apply.', objectSchema({
        type: { type: 'string', enum: ['append_note', 'set_owner', 'set_priority', 'start', 'complete', 'block', 'reopen', 'move'] },
        taskId: stringProp('Task id.'),
        text: stringProp('Note text for append_note.'),
        noteType: { type: 'string', enum: ['note', 'progress', 'blocker', 'verification', 'system'] },
        author: stringProp('Optional author or agent name.'),
        owner: stringProp('Owner for set_owner or start.'),
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        reason: stringProp('Blocked reason for block.'),
        moveToBugs: booleanProp('When true for block, move to the bugs column category.'),
        verificationNote: stringProp('Verification note for complete.'),
        targetColumnId: stringProp('Target column id for move or reopen.'),
        targetIndex: numberProp('Optional zero-based target index.'),
      }, ['type', 'taskId'])),
    }, ['changes']),
    handler: async (args) => {
      const { state, result } = await applyTaskChanges(args)
      return okResult(state, result)
    },
  },
  {
    name: 'search_tasks',
    description: 'Search compact task rows by text, priority, or column category. Uses pagination and short description previews by default.',
    inputSchema: objectSchema({
      boardId: stringProp('Optional board id.'),
      query: stringProp('Text to search in title and description.'),
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      category: { type: 'string', enum: ['todo', 'doing', 'done', 'bugs', 'none'] },
      limit: numberProp('Maximum tasks to return. Defaults to 25, maximum 100.'),
      cursor: numberProp('Zero-based pagination cursor from a prior response.'),
      includeFullTask: booleanProp('When true, returns full task objects. Prefer get_task when you only need one full task.'),
      fields: taskFieldsProp(),
    }),
    handler: async (args) => searchTasks(args),
  },
]

const tools = new Map(toolDefinitions.map((tool) => [tool.name, tool]))

export const handleJsonRpcMessage = async (message) => {
  // Validate JSON-RPC 2.0 request structure
  if (
    message === null ||
    typeof message !== 'object' ||
    message.jsonrpc !== '2.0' ||
    typeof message.method !== 'string'
  ) {
    return {
      jsonrpc: '2.0',
      id: message && (typeof message.id === 'number' || typeof message.id === 'string') ? message.id : null,
      error: { code: -32600, message: 'Invalid Request' },
    }
  }

  // Valid request with no id is a notification — do not respond
  if (message.id === undefined || message.id === null) return null

  try {
    if (message.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: message.params?.protocolVersion || '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'kanban-board', version: '0.1.0' },
        },
      }
    }

    if (message.method === 'ping') {
      return { jsonrpc: '2.0', id: message.id, result: {} }
    }

    if (message.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          tools: toolDefinitions.map(({ name, description, inputSchema }) => ({
            name,
            description,
            inputSchema,
          })),
        },
      }
    }

    if (message.method === 'tools/call') {
      const tool = tools.get(message.params?.name)
      if (!tool) {
        return {
          jsonrpc: '2.0',
          id: message.id,
          error: { code: -32602, message: `Unknown tool: ${message.params?.name}` },
        }
      }

      const startedAt = Date.now()
      const requestText = metricText({
        name: message.params?.name,
        arguments: message.params?.arguments || {},
      })

      try {
        const result = await tool.handler(message.params?.arguments || {})
        const toolResult = textResult(result)
        const responseText = toolResult.content?.[0]?.text ?? metricText(toolResult)
        void appendMcpMetric({
          tool: tool.name,
          success: true,
          durationMs: Date.now() - startedAt,
          requestText,
          responseText,
        }).catch((metricError) => console.error('Kanban MCP metric write failed:', metricError))
        return { jsonrpc: '2.0', id: message.id, result: toolResult }
      } catch (error) {
        const errorValue = error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              ...(error.code != null ? { code: error.code } : {}),
              ...Object.fromEntries(Object.entries(error)),
            }
          : typeof error === 'object' && error !== null
          ? error
          : String(error)
        const toolResult = { ...textResult(errorValue), isError: true }
        const responseText = toolResult.content?.[0]?.text ?? metricText(toolResult)
        void appendMcpMetric({
          tool: tool.name,
          success: false,
          durationMs: Date.now() - startedAt,
          requestText,
          responseText,
          errorMessage: error instanceof Error ? error.message : String(error),
        }).catch((metricError) => console.error('Kanban MCP metric write failed:', metricError))
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: toolResult,
        }
      }
    }

    return {
      jsonrpc: '2.0',
      id: message.id,
      error: { code: -32601, message: `Unknown method: ${message.method}` },
    }
  } catch (error) {
    console.error('Kanban MCP internal error:', error)
    return {
      jsonrpc: '2.0',
      id: message.id,
      error: { code: -32603, message: 'Internal error' },
    }
  }
}
