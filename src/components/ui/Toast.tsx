import { X } from 'lucide-react'
import type { DeletedTaskSnapshot } from '../../types'

type ToastProps = {
  deletedTask: DeletedTaskSnapshot
  onUndo: () => void
  onDismiss: () => void
}

export const UndoToast = ({ deletedTask, onUndo, onDismiss }: ToastProps) => (
  <div className="fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl animate-slide-up">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold">Aufgabe gelöscht</p>
      <p className="truncate text-xs text-muted-foreground">
        {deletedTask.card.title}
      </p>
    </div>
    <button
      type="button"
      onClick={onUndo}
      className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
    >
      Rückgängig
    </button>
    <button
      type="button"
      onClick={onDismiss}
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      aria-label="Schließen"
    >
      <X size={16} />
    </button>
  </div>
)
