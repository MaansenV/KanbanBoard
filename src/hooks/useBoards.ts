import { useMemo, useState } from 'react'
import type { Board, Card, CategoryKey, Subtask } from '../types'
import { generateId, deepClone } from '../utils/helpers'

export const useBoards = (initialBoards: Board[] = []) => {
  const [boards, setBoards] = useState<Board[]>(initialBoards)
  const [activeBoardId, setActiveBoardId] = useState<string | null>(() => initialBoards[0]?.id ?? null)

  const activeBoard = useMemo(
    () => boards.find((b) => b.id === activeBoardId) ?? null,
    [boards, activeBoardId],
  )

  // ── Board CRUD ──────────────────────────────────────────────────────

  const createBoard = (title: string) => {
    const newBoard: Board = {
      id: generateId(),
      title,
      createdAt: Date.now(),
      columns: [],
    }
    setBoards((prev) => [...prev, newBoard])
    setActiveBoardId(newBoard.id)
    return newBoard
  }

  const updateBoard = (boardId: string, title: string) => {
    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, title } : b)),
    )
  }

  const deleteBoard = (boardId: string) => {
    setBoards((prev) => {
      const filtered = prev.filter((b) => b.id !== boardId)
      if (activeBoardId === boardId) {
        setActiveBoardId(filtered.at(0)?.id ?? null)
      }
      return filtered
    })
  }

  const importBoards = (newBoards: Board[]) => {
    setBoards(newBoards)
    setActiveBoardId(newBoards.at(0)?.id ?? null)
  }

  // ── Column CRUD ────────────────────────────────────────────────────

  const createColumn = (
    boardId: string,
    title: string,
    color: string,
    category: CategoryKey,
  ) => {
    setBoards((prev) => {
      const next = deepClone(prev)
      const board = next.find((b) => b.id === boardId)
      if (!board) return prev
      board.columns.push({
        id: generateId(),
        title,
        color,
        category,
        cards: [],
      })
      return next
    })
  }

  const updateColumn = (
    boardId: string,
    columnId: string,
    title: string,
    color: string,
    category: CategoryKey,
  ) => {
    setBoards((prev) => {
      const next = deepClone(prev)
      const board = next.find((b) => b.id === boardId)
      if (!board) return prev
      const target = board.columns.find((c) => c.id === columnId)
      if (target) {
        target.title = title
        target.color = color
        target.category = category
      }
      return next
    })
  }

  const deleteColumn = (boardId: string, columnId: string) => {
    setBoards((prev) => {
      const next = deepClone(prev)
      const board = next.find((b) => b.id === boardId)
      if (!board) return prev
      board.columns = board.columns.filter((c) => c.id !== columnId)
      return next
    })
  }

  const dropColumn = (boardId: string, columnId: string, targetColId: string) => {
    setBoards((prev) => {
      const nextBoards = deepClone(prev)
      const board = nextBoards.find((b) => b.id === boardId)
      if (!board) return prev
      const sourceIdx = board.columns.findIndex((c) => c.id === columnId)
      const targetIdx = board.columns.findIndex((c) => c.id === targetColId)
      if (sourceIdx === -1 || targetIdx === -1) return prev
      const [movedCol] = board.columns.splice(sourceIdx, 1)
      board.columns.splice(targetIdx, 0, movedCol)
      return nextBoards
    })
  }

  // ── Card CRUD ──────────────────────────────────────────────────────

  const createCard = (
    boardId: string,
    columnId: string,
    cardData: Omit<Card, 'id' | 'createdAt'>,
  ) => {
    setBoards((prev) => {
      const next = deepClone(prev)
      const board = next.find((b) => b.id === boardId)
      if (!board) return prev
      const col = board.columns.find((c) => c.id === columnId)
      if (!col) return prev
      col.cards.push({
        id: generateId(),
        ...cardData,
        createdAt: Date.now(),
      })
      return next
    })
  }

  const updateCard = (
    boardId: string,
    columnId: string,
    cardId: string,
    cardData: Partial<Omit<Card, 'id'>>,
  ) => {
    setBoards((prev) => {
      const next = deepClone(prev)
      const board = next.find((b) => b.id === boardId)
      if (!board) return prev
      const col = board.columns.find((c) => c.id === columnId)
      if (!col) return prev
      const target = col.cards.find((c) => c.id === cardId)
      if (target) {
        Object.assign(target, cardData)
      }
      return next
    })
  }

  const deleteCard = (boardId: string, columnId: string, cardId: string) => {
    let deletedInfo: { card: Card; index: number } | null = null
    const board = boards.find((b) => b.id === boardId)
    const col = board?.columns.find((c) => c.id === columnId)
    const index = col?.cards.findIndex((c) => c.id === cardId) ?? -1
    if (col && index !== -1) {
      deletedInfo = { card: col.cards[index], index }
    }

    if (deletedInfo) {
      setBoards((prev) => {
        const next = deepClone(prev)
        const b = next.find((x) => x.id === boardId)
        const c = b?.columns.find((x) => x.id === columnId)
        if (c) {
          c.cards = c.cards.filter((x) => x.id !== cardId)
        }
        return next
      })
    }
    return deletedInfo
  }

  const undoCardDeletion = (
    boardId: string,
    columnId: string,
    card: Card,
    index: number,
  ) => {
    setBoards((prev) => {
      const next = deepClone(prev)
      const board = next.find((b) => b.id === boardId)
      const column = board?.columns.find((col) => col.id === columnId)
      if (!column || column.cards.some((c) => c.id === card.id)) return prev

      const targetIndex = Math.max(0, Math.min(index, column.cards.length))
      column.cards.splice(targetIndex, 0, card)
      return next
    })
  }

  const dropCard = (
    boardId: string,
    sourceColId: string,
    targetColId: string,
    cardId: string,
    targetIndex: number | null = null,
  ) => {
    setBoards((prev) => {
      const nextBoards = deepClone(prev)
      const board = nextBoards.find((b) => b.id === boardId)
      if (!board) return prev
      const sourceCol = board.columns.find((c) => c.id === sourceColId)
      const targetCol = board.columns.find((c) => c.id === targetColId)
      if (!sourceCol || !targetCol) return prev
      const cardIdx = sourceCol.cards.findIndex((c) => c.id === cardId)
      if (cardIdx === -1) return prev
      const [movedCard] = sourceCol.cards.splice(cardIdx, 1)

      // Update completedAt if moving to/from done column
      if (targetCol.category === 'done' && sourceCol.category !== 'done') {
        movedCard.completedAt = Date.now()
      } else if (targetCol.category !== 'done' && sourceCol.category === 'done') {
        movedCard.completedAt = undefined
      }

      if (targetIndex !== null) {
        targetCol.cards.splice(targetIndex, 0, movedCard)
      } else {
        targetCol.cards.push(movedCard)
      }
      return nextBoards
    })
  }

  // ── Subtask CRUD ───────────────────────────────────────────────────

  const createSubtask = (
    boardId: string,
    columnId: string,
    cardId: string,
    title: string,
  ) => {
    setBoards((prev) => {
      const next = deepClone(prev)
      const board = next.find((b) => b.id === boardId)
      if (!board) return prev
      const col = board.columns.find((c) => c.id === columnId)
      if (!col) return prev
      const card = col.cards.find((c) => c.id === cardId)
      if (!card) return prev
      if (!card.subtasks) card.subtasks = []
      card.subtasks.push({
        id: generateId(),
        title,
        completed: false,
      })
      return next
    })
  }

  const updateSubtask = (
    boardId: string,
    columnId: string,
    cardId: string,
    subtaskId: string,
    subtaskData: Partial<Omit<Subtask, 'id'>>,
  ) => {
    setBoards((prev) => {
      const next = deepClone(prev)
      const board = next.find((b) => b.id === boardId)
      if (!board) return prev
      const col = board.columns.find((c) => c.id === columnId)
      if (!col) return prev
      const card = col.cards.find((c) => c.id === cardId)
      if (!card) return prev
      const subtask = card.subtasks?.find((s) => s.id === subtaskId)
      if (subtask) {
        Object.assign(subtask, subtaskData)
      }
      return next
    })
  }

  const deleteSubtask = (
    boardId: string,
    columnId: string,
    cardId: string,
    subtaskId: string,
  ) => {
    setBoards((prev) => {
      const next = deepClone(prev)
      const board = next.find((b) => b.id === boardId)
      if (!board) return prev
      const col = board.columns.find((c) => c.id === columnId)
      if (!col) return prev
      const card = col.cards.find((c) => c.id === cardId)
      if (!card) return prev
      if (card.subtasks) {
        card.subtasks = card.subtasks.filter((s) => s.id !== subtaskId)
      }
      return next
    })
  }

  const toggleSubtask = (
    boardId: string,
    columnId: string,
    cardId: string,
    subtaskId: string,
  ) => {
    setBoards((prev) => {
      const next = deepClone(prev)
      const board = next.find((b) => b.id === boardId)
      if (!board) return prev
      const col = board.columns.find((c) => c.id === columnId)
      if (!col) return prev
      const card = col.cards.find((c) => c.id === cardId)
      if (!card) return prev
      const subtask = card.subtasks?.find((s) => s.id === subtaskId)
      if (subtask) {
        subtask.completed = !subtask.completed
      }
      return next
    })
  }

  return {
    boards,
    setBoards,
    activeBoardId,
    setActiveBoardId,
    activeBoard,
    createBoard,
    updateBoard,
    deleteBoard,
    importBoards,
    createColumn,
    updateColumn,
    deleteColumn,
    dropColumn,
    createCard,
    updateCard,
    deleteCard,
    undoCardDeletion,
    dropCard,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtask,
  }
}
