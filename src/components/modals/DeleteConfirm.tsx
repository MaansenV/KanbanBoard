import { AlertTriangle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

type DeleteConfirmProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  type: 'board' | 'column' | 'card' | 'columnCards'
  itemName: string
  cardCount?: number
}

export const DeleteConfirm = ({
  isOpen,
  onClose,
  onConfirm,
  type,
  itemName,
  cardCount,
}: DeleteConfirmProps) => {
  const typeLabels: Record<string, string> = {
    board: 'Projekt',
    column: 'Spalte',
    card: 'Aufgabe',
    columnCards: 'Spalteninhalt',
  }

  const label = typeLabels[type] || 'Element'
  const isBulkClear = type === 'columnCards'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isBulkClear ? 'Spalte leeren?' : `${label} löschen?`}
    >
      <div className="space-y-4 text-left select-none">
        {/* Warning Icon & Warning Message */}
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-destructive">
          <AlertTriangle className="mt-0.5 shrink-0" size={20} />
          <div>
            <h4 className="text-sm font-bold">Warnung vor irreversiblem Datenverlust</h4>
            <p className="mt-1 text-xs leading-normal opacity-90">
              {isBulkClear
                ? 'Du bist im Begriff, alle Aufgaben dieser Spalte dauerhaft zu löschen. Die Spalte selbst bleibt erhalten.'
                : 'Du bist im Begriff, dieses Element dauerhaft zu löschen. Alle damit verbundenen Daten gehen unwiderruflich verloren.'}
            </p>
          </div>
        </div>

        {/* Target Details Box */}
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 font-mono text-xs">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Löschobjekt Details</div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Typ:</span>
            <span className="font-semibold text-foreground">{label}</span>
          </div>
          <div className="mt-1 flex justify-between gap-2">
            <span className="text-muted-foreground">Name:</span>
            <span className="max-w-[200px] truncate font-semibold text-foreground" title={itemName}>
              {itemName}
            </span>
          </div>
          {isBulkClear && (
            <div className="mt-1 flex justify-between gap-2">
              <span className="text-muted-foreground">Anzahl Aufgaben:</span>
              <span className="font-semibold text-foreground">{cardCount ?? 0}</span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {isBulkClear ? 'Spalte leeren' : 'Löschen bestätigen'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
