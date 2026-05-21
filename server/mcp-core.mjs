import {
  addSubtask,
  createBoard,
  createColumn,
  createTask,
  dataFilePath,
  deleteBoard,
  deleteColumn,
  deleteTask,
  moveTask,
  readState,
  replaceBoards,
  searchTasks,
  toggleSubtask,
  updateBoard,
  updateColumn,
  updateTask,
} from './kanban-store.mjs'

export const textResult = (value) => ({
  content: [
    {
      type: 'text',
      text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
    },
  ],
})

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

export const toolDefinitions = [
  {
    name: 'get_board_state',
    description: 'Read the complete Kanban state, including boards, columns, tasks, and subtasks.',
    inputSchema: objectSchema(),
    handler: async () => ({ dataFile: dataFilePath, ...(await readState()) }),
  },
  {
    name: 'replace_board_state',
    description: 'Replace all boards with the provided board array. Use this for bulk imports or carefully planned migrations.',
    inputSchema: objectSchema({
      boards: arrayProp('Complete board array to store.'),
      revision: numberProp('Optional expected state revision. When supplied, the replacement is rejected if the board changed first.'),
    }, ['boards']),
    handler: async ({ boards, revision }) => replaceBoards(boards, revision ?? null),
  },
  {
    name: 'list_boards',
    description: 'List boards with column and task counts.',
    inputSchema: objectSchema(),
    handler: async () => {
      const state = await readState()
      return state.boards.map((board) => ({
        id: board.id,
        title: board.title,
        columns: board.columns.length,
        tasks: board.columns.reduce((sum, column) => sum + column.cards.length, 0),
      }))
    },
  },
  {
    name: 'create_board',
    description: 'Create a new board.',
    inputSchema: objectSchema({
      title: stringProp('Board title.'),
      withDefaultColumns: booleanProp('When true, creates To Do, In Progress, and Done columns. Defaults to true.'),
    }, ['title']),
    handler: async (args) => createBoard(args),
  },
  {
    name: 'update_board',
    description: 'Rename a board.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id.'),
      title: stringProp('New board title.'),
    }, ['boardId', 'title']),
    handler: async (args) => updateBoard(args),
  },
  {
    name: 'delete_board',
    description: 'Delete a board.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id.'),
    }, ['boardId']),
    handler: async (args) => deleteBoard(args),
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
    handler: async (args) => createColumn(args),
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
    handler: async (args) => updateColumn(args),
  },
  {
    name: 'delete_column',
    description: 'Delete a column and all tasks in it.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      columnId: stringProp('Column id.'),
    }, ['columnId']),
    handler: async (args) => deleteColumn(args),
  },
  {
    name: 'create_task',
    description: 'Create a task in a column.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      columnId: stringProp('Target column id. Omit to use the first column.'),
      title: stringProp('Task title.'),
      description: stringProp('Task description.'),
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      subtasks: arrayProp('Optional subtasks.', objectSchema({
        title: stringProp('Subtask title.'),
        completed: booleanProp('Completion state.'),
      }, ['title'])),
    }, ['title']),
    handler: async (args) => createTask(args),
  },
  {
    name: 'update_task',
    description: 'Update task title, description, priority, subtasks, or completion timestamp.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      taskId: stringProp('Task id.'),
      title: stringProp('New task title.'),
      description: stringProp('New task description.'),
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      subtasks: arrayProp('Full replacement subtask array.'),
      completedAt: nullableNumberProp('Unix timestamp in milliseconds, or null to clear.'),
    }, ['taskId']),
    handler: async (args) => updateTask(args),
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
    handler: async (args) => moveTask(args),
  },
  {
    name: 'delete_task',
    description: 'Delete a task from a board.',
    inputSchema: objectSchema({
      boardId: stringProp('Board id. Omit only if you want the first board.'),
      taskId: stringProp('Task id.'),
    }, ['taskId']),
    handler: async (args) => deleteTask(args),
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
    handler: async (args) => addSubtask(args),
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
    handler: async (args) => toggleSubtask(args),
  },
  {
    name: 'search_tasks',
    description: 'Search tasks by text, priority, or column category.',
    inputSchema: objectSchema({
      boardId: stringProp('Optional board id.'),
      query: stringProp('Text to search in title and description.'),
      priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      category: { type: 'string', enum: ['todo', 'doing', 'done', 'bugs', 'none'] },
    }),
    handler: async (args) => searchTasks(args),
  },
]

const tools = new Map(toolDefinitions.map((tool) => [tool.name, tool]))

export const handleJsonRpcMessage = async (message) => {
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

      const result = await tool.handler(message.params?.arguments || {})
      return { jsonrpc: '2.0', id: message.id, result: textResult(result) }
    }

    return {
      jsonrpc: '2.0',
      id: message.id,
      error: { code: -32601, message: `Unknown method: ${message.method}` },
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: message.id,
      result: { ...textResult(error.message), isError: true },
    }
  }
}
