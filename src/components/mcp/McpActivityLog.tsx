import { useEffect, useRef, useState } from 'react'
import { Terminal, Trash2 } from 'lucide-react'

export type LogEntry = {
  id: string
  timestamp: number
  type: 'info' | 'success' | 'warning' | 'error' | 'sync'
  message: string
}

type McpActivityLogProps = {
  logs?: LogEntry[]
  onClear?: () => void
}

export const McpActivityLog = ({ logs: propLogs, onClear }: McpActivityLogProps) => {
  const [localLogs, setLocalLogs] = useState<LogEntry[]>([])
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Use props if provided, otherwise generate/maintain local state with demo logs
  const displayLogs = propLogs !== undefined ? propLogs : localLogs

  useEffect(() => {
    if (propLogs === undefined && localLogs.length === 0) {
      // Seed some initial demo developer logs in German
      const initialLogs: LogEntry[] = [
        {
          id: 'init-1',
          timestamp: Date.now() - 15000,
          type: 'info',
          message: 'MCP-Client initialisiert. Warte auf Verbindung...',
        },
        {
          id: 'init-2',
          timestamp: Date.now() - 12000,
          type: 'success',
          message: 'Verbindung zu Kanban-MCP-Server hergestellt (PID 4174).',
        },
        {
          id: 'init-3',
          timestamp: Date.now() - 8000,
          type: 'sync',
          message: 'Schema-Synchronisation abgeschlossen. 0 Konflikte gefunden.',
        },
      ]
      setLocalLogs(initialLogs)
    }
  }, [propLogs, localLogs.length])

  // Scroll to bottom when logs change
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [displayLogs])

  const formatTimestamp = (timestamp: number) => {
    const d = new Date(timestamp)
    return d.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }) + '.' + String(d.getMilliseconds()).padStart(3, '0')
  }

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-emerald-400'
      case 'warning':
        return 'text-amber-400'
      case 'error':
        return 'text-rose-400 font-bold'
      case 'sync':
        return 'text-blue-400'
      case 'info':
      default:
        return 'text-slate-300'
    }
  }

  const handleClear = () => {
    if (onClear) {
      onClear()
    } else {
      setLocalLogs([])
    }
  }

  return (
    <div className="flex flex-col h-60 min-h-[15rem] rounded-xl border border-border bg-slate-950 font-mono text-[11px] shadow-inner">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border/40 bg-slate-900/80 px-3 py-1.5 text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal size={12} className="text-primary" />
          <span className="font-semibold text-slate-300">MCP Activity Log</span>
        </div>
        <button
          onClick={handleClear}
          className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
          title="Log löschen"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Terminal log stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar text-left select-text">
        {displayLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-500 italic">
            Keine Logs vorhanden.
          </div>
        ) : (
          displayLogs.map((log) => (
            <div key={log.id} className="leading-relaxed hover:bg-slate-900 px-1 rounded transition-colors">
              <span className="text-slate-500 mr-2">[{formatTimestamp(log.timestamp)}]</span>
              <span className={`mr-1.5 font-bold uppercase`}>
                [{log.type}]
              </span>
              <span className={getTypeColor(log.type)}>{log.message}</span>
            </div>
          ))
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal footer info */}
      <div className="border-t border-border/20 bg-slate-900/40 px-3 py-1 text-slate-500 flex items-center justify-between text-[10px]">
        <span>Status: Aktiv</span>
        <span>Zeilen: {displayLogs.length}</span>
      </div>
    </div>
  )
}
