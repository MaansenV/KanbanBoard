import { Edit2, Plus, Trash2 } from 'lucide-react'
import type { Board } from '../../types'

type BoardTabsProps = {
  boards: Board[]
  activeBoardId: string | null
  setActiveBoardId: (id: string) => void
  onEditBoard: (board: Board) => void
  onDeleteBoard: (boardId: string) => void
  onAddBoard: () => void
}

export const BoardTabs = ({
  boards,
  activeBoardId,
  setActiveBoardId,
  onEditBoard,
  onDeleteBoard,
  onAddBoard,
}: BoardTabsProps) => {
  return (
    <div className="custom-scrollbar mb-1 flex select-none gap-2 overflow-x-auto pb-2 text-left">
      {boards.map((board, index) => {
        const isActive = activeBoardId === board.id
        return (
          <div
            key={board.id}
            onClick={() => setActiveBoardId(board.id)}
            className={`group relative flex cursor-pointer items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              isActive
                ? 'border border-primary/25 bg-card text-foreground shadow-float dark:border-primary/40 dark:bg-primary/5'
                : 'border border-border/40 bg-secondary/60 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground'
            }`}
          >
            {/* Monospace index indicator */}
            <span className="font-mono text-[10px] text-muted-foreground/60 transition-colors group-hover:text-primary/70">
              {(index + 1).toString().padStart(2, '0')}
            </span>

            <span className="truncate font-semibold tracking-tight">{board.title}</span>

            {/* Premium active underline */}
            {isActive && (
              <span className="tab-glow-underline absolute -bottom-px left-3 right-3" />
            )}

            {/* Edit / Delete actions */}
            <div
              className={`ml-1 flex items-center gap-1 transition-opacity duration-200 ${
                isActive
                  ? 'opacity-0 group-hover:opacity-100'
                  : 'opacity-0'
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onEditBoard(board)
                }}
                className="rounded-md p-1 text-muted-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
                title="Projekt umbenennen"
              >
                <Edit2 size={12} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteBoard(board.id)
                }}
                className="rounded-md p-1 text-muted-foreground/80 transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Projekt löschen"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={onAddBoard}
        className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card/40 px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all duration-200 hover:border-primary/50 hover:bg-accent hover:text-primary active:scale-95"
      >
        <Plus size={16} /> Projekt hinzufügen
      </button>
    </div>
  )
}
