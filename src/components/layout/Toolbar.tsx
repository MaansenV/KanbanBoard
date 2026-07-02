import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { CardSortMode, CategoryFilter, PriorityFilter } from '../../types'
import { CATEGORY_LABELS, PRIORITIES, SORT_LABELS } from '../../types'
import { CustomDropdown } from '../ui/CustomDropdown'

type ToolbarProps = {
  searchQuery: string
  onSearchChange: (query: string) => void
  priorityFilter: PriorityFilter
  onPriorityChange: (filter: PriorityFilter) => void
  categoryFilter: CategoryFilter
  onCategoryChange: (filter: CategoryFilter) => void
  sortMode: CardSortMode
  onSortChange: (mode: CardSortMode) => void
  visibleCount: number
  totalCount: number
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export const Toolbar = ({
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  categoryFilter,
  onCategoryChange,
  sortMode,
  onSortChange,
  visibleCount,
  totalCount,
  hasActiveFilters,
  onClearFilters,
}: ToolbarProps) => {
  // Map priorities to options for CustomDropdown
  const priorityOptions = [
    { value: 'all', label: 'Alle Prioritäten' },
    ...Object.entries(PRIORITIES).map(([key, config]) => ({
      value: key,
      label: config.label,
      icon: config.icon,
    })),
  ]

  // Map categories to options for CustomDropdown
  const categoryOptions = [
    { value: 'all', label: 'Alle Spalten' },
    ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({
      value: key,
      label: label,
      colorDot:
        key === 'todo'
          ? 'bg-sky-500'
          : key === 'doing'
            ? 'bg-amber-500'
            : key === 'review'
              ? 'bg-indigo-500'
              : key === 'done'
                ? 'bg-emerald-500'
                : key === 'bugs'
                  ? 'bg-rose-500'
                  : 'bg-slate-500',
    })),
  ]

  // Map sorting mode to options for CustomDropdown
  const sortOptions = Object.entries(SORT_LABELS).map(([key, label]) => ({
    value: key,
    label: label,
  }))

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-border/50 bg-card/60 p-3 shadow-surface backdrop-blur-sm sm:flex-row sm:items-center transition-colors duration-300">
      <div className="relative min-w-[220px] flex-1">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Aufgaben suchen..."
          className="form-input h-10 pl-9 pr-3"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-muted-foreground shadow-sm">
          <SlidersHorizontal size={15} />
          <span className="font-mono text-xs font-semibold">
            {visibleCount}/{totalCount}
          </span>
        </div>

        <CustomDropdown
          value={priorityFilter}
          onChange={(val) => onPriorityChange(val as PriorityFilter)}
          options={priorityOptions}
          ariaLabel="Nach Priorität filtern"
          className="w-48"
        />

        <CustomDropdown
          value={categoryFilter}
          onChange={(val) => onCategoryChange(val as CategoryFilter)}
          options={categoryOptions}
          ariaLabel="Nach Spaltentyp filtern"
          className="w-44"
        />

        <CustomDropdown
          value={sortMode}
          onChange={(val) => onSortChange(val as CardSortMode)}
          options={sortOptions}
          ariaLabel="Aufgaben sortieren"
          className="w-40"
        />

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-accent-foreground"
          >
            <X size={15} /> Zurücksetzen
          </button>
        )}
      </div>
    </div>
  )
}
