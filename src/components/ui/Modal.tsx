import { X } from 'lucide-react'
import type { ReactNode } from 'react'

type ModalProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  if (!isOpen) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl surface-card p-6 animate-scale-in shadow-panel"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
