import { X, RotateCcw } from 'lucide-react'
import type { DeletedTaskSnapshot } from '../../types'

type ToastProps = {
  deletedTask: DeletedTaskSnapshot
  onUndo: () => void
  onDismiss: () => void
}

export const UndoToast = ({ deletedTask, onUndo, onDismiss }: ToastProps) => (
  <div className="fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-float animate-slide-up">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
      <RotateCcw size={16} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-foreground">Aufgabe gelöscht</p>
      <p className="truncate text-xs text-muted-foreground">
        {deletedTask.card.title}
      </p>
    </div>
    <button
      type="button"
      onClick={onUndo}
      className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 hover:shadow-glow-sm active:scale-95"
    >
      Rückgängig
    </button>
    <button
      type="button"
      onClick={onDismiss}
      className="btn-icon"
      aria-label="Schließen"
    >
      <X size={16} />
    </button>
  </div>
)
