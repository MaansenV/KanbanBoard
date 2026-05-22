import { useEffect, useRef, useState } from 'react'
import type { ApiState, Board, StorageMode } from '../types'
import { API_BASE_URL, createDemoBoard, deepClone, fetchWithTimeout } from '../utils/helpers'
import { mergeBoards } from '../utils/merge'

type SyncCallbacks = {
  onBoardsLoaded: (boards: Board[], activeId?: string | null) => void
  onActiveBoardUpdate: (updater: (currentId: string | null) => string | null) => void
  onLastActivity: () => void
  onSyncError: (error: string | null) => void
}

export const useOfflineSync = (boards: Board[], callbacks: SyncCallbacks) => {
  const [storageMode, setStorageMode] = useState<StorageMode>('loading')
  const [syncError, setSyncError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)
  const remoteBoardsRef = useRef<Board[]>([])
  const remoteRevisionRef = useRef<number | null>(null)
  const remoteUpdatedAtRef = useRef<number | null>(null)
  const savingRef = useRef(false)
  const lastSerializedRef = useRef('')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadBoards = async () => {
      try {
        const response = await fetchWithTimeout(`${API_BASE_URL}/api/state`)
        if (!response.ok) throw new Error(`API returned ${response.status}`)

        const state = await response.json() as ApiState
        const nextBoards = state.boards.length > 0 ? state.boards : [createDemoBoard()]
        remoteBoardsRef.current = deepClone(nextBoards)
        remoteRevisionRef.current = state.revision
        remoteUpdatedAtRef.current = state.updatedAt
        lastSerializedRef.current = JSON.stringify(nextBoards)
        hasLoadedRef.current = true
        callbacks.onBoardsLoaded(nextBoards)
        callbacks.onActiveBoardUpdate((current) => {
          if (current && nextBoards.some((b) => b.id === current)) return current
          return nextBoards[0]?.id ?? null
        })
        setStorageMode('api')
        setSyncError(null)
        callbacks.onSyncError(null)
        return
      } catch (error) {
        console.info('Offline Kanban API nicht verfügbar, verwende Browser-Speicher.', error)
      }

      const saved = window.localStorage.getItem('kanban-boards')
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Board[]
          lastSerializedRef.current = JSON.stringify(parsed)
          hasLoadedRef.current = true
          callbacks.onBoardsLoaded(parsed)
          callbacks.onActiveBoardUpdate(() => parsed.at(0)?.id ?? null)
          setStorageMode('local')
          return
        } catch (error) {
          console.error(error)
        }
      }

      const demoBoard = createDemoBoard()
      lastSerializedRef.current = JSON.stringify([demoBoard])
      window.localStorage.setItem('kanban-boards', lastSerializedRef.current)
      hasLoadedRef.current = true
      callbacks.onBoardsLoaded([demoBoard])
      callbacks.onActiveBoardUpdate(() => demoBoard.id)
      setStorageMode('local')
    }

    void loadBoards()
  }, [])

  useEffect(() => {
    if (!hasLoadedRef.current || storageMode === 'loading') return

    const serialized = JSON.stringify(boards)
    if (serialized === lastSerializedRef.current) return
    lastSerializedRef.current = serialized

    if (storageMode === 'local') {
      window.localStorage.setItem('kanban-boards', serialized)
      return
    }

    const saveBoards = async () => {
      savingRef.current = true
      try {
        const response = await fetch(`${API_BASE_URL}/api/state`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            boards,
            revision: remoteRevisionRef.current,
            updatedAt: remoteUpdatedAtRef.current,
          }),
        })

        if (response.status === 409) {
          const conflict = await response.json() as { state: ApiState }
          const mergedBoards = mergeBoards(remoteBoardsRef.current, boards, conflict.state.boards)
          const retryResponse = await fetch(`${API_BASE_URL}/api/state`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              boards: mergedBoards,
              revision: conflict.state.revision,
            }),
          })

          if (!retryResponse.ok) {
            lastSerializedRef.current = JSON.stringify(remoteBoardsRef.current)
            const msg = 'Remote-Änderungen existieren; lokale Änderung wurde nicht gespeichert.'
            setSyncError(msg)
            callbacks.onSyncError(msg)
            return
          }

          const mergedState = await retryResponse.json() as ApiState
          remoteBoardsRef.current = deepClone(mergedState.boards)
          remoteRevisionRef.current = mergedState.revision
          remoteUpdatedAtRef.current = mergedState.updatedAt
          lastSerializedRef.current = JSON.stringify(mergedState.boards)
          callbacks.onBoardsLoaded(mergedState.boards)
          callbacks.onActiveBoardUpdate((current) => {
            if (current && mergedState.boards.some((b) => b.id === current)) return current
            return mergedState.boards[0]?.id ?? null
          })
          const msg = 'Remote- und lokale Änderungen wurden zusammengeführt.'
          setSyncError(msg)
          callbacks.onSyncError(msg)
          return
        }

        if (!response.ok) throw new Error(`API returned ${response.status}`)

        const state = await response.json() as ApiState
        remoteBoardsRef.current = deepClone(state.boards)
        remoteRevisionRef.current = state.revision
        remoteUpdatedAtRef.current = state.updatedAt
        lastSerializedRef.current = JSON.stringify(state.boards)
        setSyncError(null)
        callbacks.onSyncError(null)
      } catch (error) {
        console.error(error)
        lastSerializedRef.current = JSON.stringify(remoteBoardsRef.current)
        const msg = 'Offline-Sync fehlgeschlagen; wird beim nächsten Mal erneut versucht.'
        setSyncError(msg)
        callbacks.onSyncError(msg)
      } finally {
        savingRef.current = false
      }
    }

    void saveBoards()
  }, [boards, storageMode, callbacks])

  useEffect(() => {
    if (storageMode !== 'api') return

    const interval = window.setInterval(async () => {
      if (savingRef.current) return

      try {
        const response = await fetch(`${API_BASE_URL}/api/state`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`API returned ${response.status}`)

        const state = await response.json() as ApiState
        const serialized = JSON.stringify(state.boards)
        if (state.revision === remoteRevisionRef.current || serialized === lastSerializedRef.current) {
          return
        }

        remoteBoardsRef.current = deepClone(state.boards)
        remoteRevisionRef.current = state.revision
        remoteUpdatedAtRef.current = state.updatedAt
        lastSerializedRef.current = serialized
        callbacks.onBoardsLoaded(state.boards)
        callbacks.onActiveBoardUpdate((current) => {
          if (current && state.boards.some((b) => b.id === current)) return current
          return state.boards[0]?.id ?? null
        })
        callbacks.onLastActivity()
        setSyncError(null)
        callbacks.onSyncError(null)
      } catch (error) {
        console.error(error)
        const msg = 'Offline-API ist derzeit nicht erreichbar.'
        setSyncError(msg)
        callbacks.onSyncError(msg)
      }
    }, 1200)

    return () => window.clearInterval(interval)
  }, [storageMode, callbacks])

  return { storageMode, syncError }
}
