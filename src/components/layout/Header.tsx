import { Download, Layout, Moon, Sun, Upload } from 'lucide-react'
import type { Board, McpStatus, StorageMode, ApiState } from '../../types'
import { Button } from '../ui/Button'

type HeaderProps = {
  storageMode: StorageMode
  syncError: string | null
  mcpStatus: McpStatus | null
  darkMode: boolean
  boards: Board[]
  onToggleTheme: () => void
  onExport: () => void
  onImport: (boards: Board[]) => void
}

export const Header = ({
  storageMode,
  syncError,
  mcpStatus,
  darkMode,
  boards: _boards,
  onToggleTheme,
  onExport,
  onImport,
}: HeaderProps) => {
  const storageLabel = storageMode === 'api' 
    ? 'API verbunden' 
    : storageMode === 'local' 
      ? 'Lokaler Speicher' 
      : 'Laden...'

  return (
    <header className="mb-6 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between glass-panel rounded-2xl p-4 shadow-glass-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
          <Layout size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground font-display">
            Kanban<span className="text-primary">Board</span>
          </h1>
          <p className="text-xs font-medium text-muted-foreground">
            {storageLabel}
            {syncError ? ` · ${syncError}` : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* MCP Status Badge */}
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
            mcpStatus?.connected
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-border bg-secondary/60 text-muted-foreground'
          }`}
          title={
            mcpStatus?.connected
              ? `MCP PID ${mcpStatus.pid ?? 'unbekannt'}`
              : 'MCP ist nicht verbunden'
          }
        >
          <span
            className={`status-dot ${
              mcpStatus?.connected ? 'status-dot-active' : 'status-dot-inactive'
            }`}
          />
          <span className="terminal-text">
            MCP {mcpStatus?.connected ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Theme Toggle */}
        <Button variant="ghost" onClick={onToggleTheme} title={darkMode ? 'Helles Design' : 'Dunkles Design'}>
          {darkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
        </Button>

        <div className="h-8 w-px bg-border mx-1" />

        {/* Export */}
        <Button variant="secondary" onClick={onExport}>
          <Download size={16} /> Export
        </Button>

        {/* Import */}
        <label className="cursor-pointer">
          <input
            type="file"
            className="hidden"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = (ev) => {
                try {
                  const parsed = JSON.parse(String(ev.target?.result)) as Board[] | ApiState
                  const importedBoards = Array.isArray(parsed) ? parsed : parsed.boards
                  if (!Array.isArray(importedBoards)) throw new Error('Fehlendes boards Array')
                  onImport(importedBoards)
                } catch (error) {
                  console.error('Ungültige JSON-Datei', error)
                }
              }
              reader.readAsText(file)
            }}
          />
          <div className="px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2 select-none rounded-lg active:scale-95 bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border shadow-sm cursor-pointer">
            <Upload size={16} /> Import
          </div>
        </label>
      </div>
    </header>
  )
}
