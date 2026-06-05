import { useCallback, useEffect, useRef, useState } from 'react'
import type { TaskDispatch, StorageMode } from '../types'
import { API_BASE_URL } from '../utils/helpers'

export const useDispatches = (storageMode: StorageMode) => {
  const [dispatchesByTaskId, setDispatchesByTaskId] = useState<Record<string, TaskDispatch[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<number | null>(null)

  const loadDispatchesForTask = useCallback(async (taskId: string) => {
    if (storageMode !== 'api' || !taskId) return
    try {
      setLoading(true)
      const response = await fetch(
        `${API_BASE_URL}/api/dispatches?taskId=${encodeURIComponent(taskId)}&includeCompleted=true&limit=100`,
        { cache: 'no-store' },
      )
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const data = await response.json() as { dispatches: TaskDispatch[] }
      setDispatchesByTaskId((prev) => ({ ...prev, [taskId]: data.dispatches }))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dispatches')
    } finally {
      setLoading(false)
    }
  }, [storageMode])

  const createDispatch = useCallback(async (payload: {
    boardId: string
    taskId: string
    agentId: string
    prompt: string
    author?: string
  }) => {
    if (storageMode !== 'api') throw new Error('Dispatch requires API mode')
    const response = await fetch(`${API_BASE_URL}/api/dispatches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(err.error || `API returned ${response.status}`)
    }
    const result = await response.json() as { ok: boolean; dispatch: TaskDispatch }
    // Reload dispatches for this task
    await loadDispatchesForTask(payload.taskId)
    return result
  }, [storageMode, loadDispatchesForTask])

  const cancelDispatch = useCallback(async (dispatchId: string, reason?: string) => {
    if (storageMode !== 'api') throw new Error('Cancel requires API mode')
    const response = await fetch(`${API_BASE_URL}/api/dispatches/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispatchId, reason }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(err.error || `API returned ${response.status}`)
    }
    return response.json()
  }, [storageMode])

  const startPolling = useCallback((taskId: string) => {
    if (intervalRef.current) window.clearInterval(intervalRef.current)
    intervalRef.current = window.setInterval(() => {
      void loadDispatchesForTask(taskId)
    }, 4000)
  }, [loadDispatchesForTask])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  return {
    dispatchesByTaskId,
    loading,
    error,
    loadDispatchesForTask,
    createDispatch,
    cancelDispatch,
    startPolling,
    stopPolling,
  }
}
