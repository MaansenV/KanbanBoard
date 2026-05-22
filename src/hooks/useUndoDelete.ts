import { useEffect, useState } from 'react'
import type { DeletedTaskSnapshot } from '../types'

export const useUndoDelete = () => {
  const [deletedTaskUndo, setDeletedTaskUndo] = useState<DeletedTaskSnapshot | null>(null)

  useEffect(() => {
    if (!deletedTaskUndo) return
    const timeout = window.setTimeout(() => setDeletedTaskUndo(null), 7000)
    return () => window.clearTimeout(timeout)
  }, [deletedTaskUndo])

  return { deletedTaskUndo, setDeletedTaskUndo }
}
