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
    <div className="space-y-4 border-t border-border/40 pt-4 mt-4">
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
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
            title="Aktualisieren"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {/* Disabled Notice */}
      {disabled && (
        <p className="text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2">
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
              className="w-full rounded-lg border border-input bg-background/50 p-2.5 text-sm text-foreground transition-all focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id} className="bg-background text-foreground">
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
              className="w-full rounded-lg border border-input bg-background/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
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
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {localError || error}
            </p>
          )}
        </div>
      )}

      {/* Dispatch History */}
      {dispatches.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Dispatch-Historie</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {dispatches.map((dispatch) => (
              <div
                key={dispatch.id}
                className="rounded-lg border border-border/40 bg-secondary/15 p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={statusBadgeVariant(dispatch.status)}>
                      {DISPATCH_STATUS_LABELS[dispatch.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-medium">
                      {agents.find((a) => a.id === dispatch.agentId)?.name ?? dispatch.agentId}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatTimeAgo(dispatch.createdAt)}
                  </span>
                </div>

                {/* Prompt Preview */}
                <p className="text-xs text-foreground/80 line-clamp-2">
                  {dispatch.prompt}
                </p>

                {/* Result/Error */}
                {dispatch.result && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded px-2 py-1">
                    {dispatch.result}
                  </p>
                )}
                {dispatch.error && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                    {dispatch.error}
                  </p>
                )}

                {/* Cancel button for pending dispatches */}
                {dispatch.status === 'pending' && onCancelDispatch && (
                  <button
                    type="button"
                    onClick={() => handleCancel(dispatch.id)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors mt-1"
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
