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
    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar select-none text-left">
      {boards.map((board, index) => {
        const isActive = activeBoardId === board.id
        return (
          <div
            key={board.id}
            onClick={() => setActiveBoardId(board.id)}
            className={`group relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-700 hover:duration-150 cursor-pointer overflow-hidden ${
              isActive
                ? 'bg-card text-foreground border border-primary/30 shadow-[0_4px_20px_rgba(0,0,0,0.15)] glow-shadow-primary'
                : 'bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground border border-border/30'
            }`}
          >
            {/* Monospace index indicator */}
            <span className="font-mono text-[10px] text-muted-foreground/60 group-hover:text-primary/70 transition-colors">
              {(index + 1).toString().padStart(2, '0')}
            </span>
            
            <span className="font-semibold tracking-tight">{board.title}</span>

            {/* Glowing neon bottom bar for active tab */}
            {isActive && (
              <span className="absolute bottom-0 left-3 right-3 h-[2.5px] rounded-t bg-gradient-to-r from-primary via-blue-400 to-primary shadow-[0_1px_8px_hsl(var(--primary))]" />
            )}

            {/* Edit / Delete actions */}
            <div
              className={`flex items-center gap-1.5 ml-1 transition-all duration-200 ${
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
                className="rounded-md p-1 text-muted-foreground/70 transition-all hover:bg-secondary hover:text-foreground"
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
                className="rounded-md p-1 text-muted-foreground/70 transition-all hover:bg-destructive/10 hover:text-destructive"
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
        className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-background/30 px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:border-primary hover:bg-background/50 hover:text-primary active:scale-95"
      >
        <Plus size={16} /> Projekt hinzufügen
      </button>
    </div>
  )
}

