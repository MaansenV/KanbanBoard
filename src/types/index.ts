import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import React from 'react'

// ── Core Types ──────────────────────────────────────────────────────

export type PriorityKey = 'low' | 'medium' | 'high' | 'critical'

export type PriorityConfig = {
  label: string
  value: number
  color: string
  accentClass: string
}

export type Subtask = {
  id: string
  title: string
  completed: boolean
}

export type TaskNote = {
  id: string
  timestamp: number
  type: 'note' | 'progress' | 'blocker' | 'verification' | 'system'
  text: string
  author?: string
}

export type Card = {
  id: string
  title: string
  description?: string
  priority: PriorityKey
  createdAt?: number
  completedAt?: number
  owner?: string
  claimedAt?: number
  lastTouchedAt?: number
  blockedReason?: string
  notes?: TaskNote[]
  subtasks?: Subtask[]
}

export type CategoryKey = 'todo' | 'doing' | 'review' | 'done' | 'bugs' | 'none'

export type Column = {
  id: string
  title: string
  color: string
  category: CategoryKey
  cards: Card[]
}

export type Board = {
  id: string
  title: string
  createdAt?: number
  columns: Column[]
}

// ── Modal Types ─────────────────────────────────────────────────────

export type ModalType =
  | 'createBoard'
  | 'editBoard'
  | 'createColumn'
  | 'editColumn'
  | 'createCard'
  | 'editCard'
  | 'deleteConfirm'
  | null

export type ModalState = {
  type: ModalType
  data?: Record<string, unknown> | null
}

// ── Drag & Drop ─────────────────────────────────────────────────────

export type DragType = 'card' | 'column' | null

export type DragState = {
  type: DragType
  id: string | null
  sourceId: string | null
}

// ── Storage & API ───────────────────────────────────────────────────

export type StorageMode = 'loading' | 'api' | 'local'

export type ApiState = {
  boards: Board[]
  revision: number
  updatedAt: number
}

export type McpStatus = {
  connected: boolean
  pid: number | null
  updatedAt: number | null
  ageMs: number | null
  dataFile?: string
}

export type McpMetricCall = {
  id: string
  timestamp: number
  tool: string
  success: boolean
  durationMs: number
  requestChars: number
  responseChars: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  errorMessage?: string
}

export type McpMetrics = {
  calls: McpMetricCall[]
  totals: {
    calls: number
    inputTokens: number
    outputTokens: number
    totalTokens: number
    errors: number
  }
  updatedAt: number | null
}

// ── Filtering & Sorting ─────────────────────────────────────────────

export type PriorityFilter = PriorityKey | 'all'
export type CategoryFilter = CategoryKey | 'all'
export type CardSortMode = 'manual' | 'priority-desc' | 'priority-asc' | 'newest' | 'oldest' | 'title'

// ── View Models ─────────────────────────────────────────────────────

export type VisibleCard = {
  card: Card
  originalIndex: number
}

export type VisibleColumn = Omit<Column, 'cards'> & {
  cards: VisibleCard[]
  sourceColumn: Column
  totalCards: number
}

// ── Undo / Snapshot ─────────────────────────────────────────────────

export type DeletedTaskSnapshot = {
  boardId: string
  columnId: string
  card: Card
  index: number
  deletedAt: number
}

// ── Command Palette ─────────────────────────────────────────────────

export type CommandPaletteAction = {
  id: string
  label: string
  description?: string
  icon?: React.ReactNode
  category: 'board' | 'task' | 'aktion'
  action: () => void
}

// ── Agent Dispatch Types ───────────────────────────────────────────

export type AgentType = 'opencode'

export type AgentStatus = 'idle' | 'busy'

export type Agent = {
  id: string
  name: string
  type: AgentType
  registeredAt: number
  lastSeen: number
  status: AgentStatus
}

export type DispatchStatus =
  | 'pending'
  | 'dispatched'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type TaskDispatch = {
  id: string
  agentId: string
  taskId: string
  boardId?: string
  prompt: string
  status: DispatchStatus
  createdAt: number
  dispatchedAt: number | null
  completedAt: number | null
  cancelledAt: number | null
  failedAt: number | null
  result: string | null
  error: string | null
  author: string
}

export type AgentsApiState = {
  agents: Agent[]
  revision: number
  updatedAt: number
}

export type DispatchesApiState = {
  dispatches: TaskDispatch[]
  revision: number
  updatedAt: number
  total: number
}

// ── Constants ───────────────────────────────────────────────────────

export const PRIORITIES: Record<PriorityKey, PriorityConfig & { icon: React.ReactNode }> = {
  low: {
    label: 'Niedrig',
    value: 1,
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    accentClass: 'accent-stripe-low',
    icon: React.createElement(CheckCircle2, { size: 14 }),
  },
  medium: {
    label: 'Mittel',
    value: 2,
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    accentClass: 'accent-stripe-medium',
    icon: React.createElement(Clock, { size: 14 }),
  },
  high: {
    label: 'Hoch',
    value: 3,
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    accentClass: 'accent-stripe-high',
    icon: React.createElement(AlertCircle, { size: 14 }),
  },
  critical: {
    label: 'Kritisch',
    value: 4,
    color: 'bg-red-500/10 text-red-400 border-red-500/20',
    accentClass: 'accent-stripe-critical',
    icon: React.createElement(AlertCircle, { size: 14 }),
  },
}

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  todo: 'Zu erledigen',
  doing: 'In Bearbeitung',
  review: 'Zur Prüfung',
  done: 'Erledigt',
  bugs: 'Bugs',
  none: 'Keine',
}

export const SORT_LABELS: Record<CardSortMode, string> = {
  manual: 'Manuell',
  'priority-desc': 'Priorität ↓',
  'priority-asc': 'Priorität ↑',
  newest: 'Neueste',
  oldest: 'Älteste',
  title: 'Titel A-Z',
}

export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
  pending: 'Wartend',
  dispatched: 'Zugestellt',
  completed: 'Erledigt',
  failed: 'Fehlgeschlagen',
  cancelled: 'Abgebrochen',
}
