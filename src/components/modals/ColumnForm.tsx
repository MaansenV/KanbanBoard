import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Column, CategoryKey } from '../../types'
import { CATEGORY_LABELS } from '../../types'
import { Button } from '../ui/Button'
import { InputGroup } from '../ui/InputGroup'
import { Modal } from '../ui/Modal'

type ColumnFormProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { title: string; color: string; category: CategoryKey }) => void
  mode: 'create' | 'edit'
  initialData?: Column
  darkMode?: boolean
}

const COLOR_OPTIONS = [
  { label: 'Grau', value: 'bg-slate-500' },
  { label: 'Blau', value: 'bg-blue-500' },
  { label: 'Grün', value: 'bg-emerald-500' },
  { label: 'Orange', value: 'bg-orange-500' },
  { label: 'Rot', value: 'bg-rose-500' },
  { label: 'Lila', value: 'bg-purple-500' },
  { label: 'Gelb', value: 'bg-amber-500' },
  { label: 'Indigo', value: 'bg-indigo-500' },
]

export const ColumnForm = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
}: ColumnFormProps) => {
  const [title, setTitle] = useState('')
  const [color, setColor] = useState(COLOR_OPTIONS[0].value)
  const [category, setCategory] = useState<CategoryKey>('none')

  useEffect(() => {
    if (isOpen) {
      setTitle(initialData?.title ?? '')
      setColor(initialData?.color ?? COLOR_OPTIONS[0].value)
      setCategory(initialData?.category ?? 'none')
    }
  }, [isOpen, initialData])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    onSubmit({ title, color, category })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Spalte bearbeiten' : 'Neue Spalte hinzufügen'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <InputGroup
          label="Spaltentitel"
          value={title}
          onChange={setTitle}
          placeholder="z.B. Testen"
        />

        {/* Color Indicator Selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Farbindikator
          </label>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setColor(opt.value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-[10px] font-semibold transition-all ${
                  color === opt.value
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                    : 'border-border bg-background/50 hover:bg-accent text-muted-foreground'
                }`}
              >
                <span className={`h-4.5 w-4.5 rounded-full ${opt.value} border border-black/10`} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category Key Selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-muted-foreground">
            Spaltenkategorie
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryKey)}
            className="w-full rounded-lg border border-input bg-background/50 p-3 text-sm text-foreground transition-all focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key} className="bg-background text-foreground">
                {label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-muted-foreground leading-normal">
            Kategorien helfen bei automatischen Berechnungen und Statuswechseln (z.B. Fertigstellungsdatum).
          </p>
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit">
            {mode === 'edit' ? 'Speichern' : 'Erstellen'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
