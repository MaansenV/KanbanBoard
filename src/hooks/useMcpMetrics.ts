import { useEffect, useState } from 'react'
import type { McpMetrics, StorageMode } from '../types'
import { API_BASE_URL } from '../utils/helpers'

const emptyMetrics: McpMetrics = {
  calls: [],
  totals: { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, errors: 0 },
  updatedAt: null,
}

export const useMcpMetrics = (storageMode: StorageMode) => {
  const [metrics, setMetrics] = useState<McpMetrics>(emptyMetrics)

  useEffect(() => {
    if (storageMode !== 'api') {
      setMetrics(emptyMetrics)
      return
    }

    const loadMcpMetrics = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/mcp-metrics`, { cache: 'no-store' })
        if (!response.ok) throw new Error(`API returned ${response.status}`)
        setMetrics(await response.json() as McpMetrics)
      } catch (error) {
        console.error(error)
        setMetrics(emptyMetrics)
      }
    }

    void loadMcpMetrics()
    const interval = window.setInterval(loadMcpMetrics, 2500)
    return () => window.clearInterval(interval)
  }, [storageMode])

  return metrics
}
