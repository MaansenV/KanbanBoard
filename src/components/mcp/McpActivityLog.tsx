import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Database,
  Gauge,
  Info,
  ListFilter,
  Maximize2,
  Minimize2,
  PlugZap,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react'
import type { McpMetrics, McpStatus, StorageMode } from '../../types'

export type LogEntry = {
  id: string
  timestamp: number
  type: 'info' | 'success' | 'warning' | 'error' | 'sync'
  message: string
  title?: string
  details?: string[]
  meta?: Record<string, string | number | boolean | null | undefined>
}

type LogFilter = 'all' | LogEntry['type']

type McpActivityLogProps = {
  logs?: LogEntry[]
  mcpStatus?: McpStatus | null
  mcpMetrics?: McpMetrics
  storageMode?: StorageMode
  syncError?: string | null
  onClear?: () => void
}

const typeStyles: Record<LogEntry['type'], { label: string; icon: typeof Info; tone: string; border: string }> = {
  info: {
    label: 'Info',
    icon: Info,
    tone: 'text-slate-300 bg-slate-800/80',
    border: 'border-slate-700/70',
  },
  success: {
    label: 'OK',
    icon: CheckCircle2,
    tone: 'text-emerald-300 bg-emerald-500/10',
    border: 'border-emerald-500/25',
  },
  warning: {
    label: 'Warnung',
    icon: AlertTriangle,
    tone: 'text-amber-300 bg-amber-500/10',
    border: 'border-amber-500/25',
  },
  error: {
    label: 'Fehler',
    icon: XCircle,
    tone: 'text-rose-300 bg-rose-500/10',
    border: 'border-rose-500/25',
  },
  sync: {
    label: 'Sync',
    icon: RefreshCw,
    tone: 'text-sky-300 bg-sky-500/10',
    border: 'border-sky-500/25',
  },
}

const filters: LogFilter[] = ['all', 'sync', 'success', 'warning', 'error', 'info']

const formatTimestamp = (timestamp: number) => {
  const d = new Date(timestamp)
  return d.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

const formatAge = (ageMs: number | null | undefined) => {
  if (!Number.isFinite(ageMs)) return 'unbekannt'
  if (ageMs! < 1000) return `${Math.round(ageMs!)} ms`
  return `${Math.round(ageMs! / 1000)} s`
}

const shortenPath = (value?: string) => {
  if (!value) return 'keine Datei'
  const parts = value.split(/[\\/]/).filter(Boolean)
  return parts.slice(-3).join('/')
}

const countByType = (logs: LogEntry[], type: LogEntry['type']) => logs.filter((log) => log.type === type).length

export const McpActivityLog = ({
  logs = [],
  mcpStatus,
  mcpMetrics,
  storageMode = 'loading',
  syncError,
  onClear,
}: McpActivityLogProps) => {
  const [activeFilter, setActiveFilter] = useState<LogFilter>('all')
  const [isExpanded, setIsExpanded] = useState(false)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  const isConnected = Boolean(mcpStatus?.connected)
  const filteredLogs = useMemo(
    () => (activeFilter === 'all' ? logs : logs.filter((log) => log.type === activeFilter)),
    [activeFilter, logs],
  )

  const lastEvent = logs.at(-1)
  const errorCount = countByType(logs, 'error')
  const warningCount = countByType(logs, 'warning')
  const metricCalls = (mcpMetrics?.calls ?? []).slice().reverse()
  const recentMetricCalls = isExpanded ? metricCalls : metricCalls.slice(0, 5)

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [filteredLogs])

  const panel = (
    <div className={`flex flex-col overflow-hidden rounded-lg border border-border bg-slate-950 shadow-inner ${
      isExpanded
        ? 'fixed inset-6 z-50 text-xs shadow-2xl'
        : 'h-[28rem] min-h-[28rem] text-[12px]'
    }`}>
      <div className={`border-b border-border/40 bg-slate-900/80 ${isExpanded ? 'px-5 py-4' : 'px-3 py-2.5'}`}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <PlugZap size={14} className={isConnected ? 'text-emerald-300' : 'text-amber-300'} />
            <div className="min-w-0">
              <div className={`${isExpanded ? 'text-base' : 'text-sm'} truncate font-semibold text-slate-100`}>MCP Activity</div>
              <div className="truncate text-[11px] text-slate-500">
                {storageMode === 'api' ? 'Offline API aktiv' : storageMode === 'local' ? 'Lokaler Browser-Speicher' : 'Initialisierung'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded((value) => !value)}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
              title={isExpanded ? 'Log verkleinern' : 'Log vergroessern'}
              type="button"
            >
              {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              onClick={onClear}
              className="flex h-7 w-7 items-center justify-center rounded text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
              title="Log loschen"
              type="button"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        <div className={`grid gap-1.5 ${isExpanded ? 'grid-cols-6' : 'grid-cols-3'}`}>
          <div className="rounded border border-border/40 bg-slate-950/80 px-2 py-1">
            <div className="flex items-center gap-1 text-slate-500">
              <Circle size={8} className={isConnected ? 'fill-emerald-400 text-emerald-400' : 'fill-amber-400 text-amber-400'} />
              <span>Status</span>
            </div>
            <div className="mt-0.5 truncate font-semibold text-slate-200">
              {isConnected ? 'Online' : 'Offline'}
            </div>
          </div>
          <div className="rounded border border-border/40 bg-slate-950/80 px-2 py-1">
            <div className="text-slate-500">PID</div>
            <div className="mt-0.5 truncate font-semibold text-slate-200">{mcpStatus?.pid ?? '-'}</div>
          </div>
          <div className="rounded border border-border/40 bg-slate-950/80 px-2 py-1">
            <div className="text-slate-500">Heartbeat</div>
            <div className="mt-0.5 truncate font-semibold text-slate-200">{formatAge(mcpStatus?.ageMs)}</div>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1 rounded border border-border/30 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-500">
          <Database size={11} className="shrink-0 text-slate-400" />
          <span className="truncate" title={mcpStatus?.dataFile}>
            {shortenPath(mcpStatus?.dataFile)}
          </span>
        </div>

        <div className={`mt-2 grid gap-1.5 ${isExpanded ? 'grid-cols-6' : 'grid-cols-3'}`}>
          <div className="rounded border border-sky-500/20 bg-sky-500/10 px-2 py-1">
            <div className="flex items-center gap-1 text-sky-300">
              <Gauge size={10} />
              <span>Tokens</span>
            </div>
            <div className="mt-0.5 truncate font-semibold text-slate-100">
              {mcpMetrics?.totals.totalTokens ?? 0}
            </div>
          </div>
          <div className="rounded border border-border/40 bg-slate-950/80 px-2 py-1">
            <div className="text-slate-500">Calls</div>
            <div className="mt-0.5 truncate font-semibold text-slate-200">{mcpMetrics?.totals.calls ?? 0}</div>
          </div>
          <div className="rounded border border-border/40 bg-slate-950/80 px-2 py-1">
            <div className="text-slate-500">Output</div>
            <div className="mt-0.5 truncate font-semibold text-slate-200">{mcpMetrics?.totals.outputTokens ?? 0}</div>
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-1 border-b border-border/30 bg-slate-950 ${isExpanded ? 'px-4 py-2' : 'px-2 py-1.5'}`}>
        <ListFilter size={12} className="text-slate-500" />
        {filters.map((filter) => {
          const isActive = filter === activeFilter
          const label = filter === 'all' ? 'Alle' : typeStyles[filter].label
          const count = filter === 'all' ? logs.length : countByType(logs, filter)
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`h-6 rounded px-2 text-[10px] transition-colors ${
                isActive ? 'bg-slate-800 text-slate-100' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'
              }`}
              title={`${label}: ${count}`}
            >
              {label} {count}
            </button>
          )
        })}
      </div>

      <div className={`flex-1 space-y-2 overflow-y-auto custom-scrollbar text-left ${isExpanded ? 'p-4' : 'p-2.5'}`}>
        {recentMetricCalls.length > 0 && activeFilter === 'all' ? (
          <div className="rounded border border-sky-500/20 bg-sky-500/5 p-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-sky-200">
                <Gauge size={12} />
                <span>Toolkosten geschaetzt</span>
              </div>
              <span className="text-[10px] text-slate-500">chars / 4</span>
            </div>
            {isExpanded ? (
              <div className="overflow-x-auto rounded border border-slate-800/80">
                <table className="w-full min-w-[56rem] border-collapse text-left font-mono text-[11px]">
                  <thead className="sticky top-0 bg-slate-950 text-slate-500">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Zeit</th>
                      <th className="px-2 py-1.5 font-medium">Tool</th>
                      <th className="px-2 py-1.5 text-right font-medium">Input tok</th>
                      <th className="px-2 py-1.5 text-right font-medium">Output tok</th>
                      <th className="px-2 py-1.5 text-right font-medium">Total tok</th>
                      <th className="px-2 py-1.5 text-right font-medium">Req chars</th>
                      <th className="px-2 py-1.5 text-right font-medium">Res chars</th>
                      <th className="px-2 py-1.5 text-right font-medium">Dauer</th>
                      <th className="px-2 py-1.5 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMetricCalls.map((call) => (
                      <tr key={call.id} className="border-t border-slate-800/80 text-slate-300">
                        <td className="whitespace-nowrap px-2 py-1.5 text-slate-500">{formatTimestamp(call.timestamp)}</td>
                        <td className="max-w-[15rem] truncate px-2 py-1.5 text-slate-100" title={call.tool}>{call.tool}</td>
                        <td className="px-2 py-1.5 text-right text-sky-200">{call.inputTokens}</td>
                        <td className="px-2 py-1.5 text-right text-sky-200">{call.outputTokens}</td>
                        <td className="px-2 py-1.5 text-right font-semibold text-emerald-300">{call.totalTokens}</td>
                        <td className="px-2 py-1.5 text-right text-slate-400">{call.requestChars}</td>
                        <td className="px-2 py-1.5 text-right text-slate-400">{call.responseChars}</td>
                        <td className="px-2 py-1.5 text-right text-slate-400">{call.durationMs}ms</td>
                        <td className={call.success ? 'px-2 py-1.5 text-emerald-300' : 'px-2 py-1.5 text-rose-300'}>
                          {call.success ? 'ok' : call.errorMessage ?? 'error'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-1">
                {recentMetricCalls.map((call) => (
                  <div key={call.id} className="grid grid-cols-[1fr_auto] gap-2 rounded bg-slate-950/60 px-2 py-1">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-[10px] text-slate-200">{call.tool}</div>
                      <div className="text-[10px] text-slate-500">
                        in {call.inputTokens} · out {call.outputTokens} · {call.requestChars}/{call.responseChars} chars · {call.durationMs}ms
                      </div>
                    </div>
                    <div className={`self-center rounded px-1.5 py-0.5 font-mono text-[10px] ${
                      call.success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                    }`}>
                      {call.totalTokens}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {filteredLogs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-500">
            <Activity size={22} className="text-slate-600" />
            <span>Keine Eintrage fur diesen Filter.</span>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const style = typeStyles[log.type]
            const Icon = style.icon
            return (
              <div key={log.id} className={`rounded border ${style.border} bg-slate-900/55 p-2 transition-colors hover:bg-slate-900`}>
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${style.tone}`}>
                      <Icon size={12} />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-200">{log.title ?? log.message}</div>
                      {log.title && <div className="mt-0.5 text-slate-400">{log.message}</div>}
                    </div>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">{formatTimestamp(log.timestamp)}</span>
                </div>

                {log.details?.length ? (
                  <div className="mt-1 space-y-0.5 border-l border-slate-700/60 pl-2 text-[10px] text-slate-400">
                    {log.details.map((detail, index) => (
                      <div key={`${log.id}-detail-${index}`} className="leading-relaxed">{detail}</div>
                    ))}
                  </div>
                ) : null}

                {log.meta && Object.keys(log.meta).length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(log.meta).map(([key, value]) => (
                      <span key={key} className="rounded border border-slate-700/60 bg-slate-950/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                        {key}: {String(value ?? '-')}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })
        )}
        <div ref={terminalEndRef} />
      </div>

      <div className="flex items-center justify-between border-t border-border/20 bg-slate-900/50 px-3 py-1 text-[10px] text-slate-500">
        <span>{syncError ? 'Sync-Fehler aktiv' : 'Sync stabil'}</span>
        <span>
          {logs.length} Events · {mcpMetrics?.totals.totalTokens ?? 0} Token · {warningCount} Warnungen · {errorCount} Fehler
        </span>
        <span className="max-w-[6rem] truncate">{lastEvent ? formatTimestamp(lastEvent.timestamp) : '-'}</span>
      </div>
    </div>
  )

  return isExpanded && typeof document !== 'undefined' ? createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm" onClick={() => setIsExpanded(false)} />
      {panel}
    </>,
    document.body,
  ) : panel
}
