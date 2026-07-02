import { useState } from 'react'
import { Bot, Send, X, RefreshCw } from 'lucide-react'
import type { Agent, TaskDispatch } from '../../types'
import { DISPATCH_STATUS_LABELS } from '../../types'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { formatTimeAgo } from '../../utils/helpers'

type DispatchPanelProps = {
  taskId: string
  agents: Agent[]
  dispatches: TaskDispatch[]
  loading?: boolean
  error?: string | null
  disabled?: boolean
  onCreateDispatch: (data: {
    taskId: string
    agentId: string
    prompt: string
  }) => Promise<void> | void
  onCancelDispatch?: (dispatchId: string) => Promise<void> | void
  onRefresh?: (taskId: string) => void
}

const statusBadgeVariant = (status: TaskDispatch['status']) => {
  switch (status) {
    case 'pending': return 'warning'
    case 'dispatched': return 'info'
    case 'completed': return 'success'
    case 'failed': return 'destructive'
    case 'cancelled': return 'outline'
    default: return 'secondary'
  }
}

export const DispatchPanel = ({
  taskId,
  agents,
  dispatches,
  loading = false,
  error,
  disabled = false,
  onCreateDispatch,
  onCancelDispatch,
  onRefresh,
}: DispatchPanelProps) => {
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id ?? 'orchestrator')
  const [prompt, setPrompt] = useState('')
  const [isDispatching, setIsDispatching] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const canDispatch = !disabled && !isDispatching && prompt.trim().length > 0 && agents.length > 0

  const handleDispatch = async () => {
    if (!canDispatch) return
    setLocalError(null)
    setIsDispatching(true)
    try {
      await onCreateDispatch({
        taskId,
        agentId: selectedAgentId,
        prompt: prompt.trim(),
      })
      setPrompt('')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Dispatch fehlgeschlagen')
    } finally {
      setIsDispatching(false)
    }
  }

  const handleCancel = async (dispatchId: string) => {
    if (!onCancelDispatch) return
    try {
      await onCancelDispatch(dispatchId)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Abbrechen fehlgeschlagen')
    }
  }

  return (
    <div className="mt-4 space-y-4 border-t border-border/40 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Bot size={16} className="text-primary" />
          Agent Dispatch
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={() => onRefresh(taskId)}
            disabled={loading}
            className="btn-icon"
            title="Aktualisieren"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Disabled Notice */}
      {disabled && (
        <p className="rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          Dispatch ist nur verfügbar, wenn die Offline-API läuft.
        </p>
      )}

      {/* Dispatch Form */}
      {!disabled && (
        <div className="space-y-3">
          {/* Agent Selector */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Agent
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="form-input p-2.5"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id} className="bg-card text-foreground">
                  {agent.name} {agent.status === 'busy' ? '(busy)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Prompt an Agent
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="z.B. Implementiere das Button-Layout mit Tailwind, responsive und dark-mode kompatibel..."
              rows={3}
              className="form-input resize-none"
            />
          </div>

          {/* Dispatch Button */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {prompt.length > 0 && `${prompt.length} Zeichen`}
            </span>
            <Button
              type="button"
              onClick={handleDispatch}
              disabled={!canDispatch}
              className="gap-2"
            >
              <Send size={14} />
              {isDispatching ? 'Wird gesendet...' : 'Dispatch erstellen'}
            </Button>
          </div>

          {/* Error Display */}
          {(error || localError) && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {localError || error}
            </p>
          )}
        </div>
      )}

      {/* Dispatch History */}
      {dispatches.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Dispatch-Historie</h4>
          <div className="custom-scrollbar max-h-48 space-y-2 overflow-y-auto">
            {dispatches.map((dispatch) => (
              <div
                key={dispatch.id}
                className="space-y-1.5 rounded-xl border border-border/40 bg-secondary/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusBadgeVariant(dispatch.status)}>
                      {DISPATCH_STATUS_LABELS[dispatch.status]}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground">
                      {agents.find((a) => a.id === dispatch.agentId)?.name ?? dispatch.agentId}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTimeAgo(dispatch.createdAt)}
                  </span>
                </div>

                {/* Prompt Preview */}
                <p className="line-clamp-2 text-xs text-foreground/80">
                  {dispatch.prompt}
                </p>

                {/* Result/Error */}
                {dispatch.result && (
                  <p className="rounded bg-emerald-500/10 px-2 py-1 text-xs text-emerald-600 dark:text-emerald-400">
                    {dispatch.result}
                  </p>
                )}
                {dispatch.error && (
                  <p className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
                    {dispatch.error}
                  </p>
                )}

                {/* Cancel button for pending dispatches */}
                {dispatch.status === 'pending' && onCancelDispatch && (
                  <button
                    type="button"
                    onClick={() => handleCancel(dispatch.id)}
                    className="mt-1 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X size={12} />
                    Abbrechen
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
