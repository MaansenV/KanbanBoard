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
      <div className="glass-panel flex h-full flex-col items-center justify-center gap-4 rounded-2xl p-4 text-center">
        <BarChart3 className="animate-pulse text-muted-foreground" size={32} />
        <p className="text-sm font-medium text-muted-foreground">
          Wähle ein Projekt aus, um Statistiken anzuzeigen.
        </p>
      </div>
    )
  }

  return (
    <div className="glass-panel flex h-full select-none flex-col gap-4 overflow-y-auto rounded-2xl p-4 text-left custom-scrollbar">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/40 pb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BarChart3 size={18} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Projekt-Statistiken</h2>
          <p className="font-mono text-[10px] text-muted-foreground">{board.title}</p>
        </div>
      </div>

      {/* Sprint-Fortschritt */}
      <div className="space-y-2 rounded-xl border border-border/30 bg-secondary/30 p-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground">Sprint-Fortschritt</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400">{stats.sprintProgress}%</span>
        </div>
        <div className="progress-track">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${stats.sprintProgress}%` }}
          />
        </div>
        <p className="text-right font-mono text-[10px] text-muted-foreground">
          {stats.doneCards} von {stats.totalCards} Aufgaben erledigt
        </p>
      </div>

      {/* Prioritäten Verteilung */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Aktive Aufgaben nach Priorität</h3>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(PRIORITIES) as PriorityKey[]).map((key) => {
            const config = PRIORITIES[key]
            const count = stats.priorityCounts[key]
            return (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/30 p-2 transition-colors hover:bg-secondary/50"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-xs font-medium">{config.label}</span>
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
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Aufgabenverteilung (Spalten)</h3>
        <div className="space-y-2.5">
          {stats.columnDistribution.map((col) => {
            const pct = Math.round((col.count / stats.maxColumnCards) * 100)
            return (
              <div key={col.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="max-w-[150px] truncate font-medium">{col.title}</span>
                  <span className="font-mono font-bold text-muted-foreground">{col.count}</span>
                </div>
                <div className="relative h-4 w-full overflow-hidden rounded-md border border-border/20 bg-card">
                  <div
                    className={`h-full ${col.color.includes('bg-') ? col.color : 'bg-primary'} opacity-80 transition-all duration-500 ease-out`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Metadaten */}
      <div className="mt-auto space-y-2 border-t border-border/40 pt-3 font-mono text-[10px] text-muted-foreground">
        <div className="flex justify-between">
          <span>Startdatum:</span>
          <span className="text-foreground">{stats.startDate}</span>
        </div>
        <div className="flex justify-between">
          <span>Aktivität:</span>
          <span className="flex items-center gap-1 text-foreground">
            <Flame size={10} className="animate-pulse text-orange-500" /> {timeAgo}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Gelöschte Tasks:</span>
          <span className="text-destructive">{deletedCount}</span>
        </div>
      </div>
    </div>
  )
}
