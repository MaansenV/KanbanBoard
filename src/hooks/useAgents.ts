import { useCallback, useEffect, useRef, useState } from 'react'
import type { Agent, StorageMode } from '../types'
import { API_BASE_URL } from '../utils/helpers'

const FALLBACK_AGENTS: Agent[] = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    type: 'opencode',
    registeredAt: Date.now(),
    lastSeen: Date.now(),
    status: 'idle',
  },
]

export const useAgents = (storageMode: StorageMode) => {
  const [agents, setAgents] = useState<Agent[]>(FALLBACK_AGENTS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<number | null>(null)

  const loadAgents = useCallback(async () => {
    if (storageMode !== 'api') return
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/api/agents`, { cache: 'no-store' })
      if (!response.ok) throw new Error(`API returned ${response.status}`)
      const data = await response.json() as { agents: Agent[] }
      setAgents(data.agents.length > 0 ? data.agents : FALLBACK_AGENTS)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents')
    } finally {
      setLoading(false)
    }
  }, [storageMode])

  useEffect(() => {
    if (storageMode !== 'api') {
      setAgents(FALLBACK_AGENTS)
      return
    }

    void loadAgents()
    intervalRef.current = window.setInterval(loadAgents, 5000)
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
    }
  }, [storageMode, loadAgents])

  return { agents, loading, error, refreshAgents: loadAgents }
}
