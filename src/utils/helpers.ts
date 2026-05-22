import type { Board } from '../types'

// ── ID & Cloning ────────────────────────────────────────────────────

export const generateId = (): string => Math.random().toString(36).slice(2, 11)

export const deepClone = <T,>(value: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T)

// ── API ─────────────────────────────────────────────────────────────

export const API_BASE_URL = import.meta.env.VITE_KANBAN_API_URL ?? 'http://127.0.0.1:4174'

export const FOLDED_TASKS_STORAGE_KEY = 'kanban-folded-task-ids'

export const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 800,
): Promise<Response> => {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    window.clearTimeout(timeout)
  }
}

// ── Formatting ──────────────────────────────────────────────────────

export const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Gerade eben'
  if (seconds < 3600) return `Vor ${Math.floor(seconds / 60)} Min.`
  if (seconds < 86400) return `Vor ${Math.floor(seconds / 3600)} Std.`
  return `Vor ${Math.floor(seconds / 86400)} Tagen`
}

// ── Demo Data ───────────────────────────────────────────────────────

export const createDemoBoard = (): Board => ({
  id: generateId(),
  title: 'Mein Projekt',
  createdAt: Date.now(),
  columns: [
    {
      id: generateId(),
      title: 'Zu erledigen',
      color: 'bg-slate-500',
      category: 'todo',
      cards: [],
    },
    {
      id: generateId(),
      title: 'In Bearbeitung',
      color: 'bg-blue-500',
      category: 'doing',
      cards: [],
    },
    {
      id: generateId(),
      title: 'Erledigt',
      color: 'bg-emerald-500',
      category: 'done',
      cards: [],
    },
  ],
})
