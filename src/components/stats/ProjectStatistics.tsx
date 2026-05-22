import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Flame } from 'lucide-react'
import type { Board, PriorityKey } from '../../types'
import { PRIORITIES } from '../../types'
import { Badge } from '../ui/Badge'

type ProjectStatisticsProps = {
  board: Board | null
  deletedCount: number
  lastActivity: number
}

export const ProjectStatistics = ({ board, deletedCount, lastActivity }: ProjectStatisticsProps) => {
  const [timeAgo, setTimeAgo] = useState('Gerade eben')

  useEffect(() => {
    const updateTime = () => {
      const seconds = Math.floor((Date.now() - lastActivity) / 1000)
      if (seconds < 60) setTimeAgo('Gerade eben')
      else if (seconds < 3600) setTimeAgo(`Vor ${Math.floor(seconds / 60)} Min.`)
      else if (seconds < 86400) setTimeAgo(`Vor ${Math.floor(seconds / 3600)} Std.`)
      else setTimeAgo(`Vor ${Math.floor(seconds / 86400)} Tagen`)
    }

    updateTime()
    const interval = setInterval(updateTime, 15000)
    return () => clearInterval(interval)
  }, [lastActivity])

  const stats = useMemo(() => {
    if (!board) return null

    const now = Date.now()
    const startDate = board.createdAt || now
    const daysActive = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)))

    let totalCards = 0
    let doneCards = 0
    let inProgressCards = 0

    const priorityCounts: Record<PriorityKey, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    }

    const columnDistribution: { id: string; title: string; count: number; color: string }[] = []

    board.columns.forEach((col) => {
      const count = col.cards.length
      totalCards += count
      columnDistribution.push({
        id: col.id,
        title: col.title,
        count,
        color: col.color || 'bg-slate-500',
      })

      const isDone = col.category === 'done' || col.title.toLowerCase().includes('done') || col.title.toLowerCase().includes('erledigt')
      const isProgress = col.category === 'doing' || col.title.toLowerCase().includes('progress') || col.title.toLowerCase().includes('bearbeitung')

      if (isDone) doneCards += count
      if (isProgress) inProgressCards += count

      col.cards.forEach((card) => {
        if (card.priority && priorityCounts[card.priority] !== undefined) {
          priorityCounts[card.priority]++
        }
      })
    })

    const sprintProgress = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0
    const maxColumnCards = Math.max(...columnDistribution.map((col) => col.count), 1)

    return {
      startDate: new Date(startDate).toLocaleDateString('de-DE'),
      daysActive,
      totalCards,
      doneCards,
      inProgressCards,
      priorityCounts,
      columnDistribution,
      sprintProgress,
      maxColumnCards,
    }
  }, [board])

  if (!board || !stats) {
    return (
      <div className="flex flex-col gap-4 p-4 glass-panel rounded-2xl h-full justify-center items-center text-center">
        <BarChart3 className="text-muted-foreground animate-pulse" size={32} />
        <p className="text-sm text-muted-foreground font-medium">
          Wähle ein Projekt aus, um Statistiken anzuzeigen.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4 glass-panel rounded-2xl h-full overflow-y-auto custom-scrollbar select-none text-left">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <BarChart3 size={18} />
        </div>
        <div>
          <h2 className="font-bold text-sm text-foreground">Projekt-Statistiken</h2>
          <p className="text-[10px] text-muted-foreground font-mono">{board.title}</p>
        </div>
      </div>

      {/* Sprint-Fortschritt */}
      <div className="space-y-2 bg-secondary/20 p-3 rounded-xl border border-border/30">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="text-muted-foreground">Sprint-Fortschritt</span>
          <span className="font-mono text-emerald-500">{stats.sprintProgress}%</span>
        </div>
        <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border/20">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${stats.sprintProgress}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground font-mono text-right">
          {stats.doneCards} von {stats.totalCards} Aufgaben erledigt
        </p>
      </div>

      {/* Prioritäten Verteilung */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aktive Aufgaben nach Priorität</h3>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PRIORITIES) as PriorityKey[]).map((key) => {
            const config = PRIORITIES[key]
            const count = stats.priorityCounts[key]
            return (
              <div
                key={key}
                className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/40 transition-colors hover:bg-secondary/50"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-medium truncate">{config.label}</span>
                </div>
                <Badge variant={key === 'critical' ? 'destructive' : key === 'high' ? 'warning' : key === 'medium' ? 'info' : 'success'} className="ml-2">
                  {count}
                </Badge>
              </div>
            )
          })}
        </div>
      </div>

      {/* Spalten Verteilung (CSS Bar Chart) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aufgabenverteilung (Spalten)</h3>
        <div className="space-y-2.5">
          {stats.columnDistribution.map((col) => {
            const pct = Math.round((col.count / stats.maxColumnCards) * 100)
            return (
              <div key={col.id} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium truncate max-w-[150px]">{col.title}</span>
                  <span className="font-mono text-muted-foreground font-bold">{col.count}</span>
                </div>
                <div className="h-4 w-full bg-background rounded-md overflow-hidden border border-border/20 relative">
                  <div
                    className={`h-full ${col.color.includes('bg-') ? col.color : 'bg-primary'} opacity-70 transition-all duration-500 ease-out`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Metadaten */}
      <div className="mt-2 pt-2 border-t border-border/40 space-y-2 text-[10px] text-muted-foreground font-mono">
        <div className="flex justify-between">
          <span>Startdatum:</span>
          <span className="text-foreground">{stats.startDate}</span>
        </div>
        <div className="flex justify-between">
          <span>Aktivität:</span>
          <span className="text-foreground flex items-center gap-1">
            <Flame size={10} className="text-orange-500 animate-pulse" /> {timeAgo}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Gelöschte Tasks:</span>
          <span className="text-rose-500">{deletedCount}</span>
        </div>
      </div>
    </div>
  )
}
