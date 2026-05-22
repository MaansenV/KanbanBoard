import { useEffect, useState } from 'react'
import { FOLDED_TASKS_STORAGE_KEY } from '../utils/helpers'

export const useFoldedTasks = () => {
  const [foldedTaskIds, setFoldedTaskIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const saved = window.localStorage.getItem(FOLDED_TASKS_STORAGE_KEY)
      const parsed = saved ? JSON.parse(saved) : []
      return new Set(Array.isArray(parsed) ? parsed.map(String) : [])
    } catch (error) {
      console.error('Gefalteter Task-Zustand konnte nicht geladen werden.', error)
      return new Set()
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      FOLDED_TASKS_STORAGE_KEY,
      JSON.stringify(Array.from(foldedTaskIds)),
    )
  }, [foldedTaskIds])

  const toggleFold = (cardId: string) => {
    setFoldedTaskIds((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }

  const isFolded = (cardId: string) => foldedTaskIds.has(cardId)

  return { foldedTaskIds, toggleFold, isFolded }
}
