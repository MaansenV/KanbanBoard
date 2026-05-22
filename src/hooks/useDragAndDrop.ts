import { useState } from 'react'
import type { DragState, DragType } from '../types'

export const useDragAndDrop = () => {
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    id: null,
    sourceId: null,
  })

  const handleDragStart = (
    e: React.DragEvent<HTMLElement>,
    type: DragType,
    id: string,
    sourceId: string | null = null,
  ) => {
    const target = e.currentTarget as HTMLElement
    setDragState({ type, id, sourceId })
    e.dataTransfer.effectAllowed = 'move'
    target.style.opacity = '0.4'
  }

  const handleDragEnd = (e: React.DragEvent<HTMLElement>) => {
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
    setDragState({ type: null, id: null, sourceId: null })
  }

  return { dragState, handleDragStart, handleDragEnd }
}
