import type { McpStatus } from '../../types'

type McpStatusBadgeProps = {
  status: McpStatus | null
}

export const McpStatusBadge = ({ status }: McpStatusBadgeProps) => {
  const isConnected = status?.connected ?? false
  const pid = status?.pid

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold font-mono transition-all duration-300 ${
        isConnected
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'border-border bg-secondary/60 text-muted-foreground'
      }`}
      title={isConnected ? `MCP Prozess-ID (PID): ${pid ?? 'Unbekannt'}` : 'Kanban MCP Server ist nicht verbunden'}
    >
      <span
        className={`h-2 w-2 rounded-full transition-all duration-300 ${
          isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-muted-foreground/50'
        }`}
      />
      <span>
        MCP: {isConnected ? 'Verbunden' : 'Offline'}
      </span>
      {isConnected && pid && (
        <span className="opacity-60 text-[10px] bg-emerald-500/20 px-1 rounded">
          PID: {pid}
        </span>
      )}
    </div>
  )
}
