import { AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

type DeleteConfirmProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  type: 'board' | 'column' | 'card'
  itemName: string
}

export const DeleteConfirm = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  itemName,
}: DeleteConfirmProps) => {
  const typeLabels: Record<string, string> = {
    board: 'Projekt',
    column: 'Spalte',
    card: 'Aufgabe',
  }

  const label = typeLabels[type] || 'Element'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${label} löschen?`}
    >
      <div className="space-y-4 text-left select-none">
        {/* Warning Icon & Warning Message */}
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
          <AlertTriangle className="shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-sm">Warnung vor irreversiblem Datenverlust</h4>
            <p className="text-xs mt-1 leading-normal opacity-90">
              Du bist im Begriff, dieses Element dauerhaft zu löschen. Alle damit verbundenen Daten gehen unwiderruflich verloren.
            </p>
          </div>
        </div>

        {/* Target Details Box */}
        <div className="rounded-lg border border-border bg-secondary/35 p-3 font-mono text-xs">
          <div className="text-muted-foreground uppercase text-[10px] tracking-wider mb-1 font-bold">Löschobjekt Details</div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Typ:</span>
            <span className="font-semibold text-foreground">{label}</span>
          </div>
          <div className="flex justify-between gap-2 mt-1">
            <span className="text-muted-foreground">Name:</span>
            <span className="font-semibold text-foreground truncate max-w-[200px]" title={itemName}>
              {itemName}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={onConfirm} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            Löschen bestätigen
          </Button>
        </div>
      </div>
    </Modal>
  )
}
