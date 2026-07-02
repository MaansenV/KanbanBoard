import { useState } from 'react'
import { ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react'
import type { Board } from '../../types'
import { ProjectStatistics } from '../stats/ProjectStatistics'

type SidebarProps = {
  board: Board | null
  deletedCount: number
  lastActivity: number
  className?: string
}

export const Sidebar = ({
  board,
  deletedCount,
  lastActivity,
  className = '',
}: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div
      className={`relative flex h-full flex-col border-r border-border bg-card/40 backdrop-blur-md transition-all duration-500 ease-in-out ${
        isCollapsed ? 'w-16' : 'w-96'
      } ${className}`}
    >
      {/* Collapse/Expand Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:text-foreground"
        title={isCollapsed ? 'Sidebar ausklappen' : 'Sidebar einklappen'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {isCollapsed ? (
        // Collapsed View
        <div className="flex h-full flex-col items-center gap-6 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary" title="Statistiken">
            <BarChart3 size={20} />
          </div>
        </div>
      ) : (
        // Expanded View
        <div className="flex h-full flex-col overflow-hidden p-4">
          <div className="min-h-0 flex-1">
            <ProjectStatistics
              board={board}
              deletedCount={deletedCount}
              lastActivity={lastActivity}
            />
          </div>
        </div>
      )}
    </div>
  )
}
