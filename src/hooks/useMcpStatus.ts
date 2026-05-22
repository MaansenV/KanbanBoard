import { useEffect, useState } from 'react'
import type { McpStatus, StorageMode } from '../types'
import { API_BASE_URL } from '../utils/helpers'

export const useMcpStatus = (storageMode: StorageMode) => {
  const [mcpStatus, setMcpStatus] = useState<McpStatus | null>(null)

  useEffect(() => {
    if (storageMode !== 'api') {
      setMcpStatus(null)
      return
    }

    const loadMcpStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/mcp-status`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`API returned ${response.status}`)
        setMcpStatus(await response.json() as McpStatus)
      } catch (error) {
        console.error(error)
        setMcpStatus({ connected: false, pid: null, updatedAt: null, ageMs: null })
      }
    }

    void loadMcpStatus()
    const interval = window.setInterval(loadMcpStatus, 2500)
    return () => window.clearInterval(interval)
  }, [storageMode])

  return mcpStatus
}
