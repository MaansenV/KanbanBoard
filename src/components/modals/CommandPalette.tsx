import { useEffect, useRef, useState, useMemo } from 'react'
import { Search, Compass, Terminal, CheckSquare } from 'lucide-react'
import type { CommandPaletteAction } from '../../types'

type CommandPaletteProps = {
  isOpen: boolean
  onClose: () => void
  actions: CommandPaletteAction[]
}

export const CommandPalette = ({ isOpen, onClose, actions }: CommandPaletteProps) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter actions based on query
  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions
    return actions.filter(
      (act) =>
        act.label.toLowerCase().includes(q) ||
        act.description?.toLowerCase().includes(q) ||
        act.category.toLowerCase().includes(q)
    )
  }, [query, actions])

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      // Small timeout to ensure DOM is fully rendered
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredActions[selectedIndex]) {
          filteredActions[selectedIndex].action()
          onClose()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredActions, selectedIndex, onClose])

  // Scroll active item into view
  useEffect(() => {
    const listEl = listRef.current
    if (!listEl) return

    const activeEl = listEl.querySelector('[aria-selected="true"]') as HTMLElement
    if (!activeEl) return

    const listHeight = listEl.clientHeight
    const activeTop = activeEl.offsetTop
    const activeHeight = activeEl.clientHeight

    if (activeTop + activeHeight > listEl.scrollTop + listHeight) {
      listEl.scrollTop = activeTop + activeHeight - listHeight
    } else if (activeTop < listEl.scrollTop) {
      listEl.scrollTop = activeTop
    }
  }, [selectedIndex])

  if (!isOpen) return null

  // Categorize for rendering / visual grouping
  const getCategoryIcon = (category: CommandPaletteAction['category']) => {
    switch (category) {
      case 'board':
        return <Compass size={16} className="text-blue-400" />
      case 'task':
        return <CheckSquare size={16} className="text-emerald-400" />
      case 'aktion':
      default:
        return <Terminal size={16} className="text-purple-400" />
    }
  }

  const getCategoryLabel = (category: CommandPaletteAction['category']) => {
    switch (category) {
      case 'board':
        return 'Projekte'
      case 'task':
        return 'Aufgaben'
      case 'aktion':
      default:
        return 'Aktionen'
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-[15vh] transition-all animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl glass-panel animate-scale-in">
        {/* Search input container */}
        <div className="relative flex items-center border-b border-border/60 p-4">
          <Search size={18} className="absolute left-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent pl-8 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-0"
            placeholder="Suche nach Projekten, Aufgaben oder Aktionen..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto p-2 custom-scrollbar text-left"
        >
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Keine Ergebnisse für &bdquo;{query}&ldquo; gefunden.
            </div>
          ) : (
            filteredActions.map((act, index) => {
              const isSelected = index === selectedIndex
              return (
                <div
                  key={act.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    act.action()
                    onClose()
                  }}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10'
                      : 'hover:bg-accent/50 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}>
                      {act.icon || getCategoryIcon(act.category)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{act.label}</div>
                      {act.description && (
                        <div
                          className={`text-xs truncate ${
                            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}
                        >
                          {act.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category Pill */}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      isSelected
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {getCategoryLabel(act.category)}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex justify-between border-t border-border/50 bg-secondary/35 px-4 py-2 text-[10px] text-muted-foreground font-mono">
          <span>&uarr;&darr; zum Navigieren · Enter zum Ausführen</span>
          <span>Esc zum Schließen</span>
        </div>
      </div>
    </div>
  )
}
