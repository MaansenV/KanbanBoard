import { useState } from 'react'
import { ChevronLeft, ChevronRight, BarChart3, Terminal } from 'lucide-react'
import type { Board } from '../../types'
import { ProjectStatistics } from '../stats/ProjectStatistics'
import { McpActivityLog } from '../mcp/McpActivityLog'
import type { LogEntry } from '../mcp/McpActivityLog'

type SidebarProps = {
  board: Board | null
  deletedCount: number
  lastActivity: number
  logs?: LogEntry[]
  onClearLogs?: () => void
  className?: string
}

export const Sidebar = ({
  board,
  deletedCount,
  lastActivity,
  logs,
  onClearLogs,
  className = '',
}: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div
      className={`relative h-full flex flex-col transition-all duration-700 ease-in-out border-r border-border bg-background/40 backdrop-blur-md ${
        isCollapsed ? 'w-16' : 'w-80'
      } ${className}`}
    >
      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground shadow-md transition-colors"
        title={isCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {isCollapsed ? (
        // Collapsed View
        <div className="flex flex-col items-center gap-6 py-6 h-full">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary" title="Statistiken">
            <BarChart3 size={20} />
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-emerald-400 border border-border" title="MCP Logs">
            <Terminal size={18} />
          </div>
        </div>
      ) : (
        // Expanded View
        <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
          {/* Top Section - Project Statistics */}
          <div className="flex-1 min-h-0">
            <ProjectStatistics
              board={board}
              deletedCount={deletedCount}
              lastActivity={lastActivity}
            />
          </div>

          {/* Bottom Section - MCP Activity Log */}
          <div className="shrink-0">
            <McpActivityLog logs={logs} onClear={onClearLogs} />
          </div>
        </div>
      )}
    </div>
  )
}
