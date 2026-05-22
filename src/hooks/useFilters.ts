import { useMemo, useState } from 'react'
import type { Board, Card, CardSortMode, CategoryFilter, PriorityFilter, VisibleCard, VisibleColumn } from '../types'
import { PRIORITIES } from '../types'

export const useFilters = (activeBoard: Board | null) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [sortMode, setSortMode] = useState<CardSortMode>('manual')

  const visibleColumns = useMemo<VisibleColumn[]>(() => {
    if (!activeBoard) return []

    const query = searchQuery.trim().toLowerCase()
    const matchesSearch = (card: Card) => {
      if (!query) return true
      const subtaskText = card.subtasks?.map((subtask) => subtask.title).join(' ') ?? ''
      return `${card.title} ${card.description ?? ''} ${subtaskText} ${card.id}`
        .toLowerCase()
        .includes(query)
    }

    const sortCards = (cards: VisibleCard[]) => {
      const sorted = [...cards]
      sorted.sort((left, right) => {
        switch (sortMode) {
          case 'priority-desc':
            return PRIORITIES[right.card.priority].value - PRIORITIES[left.card.priority].value
          case 'priority-asc':
            return PRIORITIES[left.card.priority].value - PRIORITIES[right.card.priority].value
          case 'newest':
            return (right.card.createdAt ?? 0) - (left.card.createdAt ?? 0)
          case 'oldest':
            return (left.card.createdAt ?? 0) - (right.card.createdAt ?? 0)
          case 'title':
            return left.card.title.localeCompare(right.card.title)
          case 'manual':
          default:
            return left.originalIndex - right.originalIndex
        }
      })
      return sorted
    }

    return activeBoard.columns
      .filter((column) => categoryFilter === 'all' || column.category === categoryFilter)
      .map((column) => ({
        ...column,
        sourceColumn: column,
        totalCards: column.cards.length,
        cards: sortCards(
          column.cards
            .map((card, originalIndex) => ({ card, originalIndex }))
            .filter(({ card }) => priorityFilter === 'all' || card.priority === priorityFilter)
            .filter(({ card }) => matchesSearch(card)),
        ),
      }))
  }, [activeBoard, categoryFilter, priorityFilter, searchQuery, sortMode])

  const visibleTaskCount = useMemo(
    () => visibleColumns.reduce((sum, column) => sum + column.cards.length, 0),
    [visibleColumns],
  )

  const totalTaskCount = useMemo(
    () => activeBoard?.columns.reduce((sum, column) => sum + column.cards.length, 0) ?? 0,
    [activeBoard],
  )

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    priorityFilter !== 'all' ||
    categoryFilter !== 'all' ||
    sortMode !== 'manual'

  const clearFilters = () => {
    setSearchQuery('')
    setPriorityFilter('all')
    setCategoryFilter('all')
    setSortMode('manual')
  }

  return {
    searchQuery, setSearchQuery,
    priorityFilter, setPriorityFilter,
    categoryFilter, setCategoryFilter,
    sortMode, setSortMode,
    visibleColumns,
    visibleTaskCount,
    totalTaskCount,
    hasActiveFilters,
    clearFilters,
  }
}
