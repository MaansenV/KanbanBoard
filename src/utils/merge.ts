import type { Board, Card, Column, Subtask } from '../types'

// ── Helpers ─────────────────────────────────────────────────────────

const stableStringify = (value: unknown): string | undefined => JSON.stringify(value)

// ── Merge primitives ────────────────────────────────────────────────

export const mergeValue = <T,>(
  baseValue: T | undefined,
  localValue: T | undefined,
  remoteValue: T | undefined,
): T | undefined => {
  const baseSerialized = stableStringify(baseValue)
  const localSerialized = stableStringify(localValue)
  const remoteSerialized = stableStringify(remoteValue)

  if (localSerialized === remoteSerialized) return localValue
  if (localSerialized === baseSerialized) return remoteValue
  if (remoteSerialized === baseSerialized) return localValue
  return localValue
}

export const mergeById = <T extends { id: string }>(
  baseItems: T[] = [],
  localItems: T[] = [],
  remoteItems: T[] = [],
  mergeItem: (baseItem: T | undefined, localItem: T | undefined, remoteItem: T | undefined) => T | undefined,
): T[] => {
  const baseMap = new Map(baseItems.map((item) => [item.id, item]))
  const localMap = new Map(localItems.map((item) => [item.id, item]))
  const remoteMap = new Map(remoteItems.map((item) => [item.id, item]))
  const ids = [
    ...localItems.map((item) => item.id),
    ...remoteItems.map((item) => item.id),
    ...baseItems.map((item) => item.id),
  ]
  const seen = new Set<string>()
  const merged: T[] = []

  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)

    const baseItem = baseMap.get(id)
    const localItem = localMap.get(id)
    const remoteItem = remoteMap.get(id)

    if (!localItem && !baseItem && remoteItem) {
      merged.push(remoteItem)
      continue
    }
    if (!remoteItem && !baseItem && localItem) {
      merged.push(localItem)
      continue
    }
    if (!localItem || !remoteItem) continue

    const nextItem = mergeItem(baseItem, localItem, remoteItem)
    if (nextItem) merged.push(nextItem)
  }

  return merged
}

// ── Domain merge functions ──────────────────────────────────────────

export const mergeSubtask = (
  baseSubtask: Subtask | undefined,
  localSubtask: Subtask | undefined,
  remoteSubtask: Subtask | undefined,
): Subtask | undefined => {
  if (!localSubtask) return remoteSubtask
  if (!remoteSubtask) return localSubtask

  return {
    id: localSubtask.id,
    title: mergeValue(baseSubtask?.title, localSubtask.title, remoteSubtask.title) ?? localSubtask.title,
    completed: mergeValue(baseSubtask?.completed, localSubtask.completed, remoteSubtask.completed) ?? localSubtask.completed,
  }
}

export const mergeCard = (
  baseCard: Card | undefined,
  localCard: Card | undefined,
  remoteCard: Card | undefined,
): Card | undefined => {
  if (!localCard) return remoteCard
  if (!remoteCard) return localCard

  const merged: Card = {
    id: localCard.id,
    title: mergeValue(baseCard?.title, localCard.title, remoteCard.title) ?? localCard.title,
    description: mergeValue(baseCard?.description, localCard.description, remoteCard.description),
    priority: mergeValue(baseCard?.priority, localCard.priority, remoteCard.priority) ?? localCard.priority,
    createdAt: mergeValue(baseCard?.createdAt, localCard.createdAt, remoteCard.createdAt),
    completedAt: mergeValue(baseCard?.completedAt, localCard.completedAt, remoteCard.completedAt),
    subtasks: mergeById(baseCard?.subtasks, localCard.subtasks, remoteCard.subtasks, mergeSubtask),
  }

  if (!merged.description) delete merged.description
  if (!merged.createdAt) delete merged.createdAt
  if (!merged.completedAt) delete merged.completedAt
  if (merged.subtasks?.length === 0) delete merged.subtasks

  return merged
}

export const mergeColumn = (
  baseColumn: Column | undefined,
  localColumn: Column | undefined,
  remoteColumn: Column | undefined,
): Column | undefined => {
  if (!localColumn) return remoteColumn
  if (!remoteColumn) return localColumn

  return {
    id: localColumn.id,
    title: mergeValue(baseColumn?.title, localColumn.title, remoteColumn.title) ?? localColumn.title,
    color: mergeValue(baseColumn?.color, localColumn.color, remoteColumn.color) ?? localColumn.color,
    category: mergeValue(baseColumn?.category, localColumn.category, remoteColumn.category) ?? localColumn.category,
    cards: mergeById(baseColumn?.cards, localColumn.cards, remoteColumn.cards, mergeCard),
  }
}

export const mergeBoard = (
  baseBoard: Board | undefined,
  localBoard: Board | undefined,
  remoteBoard: Board | undefined,
): Board | undefined => {
  if (!localBoard) return remoteBoard
  if (!remoteBoard) return localBoard

  return {
    id: localBoard.id,
    title: mergeValue(baseBoard?.title, localBoard.title, remoteBoard.title) ?? localBoard.title,
    createdAt: mergeValue(baseBoard?.createdAt, localBoard.createdAt, remoteBoard.createdAt),
    columns: mergeById(baseBoard?.columns, localBoard.columns, remoteBoard.columns, mergeColumn),
  }
}

export const mergeBoards = (baseBoards: Board[], localBoards: Board[], remoteBoards: Board[]): Board[] =>
  mergeById(baseBoards, localBoards, remoteBoards, mergeBoard)
