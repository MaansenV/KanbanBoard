import {
    Activity,
    BarChart3,
    Bug,
    Flame,
    Layout,
    Zap
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type ProjectStatisticsProps = {
    board: {
        id: string
        title: string
        createdAt?: number
        columns: {
            id: string
            title: string
            category?: 'todo' | 'doing' | 'done' | 'bugs'
            cards: {
                id: string
                priority: string
                createdAt?: number
                completedAt?: number
            }[]
        }[]
    } | null
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
        const interval = setInterval(updateTime, 60000)
        return () => clearInterval(interval)
    }, [lastActivity])

    const stats = useMemo(() => {
        if (!board) return null

        const now = Date.now()
        const startDate = board.createdAt || now
        const daysActive = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)))

        let created = 0
        let done = 0
        let inProgress = 0
        let bugs = 0

        let totalResolutionTime = 0
        let resolvedCount = 0

        board.columns.forEach(col => {
            const isDone = col.category === 'done' || (!col.category && (col.title.toLowerCase().includes('done') || col.title.toLowerCase().includes('erledigt')))
            const isProgress = col.category === 'doing' || (!col.category && (col.title.toLowerCase().includes('progress') || col.title.toLowerCase().includes('bearbeitung')))
            const isBugs = col.category === 'bugs'

            created += col.cards.length
            if (isDone) done += col.cards.length
            if (isProgress) inProgress += col.cards.length

            col.cards.forEach(card => {
                if (isBugs || card.priority === 'critical') bugs++
                if (card.completedAt && card.createdAt) {
                    totalResolutionTime += (card.completedAt - card.createdAt)
                    resolvedCount++
                }
            })
        })

        // Mock/Derived calculations
        const sprintProgress = created > 0 ? Math.round((done / created) * 100) : 0
        const weeklyThroughput = Math.round(done / Math.max(1, daysActive / 7))

        const avgHours = resolvedCount > 0
            ? Math.round(totalResolutionTime / resolvedCount / (1000 * 60 * 60))
            : 0
        const avgResolutionTime = avgHours > 24
            ? `${Math.round(avgHours / 24)} Tage`
            : `${avgHours} Std.`

        return {
            startDate: new Date(startDate).toLocaleDateString('de-DE'),
            daysActive,
            created: created + deletedCount, // Total created includes deleted ones
            done,
            deleted: deletedCount,
            inProgress,
            bugs,
            sprintProgress,
            weeklyThroughput,
            avgResolutionTime
        }
    }, [board, deletedCount])

    if (!board || !stats) {
        return (
            <div className="w-80 shrink-0 flex flex-col gap-6 p-6 glass-panel rounded-2xl h-full">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <BarChart3 size={24} />
                    <h2 className="font-bold">Statistiken</h2>
                </div>
                <p className="text-sm text-muted-foreground">Wähle ein Board aus, um Statistiken zu sehen.</p>
            </div>
        )
    }

    return (
        <div className="w-80 shrink-0 flex flex-col gap-4 p-4 glass-panel rounded-2xl h-full overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <BarChart3 size={20} />
                </div>
                <h2 className="font-bold text-lg">Projekt-Statistiken</h2>
            </div>

            {/* Projektinfo */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Layout size={14} />
                    <h3>Projektinfo</h3>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Startdatum:</span>
                    <span className="font-medium font-mono">{stats.startDate}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Projektdauer:</span>
                    <span className="font-medium font-mono">{stats.daysActive} Tage</span>
                </div>
            </div>

            {/* Aufgaben-Metriken */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Activity size={14} />
                    <h3>Aufgaben-Metriken</h3>
                </div>
                <div className="space-y-2">
                    <MetricRow label="Erstellt" value={stats.created} />
                    <MetricRow label="Erledigt" value={stats.done} className="text-emerald-500" />
                    <MetricRow label="Gelöscht" value={stats.deleted} className="text-rose-500" />
                    <MetricRow label="In Bearbeitung" value={stats.inProgress} className="text-blue-500" />
                    <MetricRow label="Bugs" value={stats.bugs} className="text-orange-500" icon={<Bug size={12} />} />
                </div>
            </div>

            {/* Produktivität & Flow */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Zap size={14} />
                    <h3>Produktivität & Flow</h3>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Burndown:</span>
                    <span className="font-medium text-emerald-500">Im Zeitplan</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Wöchentl. Durchsatz:</span>
                    <span className="font-medium font-mono">{stats.weeklyThroughput} Tasks</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Ø Lösungszeit:</span>
                    <span className="font-medium font-mono">{stats.avgResolutionTime}</span>
                </div>
            </div>

            {/* Gimmicks */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                    <Flame size={14} />
                    <h3>Gimmicks</h3>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Letzte Aktivität:</span>
                    <span className="font-medium">{timeAgo}</span>
                </div>

                <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Sprint-Fortschritt</span>
                        <span>{stats.sprintProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-500 ease-out"
                            style={{ width: `${stats.sprintProgress}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

const MetricRow = ({ label, value, className = '', icon }: { label: string, value: number, className?: string, icon?: React.ReactNode }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="text-muted-foreground flex items-center gap-1">
            {icon} {label}:
        </span>
        <span className={`font-medium font-mono ${className}`}>{value}</span>
    </div>
)
